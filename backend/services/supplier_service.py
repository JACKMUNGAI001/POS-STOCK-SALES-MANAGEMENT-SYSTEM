from extensions import db
from models.supplier import Supplier, SupplierInvoice, SupplierInvoiceItem, SupplierInvoicePayment
from models.stock import ShopStock, StockMovement, StockBatch
from models.product import Item
from datetime import datetime
from utils.timezone_utils import get_local_time
from utils.helpers import calculate_total_buy_price
from sqlalchemy import or_

def create_supplier(name, contact_person=None, phone=None, email=None, address=None, item_ids=None, tenant_id=None):
    s = Supplier(tenant_id=tenant_id, name=name, contact_person=contact_person, phone=phone, email=email, address=address)
    if item_ids:
        items = Item.query.filter(Item.id.in_(item_ids)).all()
        s.supplied_products = items
    db.session.add(s)
    db.session.commit()
    return s

def list_suppliers(tenant_id=None):
    query = Supplier.query
    if tenant_id is not None:
        query = query.filter(or_(Supplier.tenant_id == tenant_id, Supplier.tenant_id.is_(None)))
    return query.order_by(Supplier.name.asc()).all()

def update_supplier(supplier_id, **kwargs):
    s = Supplier.query.get(supplier_id)
    if not s:
        return None
    
    item_ids = kwargs.pop('item_ids', None)
    if item_ids is not None:
        items = Item.query.filter(Item.id.in_(item_ids)).all()
        s.supplied_products = items

    for k, v in kwargs.items():
        if hasattr(s, k):
            setattr(s, k, v)
    db.session.commit()
    return s

def delete_supplier(supplier_id):
    s = Supplier.query.get(supplier_id)
    if not s:
        return False
    db.session.delete(s)
    db.session.commit()
    return True

def create_supplier_invoice(supplier_id, invoice_number, items_data, status="Pending", received_date=None, due_date=None, notes=None, user_id=None):
    total_amount = 0
    
    if received_date and isinstance(received_date, str) and received_date.strip():
        received_date = datetime.strptime(received_date, '%Y-%m-%d')
    else:
        received_date = get_local_time()

    if due_date and isinstance(due_date, str) and due_date.strip():
        due_date = datetime.strptime(due_date, '%Y-%m-%d')
    else:
        due_date = None

    inv = SupplierInvoice(
        supplier_id=supplier_id,
        invoice_number=invoice_number,
        total_amount=total_amount,
        status=status,
        received_date=received_date,
        due_date=due_date,
        notes=notes
    )
    db.session.add(inv)
    db.session.flush()

    for item_data in items_data:
        item_id = item_data['item_id']
        qty = item_data['quantity']
        unit_cost = item_data['unit_cost']
        price_unit = item_data.get('price_unit')
        item_shop_id = item_data.get('shop_id')
        if not item_shop_id:
            raise ValueError(f"Shop ID is required for all items")
            
        item = Item.query.get(item_id)
        category_name = None
        if item and item.category_id:
            from models.product import Category
            category = Category.query.get(item.category_id)
            category_name = category.name if category else None

        effective_unit_cost = calculate_total_buy_price(
            item=item,
            price=unit_cost,
            price_unit=price_unit,
            category_name=category_name,
        )
        total_amount += float(effective_unit_cost) * int(qty)
        total_cost = float(effective_unit_cost) * int(qty)

        inv_item = SupplierInvoiceItem(
            invoice_id=inv.id,
            item_id=item_id,
            shop_id=item_shop_id,
            quantity=qty,
            unit_cost=effective_unit_cost,
            total_cost=total_cost
        )
        db.session.add(inv_item)

        # Update Stock in the specific Shop
        stock = ShopStock.query.filter_by(shop_id=item_shop_id, item_id=item_id).first()
        if stock:
            stock.quantity += int(qty)
            stock.buy_price = effective_unit_cost
        else:
            stock = ShopStock(shop_id=item_shop_id, item_id=item_id, quantity=qty, buy_price=effective_unit_cost)
            db.session.add(stock)

        # Create Stock Batch for FIFO tracking
        batch = StockBatch(
            shop_id=item_shop_id,
            item_id=item_id,
            initial_qty=qty,
            remaining_qty=qty,
            buy_price=effective_unit_cost,
            source_type="purchase",
            source_id=inv_item.id
        )
        db.session.add(batch)

        # Create Stock Movement record for specific shop
        movement = StockMovement(
            shop_id=item_shop_id,
            item_id=item_id,
            movement_type="purchase_in",
            qty=qty,
            unit_buy_price=effective_unit_cost,
            user_id=user_id,
            reference=f"Supplier Invoice {invoice_number}"
        )
        db.session.add(movement)

    db.session.commit()
    return inv

def list_supplier_invoices():
    return SupplierInvoice.query.all()

def get_supplier_invoice(invoice_id):
    return SupplierInvoice.query.get(invoice_id)

def delete_supplier_invoice(invoice_id):
    inv = SupplierInvoice.query.get(invoice_id)
    if not inv:
        return False
    
    # Reverse stock changes for each item in the invoice
    for item in inv.items:
        # Check current stock
        stock = ShopStock.query.filter_by(shop_id=item.shop_id, item_id=item.item_id).first()
        if stock:
            # Check if we have enough stock to reverse
            if stock.quantity < item.quantity:
                # We can either prevent deletion or allow it to go negative. 
                # Preventing is safer to avoid data inconsistency.
                raise ValueError(f"Cannot delete invoice: Stock for {item.item.name} in {item.shop.name} is insufficient to reverse the purchase.")
            
            stock.quantity -= item.quantity
        
        # Remove the StockBatch associated with this invoice item
        # source_type="purchase" and source_id=item.id
        batch = StockBatch.query.filter_by(source_type="purchase", source_id=item.id).first()
        if batch:
            # If the batch has been partially or fully sold, reversing it might be complex.
            # But for simplicity, we delete it.
            db.session.delete(batch)

        # Remove the StockMovement associated with this invoice
        # It was created with reference="Supplier Invoice {invoice_number}"
        movement = StockMovement.query.filter_by(
            shop_id=item.shop_id, 
            item_id=item.item_id, 
            movement_type="purchase_in",
            reference=f"Supplier Invoice {inv.invoice_number}"
        ).first()
        if movement:
            db.session.delete(movement)

    # Payments and Items should be handled by cascade or manual deletion
    # Based on models/supplier.py, we might need manual deletion if cascades aren't set
    db.session.delete(inv)
    db.session.commit()
    return True

def update_invoice_status(invoice_id, status):
    inv = SupplierInvoice.query.get(invoice_id)
    if not inv:
        return None
    inv.status = status
    if status == "Paid":
        inv.amount_paid = inv.total_amount
    db.session.commit()
    return inv

def record_invoice_payment(invoice_id, amount, payment_method="mobile_money", notes=None):
    inv = SupplierInvoice.query.get(invoice_id)
    if not inv:
        raise ValueError("Invoice not found")
    
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        raise ValueError("Invalid amount")

    if amount <= 0:
        raise ValueError("Payment amount must be greater than zero")
    
    remaining = float(inv.total_amount) - float(inv.amount_paid or 0)
    if amount > remaining + 0.01:
        raise ValueError(f"Payment amount (KES {amount}) exceeds remaining balance (KES {remaining})")
    
    payment = SupplierInvoicePayment(
        invoice_id=invoice_id,
        amount=amount,
        payment_method=payment_method,
        notes=notes
    )
    db.session.add(payment)
    
    inv.amount_paid = float(inv.amount_paid or 0) + amount
    if float(inv.amount_paid) >= float(inv.total_amount) - 0.01:
        inv.status = "Paid"
    else:
        inv.status = "Partial"
        
    db.session.commit()
    return payment

def get_supplier_products(supplier_id):
    s = Supplier.query.get(supplier_id)
    if not s:
        return []
    # Sort supplied products by name
    return sorted(s.supplied_products, key=lambda x: x.name)
