from extensions import db
from models.sale import Sale, SaleItem, SalePayment, ensure_sale_type_column
from models.stock import ShopStock, StockMovement, StockBatch, EmptyCylinderStock, SaleCylinderReturn
from models.shop import Shop
from models.user import User
from models.product import Item, Category
from services.receipt_service import create_receipt
from datetime import datetime
from models.notification import Notification
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from utils.timezone_utils import get_local_time
import logging

logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)


def normalize_sale_type(sale_type=None):
    normalized = str(sale_type or "").strip().lower()
    if normalized in {"credit", "baadaye", "baadaye ( sold on credit)", "sold on credit"}:
        return "credit"
    return "standard"


def get_sale_type_label(sale_type=None):
    normalized = str(sale_type or "").strip().lower()
    if normalized in {"credit", "baadaye", "baadaye ( sold on credit)", "sold on credit"}:
        return "BAADAYE ( SOLD ON CREDIT)"
    return "Regular Sale"


def add_sale_payment(sale_id, amount, recorded_by=None):
    try:
        ensure_sale_type_column()
        sale = Sale.query.get(sale_id)
        if not sale:
            raise ValueError("Sale not found")

        payment_amount = float(amount)
        if payment_amount <= 0:
            raise ValueError("Payment amount must be greater than zero")
        db.session.add(SalePayment(
            sale_id=sale_id,
            amount=payment_amount,
            recorded_by=recorded_by,
        ))

        # Update sale paid amount
        sale.paid_amount = float(sale.paid_amount or 0) + payment_amount

        # If fully paid or overpaid, mark paid and recognize profit
        if float(sale.paid_amount or 0) >= float(sale.total_amount or 0):
            sale.status = "paid"
            # Compute profit across sale items (unit_price - unit_cost) * qty
            profit = 0
            for it in sale.items:
                up = float(it.unit_price or 0)
                uc = float(it.unit_cost or 0)
                qty = int(it.qty or 0)
                profit += (up - uc) * qty
            sale.profit_amount = profit
            sale.profit_recognized = True

        db.session.add(sale)
        db.session.commit()
        return sale
    except Exception as e:
        db.session.rollback()
        raise e

def _generate_sale_receipt_html(sale, shop, attendant, sale_items):
    items_html = ""
    for si in sale_items:
        item = Item.query.get(si.item_id)
        items_html += f"<tr><td>{item.name}</td><td>{si.qty}</td><td>{si.unit_price}</td><td>{si.qty * si.unit_price}</td></tr>"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>GAS POS SYSTEM - Receipt</title>
        <style>
            body {{ font-family: sans-serif; }}
            .receipt-container {{ width: 300px; margin: auto; border: 1px solid #ccc; padding: 10px; }}
            .header {{ text-align: center; margin-bottom: 20px; }}
            .header h1 {{ margin: 0; font-size: 24px; text-transform: uppercase; }}
            .items-table {{ width: 100%; border-collapse: collapse; }}
            .items-table th, .items-table td {{ border: 1px solid #ccc; padding: 5px; }}
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header">
                <h1 style="color: #1a56db; font-size: 28px; font-weight: 900; margin-bottom: 2px;">GAS POS SYSTEM</h1>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">{shop.name}</p>
                <p style="margin-top: 5px; font-size: 12px; font-weight: 800; border-top: 1px solid #000; padding-top: 5px; display: inline-block;">OFFICIAL SALE RECEIPT</p>
            </div>
            <p><strong>Attendant:</strong> {attendant.name}</p>
            <p><strong>Date:</strong> {sale.created_at.strftime('%Y-%m-%d %H:%M:%S')}</p>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            <p><strong>Total Amount:</strong> {sale.total_amount}</p>
            <p><strong>Payment Type:</strong> {'M-PESA' if sale.payment_type == 'mobile_money' else sale.payment_type}</p>
            <p><strong>Sale Type:</strong> {get_sale_type_label(sale.sale_type)}</p>
            {f'<p><strong>Customer:</strong> {sale.customer_name}</p><p><strong>Phone:</strong> {sale.customer_phone}</p>' if sale.sale_type == 'credit' else ''}
        </div>
    </body>
    </html>
    """
    return html

def create_sale(shop_id, user_id, items, payment_type="mobile_money", sale_type="standard", customer_name=None, customer_phone=None, empty_cylinders=None):
    try:
        ensure_sale_type_column()
        normalized_sale_type = normalize_sale_type(sale_type)
        customer_name = str(customer_name or "").strip() or None
        customer_phone = str(customer_phone or "").strip() or None
        logger.debug(f"create_sale called with sale_type={sale_type!r}; normalized={normalized_sale_type!r}")
        if not items:
            raise ValueError("Cannot create a sale with no items.")
        if normalized_sale_type == "credit" and (not customer_name or not customer_phone):
            raise ValueError("Customer name and phone number are required for a credit sale.")

        sale_items = []
        sale = None
        
        with db.session.begin_nested():
            total = 0
            sale = Sale(shop_id=shop_id, user_id=user_id, total_amount=0, payment_type=payment_type, sale_type=normalized_sale_type, customer_name=customer_name, customer_phone=customer_phone)
            logger.debug(f"Sale instance created with sale.sale_type={normalized_sale_type!r}")
            db.session.add(sale)
            db.session.flush() # Ensure sale.id is available

            for it in items:
                item_id = it.get("item_id")
                qty_to_sell = int(it.get("qty", 1))
                unit_price = it.get("unit_price")

                if unit_price is None:
                    raise ValueError(f"Unit price not provided for item {item_id}")
                unit_price = float(unit_price)

                stock = ShopStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
                if not stock or stock.quantity < qty_to_sell:
                    raise ValueError(f"Insufficient stock for item {item_id}")
                
                # Update total shop stock
                stock.quantity -= qty_to_sell
                
                # FIFO Logic: Consume from batches
                remaining_to_pull = qty_to_sell
                while remaining_to_pull > 0:
                    # Find the oldest batch with remaining quantity
                    batch = StockBatch.query.filter_by(shop_id=shop_id, item_id=item_id) \
                        .filter(StockBatch.remaining_qty > 0) \
                        .order_by(StockBatch.created_at.asc()).first()
                    
                    if not batch:
                        # Fallback for old data or inconsistencies
                        # Use current buy_price if no batches are found
                        si = SaleItem(sale_id=sale.id, item_id=item_id, qty=remaining_to_pull, unit_price=unit_price, unit_cost=stock.buy_price)
                        sale_items.append(si)
                        remaining_to_pull = 0
                    else:
                        pull_qty = min(remaining_to_pull, batch.remaining_qty)
                        batch.remaining_qty -= pull_qty
                        remaining_to_pull -= pull_qty
                        
                        si = SaleItem(
                            sale_id=sale.id, 
                            item_id=item_id, 
                            qty=pull_qty, 
                            unit_price=unit_price, 
                            unit_cost=batch.buy_price,
                            batch_id=batch.id
                        )
                        sale_items.append(si)
                
                mv = StockMovement(shop_id=shop_id, item_id=item_id, movement_type="sale", qty=-qty_to_sell, user_id=user_id, created_at=get_local_time())
                db.session.add(mv)
                
                total += unit_price * qty_to_sell

                # Check for low stock notification
                if stock.quantity <= 2:
                    product = Item.query.get(item_id)
                    shop_obj = Shop.query.get(shop_id)
                    # Notify current attendant
                    n_attendant = Notification(
                        user_id=user_id,
                        user_role='attendant',
                        type='low_stock',
                        message=f'Low Stock Alert: {product.name} is down to {stock.quantity} in {shop_obj.name}.'
                    )
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
                    db.session.add(n_attendant)

            sold_quantities = {int(it.get("item_id")): int(it.get("qty", 0)) for it in items}
            returned_quantities = {}
            for empty in (empty_cylinders or []):
                item_id, returned = int(empty.get("item_id")), int(empty.get("qty", 0))
                if returned < 0:
                    raise ValueError("Returned empty cylinders must be between zero and the quantity sold")
                returned_quantities[item_id] = returned_quantities.get(item_id, 0) + returned

            for item_id, returned in returned_quantities.items():
                if returned > sold_quantities.get(item_id, 0):
                    raise ValueError("Returned empty cylinders must be between zero and the quantity sold")

            for item_id, sold_qty in sold_quantities.items():
                item = Item.query.get(item_id)
                category = Category.query.get(item.category_id) if item else None
                if not category or "gas" not in category.name.lower():
                    if returned_quantities.get(item_id, 0):
                        raise ValueError("Empty cylinders can only be recorded for gas products")
                    continue
                returned = returned_quantities.get(item_id, 0)
                db.session.add(SaleCylinderReturn(sale_id=sale.id, item_id=item_id, sold_qty=sold_qty, returned_qty=returned))
                if not returned:
                    continue
                empty_stock = EmptyCylinderStock.query.filter_by(shop_id=shop_id, item_id=item_id).first()
                if not empty_stock:
                    empty_stock = EmptyCylinderStock(shop_id=shop_id, item_id=item_id, quantity=0)
                    db.session.add(empty_stock)
                empty_stock.quantity += returned
                empty_stock.updated_at = get_local_time()

            sale.total_amount = total
            db.session.add_all(sale_items)

        # After nested transaction, generate receipt and link it
        shop = Shop.query.get(shop_id)
        attendant = User.query.get(user_id)
        
        receipt_html = _generate_sale_receipt_html(sale, shop, attendant, sale_items)
        receipt = create_receipt(payload=receipt_html)
        sale.receipt_uuid = receipt.uuid

        logger.debug(f"About to commit sale id={sale.id} with sale_type={sale.sale_type!r}")
        db.session.commit()
        logger.debug(f"Committed sale id={sale.id}")
        return sale
    except Exception as e:
        db.session.rollback()
        raise e

def _serialize_sale(sale, shop=None, attendant=None, items_map=None):
    if shop is None:
        shop = Shop.query.get(sale.shop_id)
    if attendant is None:
        attendant = User.query.get(sale.user_id)
    if items_map is None:
        items_map = {}
    items_summary = []
    for item in sale.items:
        product = items_map.get(item.item_id)
        product_name = product.name if product else "N/A"
        items_summary.append({
            "item_id": item.item_id,
            "item_name": product_name,
            "qty": item.qty,
            "unit_price": float(item.unit_price) if item.unit_price is not None else 0.0,
            "unit_cost": float(item.unit_cost) if item.unit_cost is not None else 0.0
        })
    return {
        "id": sale.id,
        "shop_id": sale.shop_id,
        "shop_name": shop.name if shop else "N/A",
        "user_id": sale.user_id,
        "attendant_name": attendant.name if attendant else "N/A",
        "total_amount": float(sale.total_amount) if sale.total_amount is not None else 0.0,
        "payment_type": sale.payment_type,
        "sale_type": sale.sale_type,
        "sale_type_label": get_sale_type_label(sale.sale_type),
        "customer_name": sale.customer_name,
        "customer_phone": sale.customer_phone,
        "paid_amount": float(sale.paid_amount) if getattr(sale, 'paid_amount', None) is not None else 0.0,
        "status": sale.status if getattr(sale, 'status', None) is not None else 'unpaid',
        "profit_amount": float(sale.profit_amount) if getattr(sale, 'profit_amount', None) is not None else 0.0,
        "created_at": sale.created_at.isoformat(),
        "receipt_uuid": sale.receipt_uuid,
        "items": items_summary
    }

def _serialize_sales_bulk(sales):
    shop_ids = {s.shop_id for s in sales if s.shop_id}
    user_ids = {s.user_id for s in sales if s.user_id}
    item_ids = {si.item_id for s in sales for si in s.items if si.item_id}
    
    shops = {s.id: s for s in Shop.query.filter(Shop.id.in_(shop_ids)).all()} if shop_ids else {}
    users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}
    items = {i.id: i for i in Item.query.filter(Item.id.in_(item_ids)).all()} if item_ids else {}
    
    return [_serialize_sale(s, shop=shops.get(s.shop_id), attendant=users.get(s.user_id), items_map=items) for s in sales]

def get_all_sales():
    query = Sale.query.filter(or_(Sale.sale_type != 'credit', Sale.status == 'paid')).options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc())
    sales = query.all()
    return _serialize_sales_bulk(sales)


def get_sales_by_shop(shop_id):
    query = Sale.query.filter_by(shop_id=shop_id).filter(or_(Sale.sale_type != 'credit', Sale.status == 'paid')).options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc())
    sales = query.all()
    return _serialize_sales_bulk(sales)

def get_todays_sales(shop_id=None):
    today = get_local_time().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    
    query = Sale.query.filter(Sale.created_at.between(start_of_day, end_of_day))
    query = query.filter(or_(Sale.sale_type != 'credit', Sale.status == 'paid'))
    if shop_id:
        query = query.filter(Sale.shop_id == shop_id)
        
    sales = query.options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc()).all()
    return _serialize_sales_bulk(sales)

def get_current_weeks_sales(shop_id=None):
    now = get_local_time()
    start_of_week = datetime.combine(now.date() - timedelta(days=now.weekday()), datetime.min.time())
    end_of_week = start_of_week + timedelta(days=7, microseconds=-1)

    query = Sale.query.filter(Sale.created_at.between(start_of_week, end_of_week))
    query = query.filter(or_(Sale.sale_type != 'credit', Sale.status == 'paid'))
    if shop_id:
        query = query.filter(Sale.shop_id == shop_id)
        
    sales = query.options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc()).all()
    return _serialize_sales_bulk(sales)

def get_current_months_sales(shop_id=None):
    now = get_local_time()
    start_of_month = datetime(now.year, now.month, 1)
    if now.month == 12:
        end_of_month = datetime(now.year + 1, 1, 1) - timedelta(microseconds=1)
    else:
        end_of_month = datetime(now.year, now.month + 1, 1) - timedelta(microseconds=1)

    query = Sale.query.filter(Sale.created_at.between(start_of_month, end_of_month))
    query = query.filter(or_(Sale.sale_type != 'credit', Sale.status == 'paid'))
    if shop_id:
        query = query.filter(Sale.shop_id == shop_id)
        
    sales = query.options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc()).all()
    return _serialize_sales_bulk(sales)

def get_current_years_sales(shop_id=None):
    now = get_local_time()
    start_of_year = datetime(now.year, 1, 1)
    end_of_year = datetime(now.year, 12, 31, 23, 59, 59, 999999)

    query = Sale.query.filter(Sale.created_at.between(start_of_year, end_of_year))
    query = query.filter(or_(Sale.sale_type != 'credit', Sale.status == 'paid'))
    if shop_id:
        query = query.filter(Sale.shop_id == shop_id)
        
    sales = query.options(selectinload(Sale.items)).order_by(Sale.created_at.desc(), Sale.id.desc()).all()
    return _serialize_sales_bulk(sales)

def delete_sale(sale_id, user_id):
    try:
        sale = Sale.query.get(sale_id)
        if not sale:
            raise ValueError("Sale not found")

        with db.session.begin_nested():
            cylinder_returns = SaleCylinderReturn.query.filter_by(sale_id=sale_id).all()
            for ret in cylinder_returns:
                if ret.returned_qty:
                    empty_stock = EmptyCylinderStock.query.filter_by(shop_id=sale.shop_id, item_id=ret.item_id).first()
                    if empty_stock and empty_stock.quantity >= ret.returned_qty:
                        empty_stock.quantity -= ret.returned_qty
                        empty_stock.updated_at = get_local_time()
                db.session.delete(ret)

            for item in sale.items:
                stock = ShopStock.query.filter_by(shop_id=sale.shop_id, item_id=item.item_id).first()
                if stock:
                    stock.quantity += item.qty
                    stock.updated_at = get_local_time()
                
                if item.batch_id:
                    batch = StockBatch.query.get(item.batch_id)
                    if batch:
                        batch.remaining_qty += item.qty
                    
                    mv = StockMovement(
                        shop_id=sale.shop_id, 
                        item_id=item.item_id, 
                        movement_type="adjustment", 
                        qty=item.qty, 
                        user_id=user_id, 
                        reference=f"Sale {sale_id} deleted (restored to batch {item.batch_id})",
                        created_at=get_local_time()
                    )
                    db.session.add(mv)

            SaleItem.query.filter_by(sale_id=sale_id).delete()
            SalePayment.query.filter_by(sale_id=sale_id).delete()
            db.session.delete(sale)

        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        raise e

def update_sale(sale_id, user_id, items, payment_type, sale_type="standard", customer_name=None, customer_phone=None):
    try:
        ensure_sale_type_column()
        normalized_sale_type = normalize_sale_type(sale_type)
        customer_name = str(customer_name or "").strip() or None
        customer_phone = str(customer_phone or "").strip() or None
        if normalized_sale_type == "credit" and (not customer_name or not customer_phone):
            raise ValueError("Customer name and phone number are required for a credit sale.")
        sale = Sale.query.get(sale_id)
        if not sale:
            raise ValueError("Sale not found")

        with db.session.begin_nested():
            # 1. Revert old stock levels
            for item in sale.items:
                stock = ShopStock.query.filter_by(shop_id=sale.shop_id, item_id=item.item_id).first()
                if stock:
                    stock.quantity += item.qty
                    stock.updated_at = get_local_time()
                
                # Restore to batch if linked
                if item.batch_id:
                    batch = StockBatch.query.get(item.batch_id)
                    if batch:
                        batch.remaining_qty += item.qty
                
                # Record adjustment movement for reversal
                mv_rev = StockMovement(
                    shop_id=sale.shop_id, 
                    item_id=item.item_id, 
                    movement_type="adjustment", 
                    qty=item.qty, 
                    user_id=user_id, 
                    reference=f"Sale {sale_id} updated (reversal)",
                    created_at=get_local_time()
                )
                db.session.add(mv_rev)

            # 2. Delete old sale items
            SaleItem.query.filter_by(sale_id=sale_id).delete()

            # 3. Process new items with FIFO
            total = 0
            new_sale_items = []
            for it in items:
                item_id = it.get("item_id")
                qty_to_sell = int(it.get("qty", 1))
                unit_price = float(it.get("unit_price"))

                stock = ShopStock.query.filter_by(shop_id=sale.shop_id, item_id=item_id).first()
                if not stock or stock.quantity < qty_to_sell:
                    raise ValueError(f"Insufficient stock for item {item_id}")
                
                stock.quantity -= qty_to_sell
                stock.updated_at = get_local_time()
                
                # FIFO Logic: Consume from batches
                remaining_to_pull = qty_to_sell
                while remaining_to_pull > 0:
                    batch = StockBatch.query.filter_by(shop_id=sale.shop_id, item_id=item_id) \
                        .filter(StockBatch.remaining_qty > 0) \
                        .order_by(StockBatch.created_at.asc()).first()
                    
                    if not batch:
                        si = SaleItem(sale_id=sale.id, item_id=item_id, qty=remaining_to_pull, unit_price=unit_price, unit_cost=stock.buy_price)
                        new_sale_items.append(si)
                        remaining_to_pull = 0
                    else:
                        pull_qty = min(remaining_to_pull, batch.remaining_qty)
                        batch.remaining_qty -= pull_qty
                        remaining_to_pull -= pull_qty
                        
                        si = SaleItem(
                            sale_id=sale.id, 
                            item_id=item_id, 
                            qty=pull_qty, 
                            unit_price=unit_price, 
                            unit_cost=batch.buy_price,
                            batch_id=batch.id
                        )
                        new_sale_items.append(si)
                
                mv = StockMovement(
                    shop_id=sale.shop_id, 
                    item_id=item_id, 
                    movement_type="sale", 
                    qty=-qty_to_sell, 
                    user_id=user_id, 
                    reference=f"Sale {sale_id} updated",
                    created_at=get_local_time()
                )
                db.session.add(mv)
                
                total += unit_price * qty_to_sell

            # 4. Update sale record
            sale.total_amount = total
            sale.payment_type = payment_type
            sale.sale_type = normalized_sale_type
            sale.customer_name = customer_name
            sale.customer_phone = customer_phone
            db.session.add_all(new_sale_items)

        # 5. Regenerate receipt
        shop = Shop.query.get(sale.shop_id)
        attendant = User.query.get(sale.user_id)
        
        receipt_html = _generate_sale_receipt_html(sale, shop, attendant, new_sale_items)
        receipt = create_receipt(payload=receipt_html)
        sale.receipt_uuid = receipt.uuid

        db.session.commit()
        return sale
    except Exception as e:
        db.session.rollback()
        raise e
