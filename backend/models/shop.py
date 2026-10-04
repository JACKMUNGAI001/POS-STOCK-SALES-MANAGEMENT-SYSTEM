from datetime import datetime
from extensions import db
from utils.timezone_utils import get_local_time

class Shop(db.Model):
    __tablename__ = "shops"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.Text)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=get_local_time)

    attendants = db.relationship("User", backref="shop", lazy=True)
    stocks = db.relationship("ShopStock", backref="shop", lazy=True, cascade="all, delete-orphan")
    batches = db.relationship("StockBatch", backref="shop", lazy=True, cascade="all, delete-orphan")
