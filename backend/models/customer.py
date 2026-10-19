from extensions import db
from utils.timezone_utils import get_local_time


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    normalized_phone = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=get_local_time, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("tenant_id", "normalized_phone", name="uq_customer_tenant_phone"),
    )
