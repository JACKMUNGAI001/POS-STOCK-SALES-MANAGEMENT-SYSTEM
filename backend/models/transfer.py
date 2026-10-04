from datetime import datetime
from utils.timezone_utils import get_local_time
from extensions import db

class Transfer(db.Model):
    __tablename__ = "transfers"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    from_shop_id = db.Column(db.Integer, index=True)
    to_shop_id = db.Column(db.Integer, index=True)
    created_by = db.Column(db.Integer)
    status = db.Column(db.String(20), default="completed")  # requested, approved, completed
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=get_local_time, index=True)

class TransferItem(db.Model):
    __tablename__ = "transfer_items"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    transfer_id = db.Column(db.Integer, db.ForeignKey("transfers.id"))
    item_id = db.Column(db.Integer)
    qty = db.Column(db.Integer)
