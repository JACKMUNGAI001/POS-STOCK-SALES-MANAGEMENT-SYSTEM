import uuid
from datetime import datetime, timedelta
from extensions import db
from models.deposit import DepositSale, DepositPayment
from models.sale import Sale, SaleItem
from models.stock import ShopStock, StockMovement
from models.shop import Shop
from models.user import User
from models.product import Item
from services.receipt_service import create_receipt
from utils.timezone_utils import get_local_time

def _generate_deposit_receipt_html(deposit, shop, attendant, payment, total_paid, balance):
    attendant_name = attendant.name if attendant else "N/A"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>GAS POS SYSTEM - Deposit Receipt</title>
        <style>
            body {{ font-family: sans-serif; }}
            .receipt-container {{ width: 300px; margin: auto; border: 1px solid #ccc; padding: 10px; }}
            .header {{ text-align: center; margin-bottom: 20px; }}
            .header h1 {{ margin: 0; font-size: 24px; text-transform: uppercase; }}
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <div class="header">
                <h1 style="color: #1a56db; font-size: 28px; font-weight: 900; margin-bottom: 2px;">GAS POS SYSTEM</h1>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">{shop.name}</p>
                <p style="margin-top: 5px; font-size: 12px; font-weight: 800; border-top: 1px solid #000; padding-top: 5px; display: inline-block;">DEPOSIT PAYMENT RECEIPT</p>
            </div>
            <p><strong>Customer:</strong> {deposit.buyer_name}</p>
            <p><strong>Item:</strong> {deposit.item.name if deposit.item else 'N/A'}</p>
            <p><strong>Total Price:</strong> {deposit.selling_price}</p>
            <hr/>
            <p><strong>Amount Paid:</strong> {payment.amount}</p>
            <p><strong>Payment Method:</strong> {'M-PESA' if payment.payment_method == 'mobile_money' else payment.payment_method}</p>
            <p><strong>Date:</strong> {payment.paid_on.strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p><strong>Attendant:</strong> {attendant_name}</p>
            <hr/>
            <p><strong>Total Paid to Date:</strong> {total_paid}</p>
            <p><strong>Balance:</strong> {balance}</p>
            <p><strong>Status:</strong> {deposit.status}</p>
        </div>
    </body>
    </html>
    """
    return html

def create_deposit(shop_id, item_id, buyer_name, buyer_phone, selling_price, created_by=None, amount=0):
    try:
        dep = DepositSale(
            shop_id=shop_id,
            item_id=item_id,
            buyer_name=buyer_name,
            buyer_phone=buyer_phone,
            selling_price=selling_price,
            created_by=created_by,
            status="active"
        )
        db.session.add(dep)
        db.session.commit() # Commit first to ensure ID exists

        receipt_uuid = None
        if amount and float(amount) > 0:
            payment = add_deposit_payment(dep.id, amount, created_by)
            receipt_uuid = payment.receipt_uuid

        return dep, receipt_uuid
    except Exception as e:
        db.session.rollback()
        raise e

def add_deposit_payment(deposit_id, amount, recorded_by, payment_method="mobile_money"):
    try:
        dep = DepositSale.query.get(deposit_id)
        if not dep:
            raise ValueError("Deposit record not found")
        
        # Ensure recorded_by is an integer if possible
        if recorded_by is not None:
            try:
                recorded_by = int(recorded_by)
            except (ValueError, TypeError):
                recorded_by = dep.created_by

        payment = None
        
        with db.session.begin_nested():
            payment = DepositPayment(
                deposit_id=deposit_id,
                amount=amount,
                payment_method=payment_method,
                recorded_by=recorded_by
            )
            db.session.add(payment)
            db.session.flush()

            # Calculate totals
            all_payments = DepositPayment.query.filter_by(deposit_id=deposit_id).all()
            total_paid = sum(float(p.amount) for p in all_payments)
            balance = float(dep.selling_price) - total_paid

            if balance <= 0:
                dep.status = "complete"
                # Convert to a real sale to deduct stock
                stock = ShopStock.query.filter_by(shop_id=dep.shop_id, item_id=dep.item_id).first()
                if not stock or stock.quantity < 1:
                    raise ValueError("Insufficient stock to complete this deposit sale")
                
                stock.quantity -= 1
                
                sale = Sale(shop_id=dep.shop_id, user_id=recorded_by, total_amount=dep.selling_price, payment_type=payment_method)
                db.session.add(sale)
                db.session.flush()

                si = SaleItem(sale_id=sale.id, item_id=dep.item_id, qty=1, unit_price=dep.selling_price, unit_cost=stock.buy_price)
                db.session.add(si)

                mv = StockMovement(shop_id=dep.shop_id, item_id=dep.item_id, movement_type="sale", qty=-1, user_id=recorded_by, reference=f"Deposit Complete {dep.id}")
                db.session.add(mv)

        # After payment is recorded, generate receipt
        shop = Shop.query.get(dep.shop_id)
        attendant = User.query.get(recorded_by) if recorded_by else None
        all_payments = DepositPayment.query.filter_by(deposit_id=deposit_id).all()
        total_paid = sum(float(p.amount) for p in all_payments)
        balance = float(dep.selling_price) - total_paid

        receipt_html = _generate_deposit_receipt_html(dep, shop, attendant, payment, total_paid, balance)
        receipt = create_receipt(payload=receipt_html)
        payment.receipt_uuid = receipt.uuid

        db.session.commit()
        return payment
    except Exception as e:
        db.session.rollback()
        raise e

def get_deposit_customers_count(shop_id=None):
    query = DepositSale.query.filter_by(status='active')
    if shop_id:
        query = query.filter_by(shop_id=shop_id)
    return {"count": query.count()}

def get_deposit_customers(shop_id=None):
    query = DepositSale.query.filter_by(status='active')
    if shop_id:
        query = query.filter_by(shop_id=shop_id)
    
    customers = query.all()
    
    deposit_ids = [c.id for c in customers]
    shop_ids = {c.shop_id for c in customers if c.shop_id}
    
    payments = DepositPayment.query.filter(DepositPayment.deposit_id.in_(deposit_ids)).all()
    payments_by_deposit = {}
    for p in payments:
        payments_by_deposit.setdefault(p.deposit_id, []).append(p)
    
    shops = {s.id: s for s in Shop.query.filter(Shop.id.in_(shop_ids)).all()} if shop_ids else {}
    
    out = []
    for c in customers:
        all_payments = payments_by_deposit.get(c.id, [])
        total_paid = sum(float(p.amount) for p in all_payments)
        shop = shops.get(c.shop_id)
        out.append({
            "id": c.id,
            "buyer_name": c.buyer_name,
            "buyer_phone": c.buyer_phone,
            "item_name": c.item.name if c.item else "N/A",
            "selling_price": float(c.selling_price),
            "total_paid": total_paid,
            "balance": float(c.selling_price) - total_paid,
            "shop_name": shop.name if shop else "N/A"
        })
    return out

def _serialize_payment(p):
    dep = DepositSale.query.get(p.deposit_id)
    shop = Shop.query.get(dep.shop_id) if dep else None
    return {
        "id": p.id,
        "deposit_id": p.deposit_id,
        "buyer_name": dep.buyer_name if dep else "N/A",
        "item_name": dep.item.name if (dep and dep.item) else "N/A",
        "shop_name": shop.name if shop else "N/A",
        "amount": float(p.amount),
        "payment_method": p.payment_method,
        "receipt_uuid": p.receipt_uuid,
        "paid_on": p.paid_on.isoformat()
    }

def _serialize_deposit(dep, shop=None, all_payments=None):
    if shop is None:
        shop = Shop.query.get(dep.shop_id)
    if all_payments is None:
        all_payments = DepositPayment.query.filter_by(deposit_id=dep.id).all()
    total_paid = sum(float(p.amount) for p in all_payments)
    
    payments_summary = []
    for p in all_payments:
        payments_summary.append({
            "amount": float(p.amount),
            "paid_on": p.paid_on.isoformat(),
            "receipt_uuid": p.receipt_uuid
        })

    return {
        "id": dep.id,
        "uuid": dep.uuid,
        "buyer_name": dep.buyer_name,
        "buyer_phone": dep.buyer_phone,
        "item_id": dep.item_id,
        "item_name": dep.item.name if dep.item else "N/A",
        "selling_price": float(dep.selling_price),
        "total_paid": total_paid,
        "balance": float(dep.selling_price) - total_paid,
        "status": dep.status,
        "shop_name": shop.name if shop else "N/A",
        "created_at": dep.created_at.isoformat(),
        "payments": payments_summary
    }

def _serialize_deposits_bulk(deposits):
    shop_ids = {d.shop_id for d in deposits if d.shop_id}
    deposit_ids = [d.id for d in deposits]
    
    shops = {s.id: s for s in Shop.query.filter(Shop.id.in_(shop_ids)).all()} if shop_ids else {}
    payments = DepositPayment.query.filter(DepositPayment.deposit_id.in_(deposit_ids)).all()
    payments_by_deposit = {}
    for p in payments:
        payments_by_deposit.setdefault(p.deposit_id, []).append(p)
    
    return [_serialize_deposit(d, shop=shops.get(d.shop_id), all_payments=payments_by_deposit.get(d.id)) for d in deposits]

def get_all_deposits():
    deposits = DepositSale.query.order_by(DepositSale.created_at.desc()).all()
    return _serialize_deposits_bulk(deposits)

def get_deposits_by_shop_id(shop_id):
    deposits = DepositSale.query.filter_by(shop_id=shop_id).order_by(DepositSale.created_at.desc()).all()
    return _serialize_deposits_bulk(deposits)

def get_todays_deposit_payments(shop_id=None):
    today = get_local_time().date()
    start_of_day = datetime(today.year, today.month, today.day)
    end_of_day = start_of_day + timedelta(days=1, microseconds=-1)
    
    query = DepositSale.query.join(DepositPayment).filter(DepositPayment.paid_on.between(start_of_day, end_of_day)).distinct()
    if shop_id:
        query = query.filter(DepositSale.shop_id == shop_id)
    
    deposits = query.all()
    return _serialize_deposits_bulk(deposits)

def get_weeks_deposit_payments(shop_id=None):
    now = get_local_time()
    start_of_week = datetime.combine(now.date() - timedelta(days=now.weekday()), datetime.min.time())
    end_of_week = start_of_week + timedelta(days=7, microseconds=-1)

    query = DepositSale.query.join(DepositPayment).filter(DepositPayment.paid_on.between(start_of_week, end_of_week)).distinct()
    if shop_id:
        query = query.filter(DepositSale.shop_id == shop_id)
        
    deposits = query.all()
    return _serialize_deposits_bulk(deposits)

def get_months_deposit_payments(shop_id=None):
    now = get_local_time()
    start_of_month = datetime(now.year, now.month, 1)
    if now.month == 12:
        end_of_month = datetime(now.year + 1, 1, 1) - timedelta(microseconds=1)
    else:
        end_of_month = datetime(now.year, now.month + 1, 1) - timedelta(microseconds=1)

    query = DepositSale.query.join(DepositPayment).filter(DepositPayment.paid_on.between(start_of_month, end_of_month)).distinct()
    if shop_id:
        query = query.filter(DepositSale.shop_id == shop_id)
        
    deposits = query.all()
    return _serialize_deposits_bulk(deposits)

def get_years_deposit_payments(shop_id=None):
    now = get_local_time()
    start_of_year = datetime(now.year, 1, 1)
    end_of_year = datetime(now.year, 12, 31, 23, 59, 59, 999999)

    query = DepositSale.query.join(DepositPayment).filter(DepositPayment.paid_on.between(start_of_year, end_of_year)).distinct()
    if shop_id:
        query = query.filter(DepositSale.shop_id == shop_id)
        
    deposits = query.all()
    return _serialize_deposits_bulk(deposits)

def delete_deposit(deposit_id):
    dep = DepositSale.query.get(deposit_id)
    if not dep:
        raise ValueError("Deposit record not found")
    
    # Delete associated payments first
    DepositPayment.query.filter_by(deposit_id=deposit_id).delete()
    db.session.delete(dep)
    db.session.commit()
    return True

def update_deposit(deposit_id, buyer_name, buyer_phone, selling_price, item_id):
    try:
        dep = DepositSale.query.get(deposit_id)
        if not dep:
            raise ValueError("Deposit record not found")
        
        dep.buyer_name = buyer_name
        dep.buyer_phone = buyer_phone
        dep.selling_price = float(selling_price)
        dep.item_id = item_id
        
        db.session.commit()
        return dep
    except Exception as e:
        db.session.rollback()
        raise e
