from flask import request, jsonify
from services.stock_service import (
    adjust_stock, adjust_stock_bulk, check_low_stock, get_low_stock_count, 
    get_low_stock_items, delete_stock, get_restock_history, 
    delete_restock_movement, update_restock_movement
)
from models.stock import ShopStock, StockBatch, StockMovement, EmptyCylinderStock, SaleCylinderReturn
from models.sale import Sale
from models.user import User
from models.product import Item, Category
from models.shop import Shop
from extensions import db
from flask_jwt_extended import get_jwt_identity
from utils.auth_utils import get_shop_id_for_attendant
from utils.timezone_utils import get_local_time

def manager_can_restock(identity):
    user = User.query.get(identity.get("id"))
    return bool(user and user.role == "manager" and user.can_restock)

def get_shop_stock(shop_id):
    # Show all stock records for the shop, including those with quantity 0
    # Use join(Item) to ensure we only see stock for existing products
    # Use group_by to aggregate potential duplicates
    from models.product import Item
    from models.stock import StockBatch
    from sqlalchemy import func

    q = db.session.query(
        ShopStock.item_id,
        Item.name.label('item_name'),
        func.sum(ShopStock.quantity).label('total_qty'),
        func.max(ShopStock.buy_price).label('buy_price')
    ).join(Item, ShopStock.item_id == Item.id).filter(ShopStock.shop_id == shop_id).group_by(ShopStock.item_id, Item.name).order_by(Item.name.asc()).all()

    batches = StockBatch.query.filter_by(shop_id=shop_id).filter(StockBatch.remaining_qty > 0).order_by(StockBatch.created_at.asc()).all()
    batches_by_item = {}
    for b in batches:
        batches_by_item.setdefault(b.item_id, []).append(b)

    out = []
    user_identity = get_jwt_identity()
    user_role = user_identity.get("role")

    for s in q:
        batch_list = []
        for b in batches_by_item.get(s.item_id, []):
            b_data = {
                "id": b.id,
                "qty": int(b.remaining_qty),
                "created_at": b.created_at.isoformat()
            }
            if user_role == "admin":
                b_data["buy_price"] = float(b.buy_price or 0)
            batch_list.append(b_data)

        stock_data = {
            "item_id": s.item_id,
            "item_name": s.item_name,
            "qty": int(s.total_qty),
            "batches": batch_list
        }
        if user_role == "admin":
            stock_data["buy_price"] = float(s.buy_price or 0)
        out.append(stock_data)
    return jsonify(out), 200
def adjust_stock_controller(identity):
    if identity.get("role") != "admin":
        return jsonify({"msg": "Only administrators can make individual stock adjustments"}), 403
    data = request.get_json() or {}
    shop_id = data.get("shop_id")
    item_id = data.get("item_id")
    qty = int(data.get("qty",0))
    movement_type = data.get("movement_type","adjustment")
    override = data.get("override", False)
    user_id = identity.get("id")
    # We still accept sell_price in the request for StockMovement if needed, 
    # but we won't store it in ShopStock anymore.
    stock = adjust_stock(shop_id, item_id, qty, movement_type=movement_type, user_id=user_id, buy_price=data.get("buy_price"), sell_price=data.get("sell_price"), override=override, price_unit=data.get("price_unit"))
    return jsonify({"msg":"adjusted","qty":stock.quantity}), 200

def adjust_stock_bulk_controller(identity):
    data = request.get_json() or {}
    try:
        shop_id = int(data.get("shop_id"))
    except (TypeError, ValueError):
        return jsonify({"msg": "Valid Shop ID is required"}), 400
        
    items = data.get("items", [])
    user_id = identity.get("id")
    
    if not items:
        return jsonify({"msg": "No items provided"}), 400
    if identity.get("role") != "admin":
        if not manager_can_restock(identity):
            return jsonify({"msg": "Your restock permission is currently disabled"}), 403
        
    adjust_stock_bulk(shop_id, items, user_id=user_id)
    return jsonify({"msg": "Bulk stock adjustment successful"}), 200

def low_stock_alerts_controller(threshold=2):
    shop_id = get_shop_id_for_attendant()
    
    low = check_low_stock(threshold, shop_id=shop_id)
    out = [{"shop_id":s.shop_id,"item_id":s.item_id,"qty":int(s.total_qty)} for s in low]
    return jsonify(out), 200

def low_stock_count_controller(threshold=2):
    shop_id = get_shop_id_for_attendant()
    
    count = get_low_stock_count(threshold, shop_id=shop_id)
    return jsonify(count), 200

def low_stock_items_controller(threshold=2):
    user_identity = get_jwt_identity()
    user_role = user_identity.get("role")
    shop_id = get_shop_id_for_attendant()
    
    items = get_low_stock_items(threshold, shop_id=shop_id)
    
    # Filter out buy_price for non-admins (attendants and managers)
    if user_role != "admin":
        for item in items:
            item.pop("buy_price", None)
            
    return jsonify(items), 200

def empty_cylinders_controller():
    identity = get_jwt_identity()
    shop_id = get_shop_id_for_attendant() if identity.get("role") == "attendant" else request.args.get("shop_id", type=int)
    query = db.session.query(EmptyCylinderStock, Item, ShopStock).join(Item, EmptyCylinderStock.item_id == Item.id).outerjoin(ShopStock, (ShopStock.shop_id == EmptyCylinderStock.shop_id) & (ShopStock.item_id == EmptyCylinderStock.item_id))
    if shop_id:
        query = query.filter(EmptyCylinderStock.shop_id == shop_id)
    records = query.order_by(EmptyCylinderStock.updated_at.desc()).all()
    
    shop_ids = {empty.shop_id for empty, item, filled in records if empty.shop_id}
    shops = {s.id: s for s in Shop.query.filter(Shop.id.in_(shop_ids)).all()} if shop_ids else {}
    
    out = []
    for empty, item, filled in records:
        shop = shops.get(empty.shop_id)
        out.append({"shop_id": empty.shop_id, "shop_name": shop.name if shop else "N/A", "item_id": item.id, "item_name": item.name, "empty_qty": empty.quantity, "filled_qty": filled.quantity if filled else 0})
    return jsonify(out), 200

def add_empty_cylinders_controller():
    identity, data = get_jwt_identity(), request.get_json() or {}
    shop_id = get_shop_id_for_attendant() if identity.get("role") == "attendant" else data.get("shop_id")
    try:
        item_id, qty = int(data.get("item_id")), int(data.get("qty", 0))
    except (TypeError, ValueError):
        return jsonify({"msg": "Product and a positive quantity are required"}), 400
    if not shop_id or qty <= 0:
        return jsonify({"msg": "Shop, product and a positive quantity are required"}), 400
    item = Item.query.get(item_id)
    category = Category.query.get(item.category_id) if item else None
    if not category or "gas" not in category.name.lower():
        return jsonify({"msg": "Empty cylinders can only be added for gas products"}), 400
    empty = EmptyCylinderStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
    if not empty:
        empty = EmptyCylinderStock(shop_id=shop_id, item_id=item_id, quantity=0)
        db.session.add(empty)
    empty.quantity += qty
    empty.updated_at = get_local_time()
    db.session.add(StockMovement(shop_id=shop_id, item_id=item_id, movement_type="empty_cylinder_addition", qty=qty, user_id=identity.get("id"), reference=data.get("note") or "Empty cylinders added", created_at=get_local_time()))
    db.session.commit()
    return jsonify({"msg": "Empty cylinders added", "qty": empty.quantity}), 201

def outstanding_empty_cylinders_controller():
    identity = get_jwt_identity()
    shop_id = get_shop_id_for_attendant() if identity.get("role") == "attendant" else request.args.get("shop_id", type=int)
    query = db.session.query(SaleCylinderReturn, Sale, Item, Shop).join(Sale, SaleCylinderReturn.sale_id == Sale.id).join(Item, SaleCylinderReturn.item_id == Item.id).join(Shop, Sale.shop_id == Shop.id).filter(SaleCylinderReturn.returned_qty < SaleCylinderReturn.sold_qty)
    if shop_id:
        query = query.filter(Sale.shop_id == shop_id)
    records = query.order_by(SaleCylinderReturn.created_at.desc()).all()
    return jsonify([{
        "id": record.id, "sale_id": sale.id, "shop_id": sale.shop_id, "shop_name": shop.name,
        "item_id": item.id, "item_name": item.name, "sold_qty": record.sold_qty,
        "returned_qty": record.returned_qty, "outstanding_qty": record.sold_qty - record.returned_qty,
        "customer_name": sale.customer_name or "Walk-in customer", "customer_phone": sale.customer_phone,
        "created_at": record.created_at.isoformat(),
    } for record, sale, item, shop in records]), 200

def receive_outstanding_empty_cylinder_controller(record_id):
    identity, data = get_jwt_identity(), request.get_json() or {}
    try:
        qty = int(data.get("qty", 0))
    except (TypeError, ValueError):
        qty = 0
    record = SaleCylinderReturn.query.get(record_id)
    if not record or qty <= 0:
        return jsonify({"msg": "A valid outstanding record and positive quantity are required"}), 400
    sale = Sale.query.get(record.sale_id)
    if identity.get("role") == "attendant" and get_shop_id_for_attendant() != sale.shop_id:
        return jsonify({"msg": "You can only receive cylinders for your shop"}), 403
    outstanding = record.sold_qty - record.returned_qty
    if qty > outstanding:
        return jsonify({"msg": "Received cylinders cannot exceed the outstanding quantity"}), 400
    empty = EmptyCylinderStock.query.filter_by(shop_id=sale.shop_id, item_id=record.item_id).first()
    if not empty:
        empty = EmptyCylinderStock(shop_id=sale.shop_id, item_id=record.item_id, quantity=0)
        db.session.add(empty)
    record.returned_qty += qty
    empty.quantity += qty
    empty.updated_at = get_local_time()
    db.session.add(StockMovement(shop_id=sale.shop_id, item_id=record.item_id, movement_type="empty_cylinder_return", qty=qty, user_id=identity.get("id"), reference=f"Outstanding cylinder return for sale {sale.id}", created_at=get_local_time()))
    db.session.commit()
    return jsonify({"msg": "Returned empty cylinders received", "outstanding_qty": record.sold_qty - record.returned_qty}), 200

def refill_empty_cylinders_controller():
    identity, data = get_jwt_identity(), request.get_json() or {}
    shop_id = get_shop_id_for_attendant() if identity.get("role") == "attendant" else data.get("shop_id")
    item_id, qty = data.get("item_id"), int(data.get("qty", 0))
    buy_price = data.get("buy_price")
    if buy_price is not None:
        try:
            buy_price = float(buy_price)
        except (TypeError, ValueError):
            buy_price = None
    if not shop_id or not item_id or qty <= 0: return jsonify({"msg": "Shop, product and a positive quantity are required"}), 400
    empty = EmptyCylinderStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
    if not empty or empty.quantity < qty: return jsonify({"msg": "Not enough empty cylinders available"}), 400
    stock = ShopStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
    if not stock:
        stock = ShopStock(shop_id=shop_id, item_id=item_id, quantity=0, buy_price=0); db.session.add(stock)
    empty.quantity -= qty; stock.quantity += qty; stock.updated_at = get_local_time()
    batch_buy_price = buy_price if buy_price is not None else (stock.buy_price or 0)
    db.session.add(StockBatch(shop_id=shop_id, item_id=item_id, initial_qty=qty, remaining_qty=qty, buy_price=batch_buy_price, source_type="cylinder_refill", created_at=get_local_time()))
    db.session.add(StockMovement(shop_id=shop_id, item_id=item_id, movement_type="cylinder_refill", qty=qty, user_id=identity.get("id"), created_at=get_local_time()))
    db.session.commit()
    return jsonify({"msg": "Empty cylinders converted to filled stock"}), 200

def delete_stock_controller(shop_id, item_id):
    user_identity = get_jwt_identity()
    if user_identity.get("role") != "admin":
        return jsonify({"msg": "Only administrators can delete stock records"}), 403
    user_id = user_identity.get("id")
    try:
        delete_stock(shop_id, item_id, user_id)
        return jsonify({"msg": "Stock record deleted successfully"}), 200
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400

def get_restock_history_controller():
    shop_id = request.args.get("shop_id")
    if shop_id:
        try:
            shop_id = int(shop_id)
        except ValueError:
            return jsonify({"msg": "Invalid shop_id"}), 400

    page_value = request.args.get("page")
    per_page_value = request.args.get("per_page", "25")
    try:
        page = int(page_value) if page_value is not None else None
        per_page = int(per_page_value)
    except ValueError:
        return jsonify({"msg": "Invalid pagination parameters"}), 400

    history = get_restock_history(shop_id, page, per_page)
    return jsonify(history), 200

def delete_restock_controller(movement_id):
    try:
        success = delete_restock_movement(movement_id)
        if not success:
            return jsonify({"msg": "Movement not found"}), 404
        return jsonify({"msg": "Restock movement deleted successfully"}), 200
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400
    except Exception as e:
        return jsonify({"msg": "Internal Server Error"}), 500

def update_restock_controller(movement_id):
    data = request.get_json() or {}
    new_qty = data.get("qty")
    new_buy_price = data.get("buy_price")
    
    if new_qty is None:
        return jsonify({"msg": "Quantity is required"}), 400
        
    try:
        success = update_restock_movement(movement_id, int(new_qty), float(new_buy_price) if new_buy_price is not None else None)
        if not success:
            return jsonify({"msg": "Movement not found"}), 404
        return jsonify({"msg": "Restock movement updated successfully"}), 200
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400
    except Exception as e:
        return jsonify({"msg": "Internal Server Error"}), 500

def update_empty_cylinder_controller(shop_id, item_id):
    user_identity = get_jwt_identity()
    if user_identity.get("role") != "admin":
        return jsonify({"msg": "Only administrators can update empty cylinder records"}), 403
    data = request.get_json() or {}
    try:
        qty = int(data.get("qty", 0))
    except (TypeError, ValueError):
        return jsonify({"msg": "Valid quantity is required"}), 400
    if qty < 0:
        return jsonify({"msg": "Quantity cannot be negative"}), 400
    record = EmptyCylinderStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
    if not record:
        return jsonify({"msg": "Empty cylinder record not found"}), 404
    record.quantity = qty
    record.updated_at = get_local_time()
    db.session.add(StockMovement(shop_id=shop_id, item_id=item_id, movement_type="empty_cylinder_adjustment", qty=qty, user_id=user_identity.get("id"), reference=data.get("note") or "Empty cylinder quantity adjusted", created_at=get_local_time()))
    db.session.commit()
    return jsonify({"msg": "Empty cylinder record updated", "qty": qty}), 200

def delete_empty_cylinder_controller(shop_id, item_id):
    user_identity = get_jwt_identity()
    if user_identity.get("role") != "admin":
        return jsonify({"msg": "Only administrators can delete empty cylinder records"}), 403
    record = EmptyCylinderStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
    if not record:
        return jsonify({"msg": "Empty cylinder record not found"}), 404
    db.session.delete(record)
    db.session.add(StockMovement(shop_id=shop_id, item_id=item_id, movement_type="empty_cylinder_deletion", qty=record.quantity, user_id=user_identity.get("id"), reference=f"Empty cylinder record deleted (had {record.quantity} units)", created_at=get_local_time()))
    db.session.commit()
    return jsonify({"msg": "Empty cylinder record deleted successfully"}), 200
