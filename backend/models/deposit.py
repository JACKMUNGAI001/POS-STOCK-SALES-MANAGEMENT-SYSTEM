import uuid
from datetime import datetime
from extensions import db
from utils.timezone_utils import get_local_time

class DepositSale(db.Model):
    __tablename__ = "deposit_sales"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    uuid = db.Column(db.String(64), default=lambda: str(uuid.uuid4()), unique=True)
    shop_id = db.Column(db.Integer, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"))
    buyer_name = db.Column(db.String(255))
    buyer_phone = db.Column(db.String(50))
    selling_price = db.Column(db.Numeric(12,2))
    created_by = db.Column(db.Integer)
    status = db.Column(db.String(20), default="active") # active, complete, cancelled
    created_at = db.Column(db.DateTime, default=get_local_time, index=True)

    payments = db.relationship("DepositPayment", backref="deposit", lazy=True)
    item = db.relationship("Item", backref=db.backref("deposits", lazy=True))

class DepositPayment(db.Model):
    __tablename__ = "deposit_payments"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    deposit_id = db.Column(db.Integer, db.ForeignKey("deposit_sales.id"))
    amount = db.Column(db.Numeric(12,2))
    payment_method = db.Column(db.String(50))
    recorded_by = db.Column(db.Integer)
    receipt_uuid = db.Column(db.String(64), db.ForeignKey("receipts.uuid"), nullable=True, index=True)
    paid_on = db.Column(db.DateTime, default=get_local_time, index=True)
