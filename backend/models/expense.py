from datetime import datetime
from extensions import db
from utils.timezone_utils import get_local_time

class Expense(db.Model):
    __tablename__ = "expenses"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    shop_id = db.Column(db.Integer, nullable=True, index=True)  # null = global
    title = db.Column(db.String(255))
    amount = db.Column(db.Numeric(12,2))
    description = db.Column(db.Text)
    recurring = db.Column(db.Boolean, default=False)
    frequency = db.Column(db.String(20))  # monthly
    created_at = db.Column(db.DateTime, default=get_local_time, index=True)
