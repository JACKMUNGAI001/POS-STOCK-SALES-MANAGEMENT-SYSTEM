from datetime import datetime
from utils.timezone_utils import get_local_time
from extensions import db

supplier_items = db.Table('supplier_items',
    db.Column('supplier_id', db.Integer, db.ForeignKey('suppliers.id'), primary_key=True),
    db.Column('item_id', db.Integer, db.ForeignKey('items.id'), primary_key=True)
)

class Supplier(db.Model):
    __tablename__ = "suppliers"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    name = db.Column(db.String(255), nullable=False)
    contact_person = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(255))
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_local_time)

    supplied_products = db.relationship('Item', secondary=supplier_items, backref=db.backref('suppliers', lazy='dynamic'))

class SupplierInvoice(db.Model):
    __tablename__ = "supplier_invoices"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False)
    invoice_number = db.Column(db.String(100), unique=True, nullable=False)
    total_amount = db.Column(db.Numeric(12,2), nullable=False)
    amount_paid = db.Column(db.Numeric(12,2), default=0)
    status = db.Column(db.String(50), default="Pending") # Pending, Partial, Paid
    received_date = db.Column(db.DateTime, default=get_local_time)
    due_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_local_time)

    items = db.relationship("SupplierInvoiceItem", backref="invoice", lazy=True, cascade="all, delete-orphan")
    supplier = db.relationship("Supplier", backref=db.backref("invoices", lazy=True))

class SupplierInvoiceItem(db.Model):
    __tablename__ = "supplier_invoice_items"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("supplier_invoices.id"), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(12,2), nullable=False)
    total_cost = db.Column(db.Numeric(12,2), nullable=False)
    created_at = db.Column(db.DateTime, default=get_local_time)

    item = db.relationship("Item", backref=db.backref("supplied_items", lazy=True))
    shop = db.relationship("Shop", backref=db.backref("supplied_items", lazy=True, cascade="all, delete-orphan"))

class SupplierInvoicePayment(db.Model):
    __tablename__ = "supplier_invoice_payments"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("supplier_invoices.id"), nullable=False)
    amount = db.Column(db.Numeric(12,2), nullable=False)
    payment_method = db.Column(db.String(50), default="mobile_money")
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_local_time)

    invoice_rel = db.relationship("SupplierInvoice", backref=db.backref("payments", lazy=True, cascade="all, delete-orphan"))
