import uuid
from datetime import datetime
from extensions import db
from utils.timezone_utils import get_local_time

class Receipt(db.Model):
    __tablename__ = "receipts"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    uuid = db.Column(db.String(64), default=lambda: str(uuid.uuid4()), unique=True)
    payload = db.Column(db.Text)  # JSON or HTML content
    created_at = db.Column(db.DateTime, default=get_local_time)
