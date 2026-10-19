from extensions import db
from utils.timezone_utils import get_local_time


class Van(db.Model):
    __tablename__ = "vans"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False, index=True)
    registration_number = db.Column(db.String(32), nullable=False)
    attendant_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, unique=True)
    created_at = db.Column(db.DateTime, default=get_local_time, nullable=False)
    __table_args__ = (db.UniqueConstraint("tenant_id", "registration_number", name="uq_van_tenant_registration"),)


class VanStock(db.Model):
    __tablename__ = "van_stocks"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False, index=True)
    van_id = db.Column(db.Integer, db.ForeignKey("vans.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    buy_price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    updated_at = db.Column(db.DateTime, default=get_local_time, nullable=False)
    __table_args__ = (db.UniqueConstraint("van_id", "item_id", name="uq_van_item"),)


class VanEmptyCylinderStock(db.Model):
    __tablename__ = "van_empty_cylinder_stocks"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False, index=True)
    van_id = db.Column(db.Integer, db.ForeignKey("vans.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    __table_args__ = (db.UniqueConstraint("van_id", "item_id", name="uq_van_empty_item"),)


class VanTransfer(db.Model):
    __tablename__ = "van_transfers"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False, index=True)
    from_van_id = db.Column(db.Integer, db.ForeignKey("vans.id"), nullable=False)
    to_van_id = db.Column(db.Integer, db.ForeignKey("vans.id"), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=get_local_time, nullable=False)


class VanStockMovement(db.Model):
    __tablename__ = "van_stock_movements"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False, index=True)
    van_id = db.Column(db.Integer, db.ForeignKey("vans.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    movement_type = db.Column(db.String(32), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    reference = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=get_local_time, nullable=False)
