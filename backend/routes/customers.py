from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from math import ceil
from sqlalchemy import case, func
from sqlalchemy.orm import selectinload

from extensions import db
from models.customer import Customer
from models.sale import Sale
from models.van import Van, VanStockMovement
from models.product import Item
from services.sale_service import _serialize_sales_bulk


bp = Blueprint("customers", __name__)


def _admin_identity():
    identity = get_jwt_identity() or {}
    if identity.get("role") != "admin":
        return None
    return identity


@bp.get("")
@jwt_required()
def list_customers():
    identity = _admin_identity()
    if not identity:
        return jsonify({"msg": "admin only"}), 403

    page = max(1, min(1000000, request.args.get("page", 1, type=int)))
    per_page = max(1, min(100, request.args.get("per_page", 20, type=int)))
    customer_base = Customer.query.filter(Customer.tenant_id == identity.get("tenant_id"))
    search = (request.args.get("q") or "").strip()
    if search:
        customer_base = customer_base.filter((Customer.name.ilike(f"%{search}%")) | (Customer.phone.ilike(f"%{search}%")))
    customer_query = db.session.query(
        Customer,
        func.count(Sale.id).label("sale_count"),
        func.coalesce(func.sum(Sale.total_amount), 0).label("total_sales"),
        func.coalesce(func.sum(case(
            ((Sale.sale_type == "credit") & (Sale.status != "paid"), Sale.total_amount - Sale.paid_amount),
            else_=0,
        )), 0).label("outstanding_balance"),
        func.max(Sale.created_at).label("last_purchase_at"),
    ).outerjoin(
        Sale,
        (Sale.customer_id == Customer.id) & (Sale.operation_type == "van"),
    ).filter(Customer.id.in_(customer_base.with_entities(Customer.id).subquery())
    ).group_by(Customer.id).order_by(Customer.name.asc())
    total = customer_base.count()
    rows = customer_query.offset((page - 1) * per_page).limit(per_page).all()

    items = [{
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "sale_count": int(sale_count or 0),
        "total_sales": float(total_sales or 0),
        "outstanding_balance": float(outstanding_balance or 0),
        "last_purchase_at": last_purchase_at.isoformat() if last_purchase_at else None,
    } for customer, sale_count, total_sales, outstanding_balance, last_purchase_at in rows]
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page,
                    "pages": ceil(total / per_page) if total else 0}), 200


@bp.get("/<int:customer_id>")
@jwt_required()
def customer_record(customer_id):
    identity = _admin_identity()
    if not identity:
        return jsonify({"msg": "admin only"}), 403

    customer = Customer.query.filter_by(id=customer_id, tenant_id=identity.get("tenant_id")).first()
    if not customer:
        return jsonify({"msg": "Customer not found"}), 404
    page = max(1, min(1000000, request.args.get("page", 1, type=int)))
    per_page = max(1, min(100, request.args.get("per_page", 20, type=int)))
    sales_query = Sale.query.filter_by(
        customer_id=customer.id,
        tenant_id=identity.get("tenant_id"),
        operation_type="van",
    ).options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc())
    total = sales_query.count()
    sales = sales_query.offset((page - 1) * per_page).limit(per_page).all()
    serialized = _serialize_sales_bulk(sales)
    collection_query = db.session.query(VanStockMovement, Item, Van).join(
        Item, Item.id == VanStockMovement.item_id,
    ).join(Van, Van.id == VanStockMovement.van_id).filter(
        VanStockMovement.customer_id == customer.id,
        VanStockMovement.tenant_id == identity.get("tenant_id"),
        VanStockMovement.movement_type == "customer_empty_collection",
    ).order_by(VanStockMovement.created_at.desc(), VanStockMovement.id.desc())
    collection_count = collection_query.count()
    collections = collection_query.offset((page - 1) * per_page).limit(per_page).all()
    return jsonify({
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "created_at": customer.created_at.isoformat(),
        "sales": serialized,
        "collections": [{
            "id": movement.id,
            "item_name": item.name,
            "quantity": movement.quantity,
            "van_registration": van.registration_number,
            "created_at": movement.created_at.isoformat(),
        } for movement, item, van in collections],
        "collection_count": collection_count,
        "collection_pages": ceil(collection_count / per_page) if collection_count else 0,
        "sale_count": total,
        "total_sales": float(db.session.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter_by(
            customer_id=customer.id, tenant_id=identity.get("tenant_id"), operation_type="van").scalar() or 0),
        "outstanding_balance": float(db.session.query(func.coalesce(func.sum(
            case(((Sale.sale_type == "credit") & (Sale.status != "paid"), Sale.total_amount - Sale.paid_amount), else_=0)
        ), 0)).filter_by(customer_id=customer.id, tenant_id=identity.get("tenant_id"), operation_type="van").scalar() or 0),
        "page": page,
        "per_page": per_page,
        "pages": max(ceil(total / per_page) if total else 0,
                     ceil(collection_count / per_page) if collection_count else 0),
    }), 200
