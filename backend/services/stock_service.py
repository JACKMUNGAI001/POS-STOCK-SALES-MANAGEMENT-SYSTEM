from extensions import db
from models.stock import ShopStock, StockMovement, StockBatch
from models.product import Item
from models.shop import Shop
from models.notification import Notification
from models.user import User
from datetime import datetime
from sqlalchemy import func
from utils.timezone_utils import get_local_time
from utils.helpers import calculate_total_buy_price


def adjust_stock(shop_id, item_id, qty, movement_type="adjustment", user_id=None, buy_price=None, sell_price=None, override=False, price_unit=None):
    item = Item.query.get(item_id)
    category_name = None
    if item and item.category_id:
        from models.product import Category
        category = Category.query.get(item.category_id)
        category_name = category.name if category else None

    effective_buy_price = calculate_total_buy_price(
        item=item,
        price=buy_price,
        price_unit=price_unit,
        category_name=category_name,
    )

    # Try to find existing stock record
    stock = ShopStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
    if not stock:
        # Check if there are any duplicates (just in case) and merge them or pick one
        # For new records, we just create one
        stock = ShopStock(shop_id=shop_id, item_id=item_id, quantity=0, buy_price=effective_buy_price)
        db.session.add(stock)
    
    if override:
        old_qty = stock.quantity
        stock.quantity = qty
        qty_change = qty - old_qty
    else:
        stock.quantity += qty
        qty_change = qty

    if buy_price is not None: stock.buy_price = effective_buy_price
    stock.updated_at = get_local_time()
    
    # Handle Batches
    if qty_change > 0:
        # Adding stock -> New batch
        new_batch = StockBatch(
            shop_id=shop_id,
            item_id=item_id,
            initial_qty=qty_change,
            remaining_qty=qty_change,
            buy_price=effective_buy_price if buy_price is not None else (stock.buy_price or 0),
            source_type=movement_type,
            created_at=get_local_time()
        )
        db.session.add(new_batch)
    elif qty_change < 0:
        # Removing stock -> Consume from oldest batches (FIFO)
        to_pull = abs(qty_change)
        while to_pull > 0:
            batch = StockBatch.query.filter_by(shop_id=shop_id, item_id=item_id) \
                .filter(StockBatch.remaining_qty > 0) \
                .order_by(StockBatch.created_at.asc()).first()
            if not batch: break
            pull = min(to_pull, batch.remaining_qty)
            batch.remaining_qty -= pull
            to_pull -= pull
    
    # Check for low stock notification (only if quantity decreased)
    if qty_change < 0 and stock.quantity <= 2:
        product = Item.query.get(item_id)
        shop_obj = Shop.query.get(shop_id)
        # Notify all admins
        admins = User.query.filter_by(role='admin').all()
        for admin in admins:
            n_admin = Notification(
                user_id=admin.id,
                user_role='admin',
                type='low_stock',
                message=f'Low Stock Alert: {product.name} is down to {stock.quantity} in {shop_obj.name}.'
            )
            db.session.add(n_admin)
        
        # Notify attendants in that shop
        attendants = User.query.filter_by(shop_id=shop_id, role='attendant').all()
        for attendant in attendants:
            n_att = Notification(
                user_id=attendant.id,
                user_role='attendant',
                type='low_stock',
                message=f'Low Stock Alert: {product.name} is down to {stock.quantity} in {shop_obj.name}.'
            )
            db.session.add(n_att)

    db.session.commit()

    mv = StockMovement(shop_id=shop_id, item_id=item_id, movement_type=movement_type, qty=qty_change, unit_buy_price=effective_buy_price, unit_sell_price=sell_price, user_id=user_id, reference=None, created_at=get_local_time())
    db.session.add(mv)
    db.session.commit()
    return stock

def adjust_stock_bulk(shop_id, items, user_id=None):
    """
    items: list of dicts with {item_id, qty, movement_type, buy_price, sell_price, override}
    """
    for item_data in items:
        try:
            item_id = int(item_data.get("item_id"))
            qty = int(item_data.get("qty", 0))
        except (TypeError, ValueError):
            continue # Skip invalid items

        movement_type = item_data.get("movement_type", "adjustment")
        buy_price = item_data.get("buy_price")
        if buy_price is not None:
            try:
                buy_price = float(buy_price)
            except (TypeError, ValueError):
                buy_price = None

        price_unit = item_data.get("price_unit")

        sell_price = item_data.get("sell_price")
        if sell_price is not None:
            try:
                sell_price = float(sell_price)
            except (TypeError, ValueError):
                sell_price = None

        override = item_data.get("override", False)

        # Try to find existing stock record
        item = Item.query.get(item_id)
        category_name = None
        if item and item.category_id:
            from models.product import Category
            category = Category.query.get(item.category_id)
            category_name = category.name if category else None

        effective_buy_price = calculate_total_buy_price(
            item=item,
            price=buy_price,
            price_unit=price_unit,
            category_name=category_name,
        )

        stock = ShopStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
        if not stock:
            stock = ShopStock(shop_id=shop_id, item_id=item_id, quantity=0, buy_price=effective_buy_price)
            db.session.add(stock)
            db.session.flush() # Ensure it's found in subsequent iterations of the same item_id in this bulk request
        
        if override:
            old_qty = stock.quantity
            stock.quantity = qty
            qty_change = qty - old_qty
        else:
            stock.quantity += qty
            qty_change = qty

        if buy_price is not None: stock.buy_price = effective_buy_price
        stock.updated_at = get_local_time()
        
        # Handle Batches
        if qty_change > 0:
            new_batch = StockBatch(
                shop_id=shop_id,
                item_id=item_id,
                initial_qty=qty_change,
                remaining_qty=qty_change,
                buy_price=effective_buy_price if buy_price is not None else (stock.buy_price or 0),
                source_type=movement_type,
                created_at=get_local_time()
            )
            db.session.add(new_batch)
        elif qty_change < 0:
            to_pull = abs(qty_change)
            while to_pull > 0:
                batch = StockBatch.query.filter_by(shop_id=shop_id, item_id=item_id) \
                    .filter(StockBatch.remaining_qty > 0) \
                    .order_by(StockBatch.created_at.asc()).first()
                if not batch: break
                pull = min(to_pull, batch.remaining_qty)
                batch.remaining_qty -= pull
                to_pull -= pull
        
        # Check for low stock notification
        if qty_change < 0 and stock.quantity <= 2:
            product = Item.query.get(item_id)
            shop_obj = Shop.query.get(shop_id)
            admins = User.query.filter_by(role='admin').all()
            for admin in admins:
                n_admin = Notification(user_id=admin.id, user_role='admin', type='low_stock',
                    message=f'Low Stock Alert: {product.name} is down to {stock.quantity} in {shop_obj.name}.')
                db.session.add(n_admin)
            
            attendants = User.query.filter_by(shop_id=shop_id, role='attendant').all()
            for attendant in attendants:
                n_att = Notification(user_id=attendant.id, user_role='attendant', type='low_stock',
                    message=f'Low Stock Alert: {product.name} is down to {stock.quantity} in {shop_obj.name}.')
                db.session.add(n_att)

        mv = StockMovement(shop_id=shop_id, item_id=item_id, movement_type=movement_type, qty=qty_change, 
                           unit_buy_price=effective_buy_price, unit_sell_price=sell_price, user_id=user_id, 
                           reference=None, created_at=get_local_time())
        db.session.add(mv)

    db.session.commit()
    return True

def check_low_stock(threshold=2, shop_id=None):
    # Group by to handle duplicates
    query = db.session.query(
        ShopStock.shop_id, 
        ShopStock.item_id, 
        func.sum(ShopStock.quantity).label('total_qty')
    ).join(Item).group_by(ShopStock.shop_id, ShopStock.item_id).having(func.sum(ShopStock.quantity) <= threshold)
    
    if shop_id:
        query = query.filter(ShopStock.shop_id == shop_id)
    
    results = query.all()
    # Mocking ShopStock objects for compatibility with existing code if needed, 
    # but let's see if we can just return what's needed.
    return results

def get_low_stock_count(threshold=2, shop_id=None):
    # Group by to count unique items that are low on total stock
    query = db.session.query(ShopStock.item_id).join(Item)
    if shop_id:
        query = query.filter(ShopStock.shop_id == shop_id)
    
    query = query.group_by(ShopStock.shop_id, ShopStock.item_id).having(func.sum(ShopStock.quantity) <= threshold)
    return {"count": query.count()}

def get_low_stock_items(threshold=2, shop_id=None):
    query = db.session.query(
        ShopStock.item_id,
        ShopStock.shop_id,
        func.sum(ShopStock.quantity).label('qty'),
        func.max(ShopStock.buy_price).label('buy_price')
    ).join(Item).group_by(ShopStock.shop_id, ShopStock.item_id).having(func.sum(ShopStock.quantity) <= threshold)
    
    if shop_id:
        query = query.filter(ShopStock.shop_id == shop_id)
    
    low_stock = query.order_by(Item.name.asc()).all()
    
    item_ids = {s.item_id for s in low_stock}
    shop_ids = {s.shop_id for s in low_stock}
    
    items = {i.id: i for i in Item.query.filter(Item.id.in_(item_ids)).all()} if item_ids else {}
    shops = {s.id: s for s in Shop.query.filter(Shop.id.in_(shop_ids)).all()} if shop_ids else {}
    
    out = []
    for s in low_stock:
        item = items.get(s.item_id)
        shop = shops.get(s.shop_id)
        out.append({
            "item_id":s.item_id,
            "item_name": item.name if item else "N/A",
            "shop_id":s.shop_id,
            "shop_name": shop.name if shop else "N/A",
            "qty":int(s.qty),
            "buy_price":float(s.buy_price or 0)
        })
    return out

def delete_stock(shop_id, item_id, user_id):
    stock = ShopStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
    if not stock:
        raise ValueError("Stock record not found.")
    
    deleted_qty = stock.quantity
    db.session.delete(stock)
    
    mv = StockMovement(shop_id=shop_id, item_id=item_id, movement_type="deletion", qty=-deleted_qty, user_id=user_id, created_at=get_local_time())
    db.session.add(mv)
    db.session.commit()
    return True

def _serialize_restock_movements(movements):
    item_ids = {m.item_id for m in movements if m.item_id}
    shop_ids = {m.shop_id for m in movements if m.shop_id}
    user_ids = {m.user_id for m in movements if m.user_id}

    items = {i.id: i for i in Item.query.filter(Item.id.in_(item_ids)).all()} if item_ids else {}
    shops = {s.id: s for s in Shop.query.filter(Shop.id.in_(shop_ids)).all()} if shop_ids else {}
    users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}

    out = []
    for m in movements:
        item = items.get(m.item_id)
        shop = shops.get(m.shop_id)
        user = users.get(m.user_id)
        out.append({
            "id": m.id,
            "shop_name": shop.name if shop else "N/A",
            "item_name": item.name if item else "N/A",
            "qty": m.qty,
            "movement_type": m.movement_type,
            "buy_price": float(m.unit_buy_price or 0),
            "user_name": user.name if user else "N/A",
            "created_at": m.created_at.isoformat(),
            "reference": m.reference
        })
    return out


def _paginate_restock_history(query, page, per_page):
    page = max(1, page)
    per_page = min(100, max(1, per_page))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "history": _serialize_restock_movements(pagination.items),
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }


def get_restock_history(shop_id=None, page=None, per_page=25):
    query = StockMovement.query.filter(StockMovement.movement_type.in_(['purchase_in', 'adjustment', 'transfer_in']))
    if shop_id:
        query = query.filter_by(shop_id=shop_id)
    query = query.order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
    if page is None:
        return _serialize_restock_movements(query.all())
    return _paginate_restock_history(query, page, per_page)

def delete_restock_movement(movement_id):
    mv = StockMovement.query.get(movement_id)
    if not mv:
        return False
    
    if mv.movement_type not in ['purchase_in', 'adjustment', 'transfer_in']:
        raise ValueError("Only restock movements can be deleted here.")
    
    # If it's a purchase_in with a supplier invoice reference, we should probably delete the invoice instead
    if mv.movement_type == 'purchase_in' and mv.reference and "Supplier Invoice" in mv.reference:
        raise ValueError("This restock is linked to a supplier invoice. Please delete the invoice instead.")

    # Reverse stock change
    stock = ShopStock.query.filter_by(shop_id=mv.shop_id, item_id=mv.item_id).first()
    if stock:
        if stock.quantity < mv.qty:
             raise ValueError(f"Insufficient stock to reverse this movement.")
        stock.quantity -= mv.qty
    
    # Delete associated Batch (if it was an addition)
    if mv.qty > 0:
        batch = StockBatch.query.filter_by(
            shop_id=mv.shop_id, 
            item_id=mv.item_id, 
            initial_qty=mv.qty,
            source_type=mv.movement_type
        ).order_by(StockBatch.created_at.desc()).first()
        
        if batch:
            # Check if it was partially consumed
            if batch.remaining_qty < batch.initial_qty:
                raise ValueError("Cannot delete this restock because some of it has already been sold.")
            db.session.delete(batch)

    db.session.delete(mv)
    db.session.commit()
    return True

def update_restock_movement(movement_id, new_qty, new_buy_price=None):
    mv = StockMovement.query.get(movement_id)
    if not mv:
        return False
    
    if mv.movement_type not in ['purchase_in', 'adjustment', 'transfer_in']:
        raise ValueError("Only restock movements can be edited here.")

    if mv.movement_type == 'purchase_in' and mv.reference and "Supplier Invoice" in mv.reference:
        raise ValueError("This restock is linked to a supplier invoice. Please edit the invoice instead.")

    # Difference in quantity
    qty_diff = new_qty - mv.qty
    
    # Reverse or update stock
    stock = ShopStock.query.filter_by(shop_id=mv.shop_id, item_id=mv.item_id).first()
    if stock:
        # If we're reducing the qty (qty_diff < 0), check if there's enough stock
        if qty_diff < 0 and stock.quantity < abs(qty_diff):
             raise ValueError(f"Insufficient stock to reduce this movement by {abs(qty_diff)}.")
        stock.quantity += qty_diff
        if new_buy_price is not None:
             stock.buy_price = new_buy_price
    
    # Update associated Batch
    batch = StockBatch.query.filter_by(
        shop_id=mv.shop_id, 
        item_id=mv.item_id, 
        initial_qty=mv.qty,
        source_type=mv.movement_type
    ).order_by(StockBatch.created_at.desc()).first()
    
    if batch:
        # Check if it was partially consumed
        if batch.remaining_qty < batch.initial_qty:
            # If reducing, we can only reduce by what's remaining
            if qty_diff < 0 and batch.remaining_qty < abs(qty_diff):
                 raise ValueError("Cannot reduce this restock by this amount because some of it has already been sold.")
            batch.initial_qty = new_qty
            batch.remaining_qty += qty_diff
        else:
            # Not consumed at all, just update
            batch.initial_qty = new_qty
            batch.remaining_qty = new_qty
            
        if new_buy_price is not None:
            batch.buy_price = new_buy_price

    # Update movement record
    mv.qty = new_qty
    if new_buy_price is not None:
        mv.unit_buy_price = new_buy_price
    
    db.session.commit()
    return True
