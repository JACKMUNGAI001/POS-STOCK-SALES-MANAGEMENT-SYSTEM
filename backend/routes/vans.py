from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from math import ceil
from sqlalchemy import func, case
from extensions import db
from models.van import Van, VanStock, VanEmptyCylinderStock, VanTransfer, VanStockMovement
from models.product import Item, Category
from utils.timezone_utils import get_local_time
from models.user import User
from models.supplier import Supplier
from models.sale import Sale, SaleItem
from models.stock import SaleCylinderReturn
from models.customer import Customer
from services.sale_service import _normalize_customer_phone

bp = Blueprint("vans", __name__)

def _admin():
    identity = get_jwt_identity() or {}
    if identity.get("role") != "admin":
        return None, (jsonify({"msg": "admin only"}), 403)
    return identity, None

def _view(van):
    attendant = User.query.get(van.attendant_id) if van.attendant_id else None
    return {"id": van.id, "registration_number": van.registration_number,
            "attendant_id": van.attendant_id, "attendant_name": attendant.name if attendant else None}

@bp.get("/")
@jwt_required()
def list_vans():
    identity = get_jwt_identity() or {}
    query = Van.query.filter_by(tenant_id=identity.get("tenant_id"))
    if identity.get("role") == "attendant":
        query = query.filter_by(attendant_id=identity.get("id"))
    return jsonify([_view(v) for v in query.order_by(Van.registration_number).all()])

@bp.get("/mine")
@jwt_required()
def my_van():
    identity = get_jwt_identity() or {}
    if identity.get("role") != "attendant": return jsonify({"msg": "Attendant access required"}), 403
    van = Van.query.filter_by(tenant_id=identity.get("tenant_id"), attendant_id=identity.get("id")).first()
    return (jsonify(_view(van)), 200) if van else (jsonify({"msg": "No van assigned"}), 404)

@bp.get("/<int:van_id>/stock")
@jwt_required()
def van_stock(van_id):
    identity = get_jwt_identity() or {}
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van or identity.get("role") == "manager" or (identity.get("role") == "attendant" and van.attendant_id != identity.get("id")):
        return jsonify({"msg": "Van not found"}), 404
    rows = VanStock.query.filter_by(van_id=van.id).all()
    return jsonify([{"item_id": r.item_id, "item_name": Item.query.get(r.item_id).name,
                     "quantity": r.quantity, "buy_price": float(r.buy_price or 0)} for r in rows])

@bp.get("/<int:van_id>/empty-cylinders")
@jwt_required()
def van_empty_cylinders(van_id):
    identity = get_jwt_identity() or {}
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van or identity.get("role") == "manager" or (identity.get("role") == "attendant" and van.attendant_id != identity.get("id")):
        return jsonify({"msg": "Van not found"}), 404
    rows = VanEmptyCylinderStock.query.filter_by(van_id=van_id).filter(VanEmptyCylinderStock.quantity > 0).all()
    return jsonify([{"item_id": r.item_id, "item_name": Item.query.get(r.item_id).name, "quantity": r.quantity} for r in rows])

@bp.post("/<int:van_id>/empty-cylinders/collect")
@jwt_required()
def collect_van_empty_cylinders(van_id):
    identity = get_jwt_identity() or {}
    if identity.get("role") not in ("admin", "attendant"):
        return jsonify({"msg": "Only an administrator or assigned van attendant can record collections"}), 403
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van or (identity.get("role") == "attendant" and van.attendant_id != identity.get("id")):
        return jsonify({"msg": "Van not found"}), 404
    data = request.get_json() or {}
    name = str(data.get("customer_name") or "").strip()
    phone = str(data.get("customer_phone") or "").strip()
    try:
        item_id = int(data.get("item_id"))
        quantity = int(data.get("quantity"))
    except (TypeError, ValueError):
        return jsonify({"msg": "Choose a cylinder product and enter a positive whole quantity"}), 400
    if not name or not phone or quantity <= 0:
        return jsonify({"msg": "Customer name, phone, and a positive whole quantity are required"}), 400
    item = Item.query.get(item_id)
    category = Category.query.get(item.category_id) if item else None
    if not category or "gas" not in category.name.lower():
        return jsonify({"msg": "Only gas cylinder products can be collected"}), 400
    normalized_phone = _normalize_customer_phone(phone)
    if not normalized_phone:
        return jsonify({"msg": "Enter a valid customer phone number"}), 400
    customer = Customer.query.filter_by(tenant_id=van.tenant_id, normalized_phone=normalized_phone).first()
    if customer:
        customer.name, customer.phone = name, phone
    else:
        customer = Customer(tenant_id=van.tenant_id, name=name, phone=phone, normalized_phone=normalized_phone)
        db.session.add(customer)
        db.session.flush()
    empty = VanEmptyCylinderStock.query.filter_by(van_id=van.id, item_id=item_id).with_for_update().first()
    if not empty:
        empty = VanEmptyCylinderStock(tenant_id=van.tenant_id, van_id=van.id, item_id=item_id, quantity=0)
        db.session.add(empty)
    empty.quantity += quantity
    db.session.add(VanStockMovement(
        tenant_id=van.tenant_id, van_id=van.id, item_id=item_id,
        movement_type="customer_empty_collection", quantity=quantity, unit_cost=0,
        customer_id=customer.id, reference=f"Customer: {customer.name} ({customer.phone})", user_id=identity.get("id"),
    ))
    db.session.commit()
    return jsonify({"msg": "Customer empties recorded", "quantity": empty.quantity}), 201

@bp.post("/<int:van_id>/refills")
@jwt_required()
def load_refill(van_id):
    identity, error = _admin()
    if error: return error
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van: return jsonify({"msg": "Van not found"}), 404
    data = request.get_json() or {}
    try:
        item_id, qty = int(data.get("item_id")), int(data.get("quantity"))
        supplier_id = int(data.get("supplier_id"))
        cost = float(data.get("unit_cost") or 0)
        empty_qty = int(data.get("empty_quantity", 0) or 0)
        if qty <= 0 or cost < 0: raise ValueError()
        if empty_qty < 0: raise ValueError()
    except (TypeError, ValueError): return jsonify({"msg": "Choose a supplier and enter valid item, positive quantities, and nonnegative unit cost"}), 400
    supplier = Supplier.query.filter_by(id=supplier_id).filter(
        (Supplier.tenant_id == identity.get("tenant_id")) | (Supplier.tenant_id.is_(None))
    ).first()
    if not supplier: return jsonify({"msg": "Supplier not found for this business"}), 404
    item = Item.query.get(item_id)
    if not item: return jsonify({"msg": "Product not found"}), 404
    category = Category.query.get(item.category_id)
    if not category or "gas" not in category.name.lower():
        return jsonify({"msg": "Only gas cylinder products can be loaded onto vans"}), 400
    row = VanStock.query.filter_by(van_id=van.id, item_id=item_id).first()
    if not row:
        row = VanStock(tenant_id=van.tenant_id, van_id=van.id, item_id=item_id, quantity=0, buy_price=cost)
        db.session.add(row)
    prior = row.quantity
    empty = VanEmptyCylinderStock.query.filter_by(van_id=van.id, item_id=item_id).first()
    if empty_qty and (not empty or empty.quantity < empty_qty):
        return jsonify({"msg": "Van does not have enough returned empty cylinders for this refill"}), 400
    if empty_qty:
        empty.quantity -= empty_qty
    row.buy_price = ((prior * float(row.buy_price or 0)) + qty * cost) / (prior + qty) if prior + qty else cost
    row.quantity += qty
    row.updated_at = get_local_time()
    db.session.add(VanStockMovement(tenant_id=van.tenant_id, van_id=van.id, item_id=item_id,
                                    movement_type="depot_refill", quantity=qty, unit_cost=cost,
                                    supplier_id=supplier.id,
                                    reference=f"Empties returned to depot: {empty_qty}", user_id=identity.get("id")))
    db.session.commit()
    return jsonify({"msg": "Refill recorded", "quantity": row.quantity, "empty_quantity": empty.quantity if empty else 0}), 201

@bp.post("/transfers")
@jwt_required()
def transfer_van_stock():
    identity = get_jwt_identity() or {}
    if identity.get("role") not in ("admin", "manager"):
        return jsonify({"msg": "Admin or manager access required"}), 403
    data = request.get_json() or {}
    try:
        source_id, target_id = int(data.get("from_van_id")), int(data.get("to_van_id"))
        item_id, qty = int(data.get("item_id")), int(data.get("quantity"))
    except (TypeError, ValueError): return jsonify({"msg": "Source, destination, product and quantity are required"}), 400
    if source_id == target_id or qty <= 0: return jsonify({"msg": "Choose different vans and a positive quantity"}), 400
    source = Van.query.filter_by(id=source_id, tenant_id=identity.get("tenant_id")).first()
    target = Van.query.filter_by(id=target_id, tenant_id=identity.get("tenant_id")).first()
    if not source or not target: return jsonify({"msg": "Van not found"}), 404
    product = Item.query.filter_by(id=item_id, tenant_id=identity.get("tenant_id")).first()
    category = Category.query.filter_by(id=product.category_id, tenant_id=identity.get("tenant_id")).first() if product else None
    if not category or "gas" not in category.name.lower(): return jsonify({"msg": "Only gas cylinder products can be transferred"}), 400
    stock = VanStock.query.filter_by(van_id=source_id, item_id=item_id).with_for_update().first()
    if not stock or stock.quantity < qty: return jsonify({"msg": "Insufficient filled cylinders on source van"}), 400
    dest = VanStock.query.filter_by(van_id=target_id, item_id=item_id).with_for_update().first()
    if not dest:
        dest = VanStock(tenant_id=source.tenant_id, van_id=target_id, item_id=item_id, quantity=0, buy_price=stock.buy_price)
        db.session.add(dest)
    old_qty = dest.quantity
    dest.buy_price = ((old_qty * float(dest.buy_price or 0)) + qty * float(stock.buy_price or 0)) / (old_qty + qty)
    stock.quantity -= qty; dest.quantity += qty
    transfer = VanTransfer(tenant_id=source.tenant_id, from_van_id=source_id, to_van_id=target_id,
                           item_id=item_id, quantity=qty, created_by=identity.get("id"))
    db.session.add(transfer); db.session.flush()
    db.session.add_all([
        VanStockMovement(tenant_id=source.tenant_id, van_id=source_id, item_id=item_id, movement_type="transfer_out", quantity=-qty, unit_cost=stock.buy_price or 0, reference=f"Transfer {transfer.id} to {target.registration_number}", user_id=identity.get("id")),
        VanStockMovement(tenant_id=source.tenant_id, van_id=target_id, item_id=item_id, movement_type="transfer_in", quantity=qty, unit_cost=stock.buy_price or 0, reference=f"Transfer {transfer.id} from {source.registration_number}", user_id=identity.get("id")),
    ])
    db.session.commit()
    return jsonify({"msg": "Van transfer completed", "transfer_id": transfer.id}), 201

@bp.get("/transfers")
@jwt_required()
def list_van_transfers():
    identity = get_jwt_identity() or {}
    by_id = {v.id: v for v in Van.query.filter_by(tenant_id=identity.get("tenant_id")).all()}
    query = VanTransfer.query.filter_by(tenant_id=identity.get("tenant_id"))
    if identity.get("role") == "attendant":
        assigned = {v.id for v in by_id.values() if v.attendant_id == identity.get("id")}
        query = query.filter((VanTransfer.from_van_id.in_(assigned)) | (VanTransfer.to_van_id.in_(assigned))) if assigned else query.filter(VanTransfer.id == -1)
    page = max(1, min(1000000, request.args.get("page", 1, type=int)))
    per_page = max(1, min(100, request.args.get("per_page", 20, type=int)))
    total = query.count()
    rows = query.order_by(VanTransfer.created_at.desc(), VanTransfer.id.desc()).offset((page - 1) * per_page).limit(per_page).all()
    items = [{"id": r.id, "from_van": by_id[r.from_van_id].registration_number,
                     "to_van": by_id[r.to_van_id].registration_number, "item_id": r.item_id,
                     "item_name": Item.query.get(r.item_id).name, "quantity": r.quantity,
                     "created_at": r.created_at.isoformat()} for r in rows]
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page,
                    "pages": ceil(total / per_page) if total else 0})

@bp.get("/<int:van_id>/movements")
@jwt_required()
def van_movements(van_id):
    identity = get_jwt_identity() or {}
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van or identity.get("role") == "manager" or (identity.get("role") == "attendant" and van.attendant_id != identity.get("id")):
        return jsonify({"msg": "Van not found"}), 404
    page = max(1, min(1000000, request.args.get("page", 1, type=int)))
    per_page = max(1, min(100, request.args.get("per_page", 20, type=int)))
    query = VanStockMovement.query.filter_by(van_id=van_id).order_by(VanStockMovement.created_at.desc(), VanStockMovement.id.desc())
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    supplier_ids = {r.supplier_id for r in rows if r.supplier_id}
    suppliers = {s.id: s for s in Supplier.query.filter(Supplier.id.in_(supplier_ids)).all()} if supplier_ids else {}
    items = [{"id": r.id, "item_name": Item.query.get(r.item_id).name, "movement_type": r.movement_type,
                     "quantity": r.quantity, "unit_cost": float(r.unit_cost or 0), "reference": r.reference,
                     "supplier_id": r.supplier_id, "supplier_name": suppliers[r.supplier_id].name if r.supplier_id in suppliers else None,
                     "empty_quantity": int((r.reference or "").rsplit(":", 1)[-1].strip()) if r.movement_type == "depot_refill" and "Empties returned to depot:" in (r.reference or "") else 0,
                     "created_at": r.created_at.isoformat()} for r in rows]
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page,
                    "pages": ceil(total / per_page) if total else 0})

@bp.get("/<int:van_id>/reconciliation")
@jwt_required()
def van_reconciliation(van_id):
    identity, error = _admin()
    if error: return error
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van: return jsonify({"msg": "Van not found"}), 404
    sale_ids = db.session.query(Sale.id).filter_by(van_id=van.id, tenant_id=identity.get("tenant_id"), operation_type="van")
    sale_count, gross_sales, credit_count, regular_count, outstanding = db.session.query(
        func.count(Sale.id), func.coalesce(func.sum(Sale.total_amount), 0),
        func.coalesce(func.sum(case((Sale.sale_type == "credit", 1), else_=0)), 0),
        func.coalesce(func.sum(case((Sale.sale_type != "credit", 1), else_=0)), 0),
        func.coalesce(func.sum(case(((Sale.sale_type == "credit") & (Sale.status != "paid"), Sale.total_amount - Sale.paid_amount), else_=0)), 0),
    ).filter(Sale.id.in_(sale_ids)).one()
    sold_count = db.session.query(func.coalesce(func.sum(SaleItem.qty), 0)).filter(SaleItem.sale_id.in_(sale_ids)).scalar() or 0
    customer_empty_count = db.session.query(func.coalesce(func.sum(SaleCylinderReturn.returned_qty), 0)).filter(SaleCylinderReturn.sale_id.in_(sale_ids)).scalar() or 0
    customer_empty_count += db.session.query(func.coalesce(func.sum(VanStockMovement.quantity), 0)).filter_by(
        van_id=van.id, movement_type="customer_empty_collection").scalar() or 0
    refill_rows = VanStockMovement.query.filter_by(van_id=van.id, movement_type="depot_refill").all()
    refilled_count = sum(r.quantity for r in refill_rows)
    depot_empty_count = sum(int((r.reference or "").rsplit(":", 1)[-1].strip()) for r in refill_rows if "Empties returned to depot:" in (r.reference or ""))
    return jsonify({"customer_empty_count": int(customer_empty_count), "depot_empty_count": depot_empty_count,
                    "refilled_count": refilled_count, "sold_count": int(sold_count), "sale_count": sale_count,
                    "regular_sale_count": int(regular_count), "credit_sale_count": int(credit_count),
                    "gross_sales": float(gross_sales or 0), "outstanding_credit": float(outstanding or 0)})

@bp.post("/")
@jwt_required()
def create_van():
    identity, error = _admin()
    if error: return error
    data = request.get_json() or {}
    registration = (data.get("registration_number") or "").strip().upper()
    if not registration: return jsonify({"msg": "registration_number required"}), 400
    van = Van(tenant_id=identity.get("tenant_id"), registration_number=registration)
    try:
        db.session.add(van); db.session.commit()
    except Exception:
        db.session.rollback(); return jsonify({"msg": "Registration number already exists"}), 409
    return jsonify(_view(van)), 201

@bp.patch("/<int:van_id>/attendant")
@jwt_required()
def assign_attendant(van_id):
    identity, error = _admin()
    if error: return error
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van: return jsonify({"msg": "Van not found"}), 404
    attendant_id = (request.get_json() or {}).get("attendant_id")
    attendant = User.query.filter_by(id=attendant_id, tenant_id=identity.get("tenant_id"), role="attendant").first() if attendant_id else None
    if attendant_id and not attendant: return jsonify({"msg": "Attendant not found"}), 404
    if attendant and Van.query.filter(Van.attendant_id == attendant.id, Van.id != van.id).first():
        return jsonify({"msg": "Attendant is already assigned to another van"}), 409
    if attendant:
        attendant.shop_id = None
    van.attendant_id = attendant.id if attendant else None
    db.session.commit()
    return jsonify(_view(van))

@bp.delete("/<int:van_id>")
@jwt_required()
def delete_van(van_id):
    identity, error = _admin()
    if error: return error
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van: return jsonify({"msg": "Van not found"}), 404
    if VanStock.query.filter_by(van_id=van.id).first() or VanEmptyCylinderStock.query.filter_by(van_id=van.id).first() or VanTransfer.query.filter((VanTransfer.from_van_id == van.id) | (VanTransfer.to_van_id == van.id)).first():
        return jsonify({"msg": "Remove van stock and transfer history before deleting this van"}), 409
    from models.sale import Sale
    if Sale.query.filter_by(van_id=van.id).first(): return jsonify({"msg": "This van has sale history and cannot be deleted"}), 409
    db.session.delete(van); db.session.commit()
    return jsonify({"msg": "Van deleted"})
