from datetime import datetime
from sqlalchemy import text
import logging
from extensions import db
from utils.timezone_utils import get_local_time

class Sale(db.Model):
    __tablename__ = "sales"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    shop_id = db.Column(db.Integer, index=True)
    user_id = db.Column(db.Integer)
    total_amount = db.Column(db.Numeric(12,2))
    payment_type = db.Column(db.String(50))  # mobile_money
    sale_type = db.Column(db.String(50), nullable=False, default="standard", server_default="standard")
    customer_name = db.Column(db.String(255), nullable=True)
    customer_phone = db.Column(db.String(50), nullable=True)
    receipt_uuid = db.Column(db.String(64), db.ForeignKey("receipts.uuid"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=get_local_time, index=True)

    items = db.relationship("SaleItem", backref="sale", lazy=True)

    # Track payments and profit recognition for credit sales
    paid_amount = db.Column(db.Numeric(12,2), nullable=False, default=0)
    status = db.Column(db.String(32), nullable=False, default="unpaid", server_default="unpaid")
    profit_amount = db.Column(db.Numeric(12,2), nullable=False, default=0)
    profit_recognized = db.Column(db.Boolean, nullable=False, default=False, server_default="false")


class SalePayment(db.Model):
    __tablename__ = "sale_payments"

    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    recorded_by = db.Column(db.Integer, nullable=True)
    recorded_at = db.Column(db.DateTime, default=get_local_time, nullable=False)


logger = logging.getLogger(__name__)


def ensure_sale_type_column():
    """Bring older deployments forward until their Alembic migration runs.

    This remains as a safe compatibility bridge for Render deployments that
    start the web process before running ``flask db upgrade``.  The permanent
    schema change is captured in the matching Alembic migration.
    """
    try:
        inspector = db.inspect(db.engine)
        if inspector.has_table("sales"):
            columns = [column["name"] for column in inspector.get_columns("sales")]
            required_columns = {
                "sale_type": "VARCHAR(50) DEFAULT 'standard' NOT NULL",
                "customer_name": "VARCHAR(255)",
                "customer_phone": "VARCHAR(50)",
                "paid_amount": "NUMERIC(12,2) DEFAULT 0 NOT NULL",
                "status": "VARCHAR(32) DEFAULT 'unpaid' NOT NULL",
                "profit_amount": "NUMERIC(12,2) DEFAULT 0 NOT NULL",
                # PostgreSQL does not accept SQLite's DEFAULT 0 for BOOLEAN.
                "profit_recognized": "BOOLEAN DEFAULT FALSE NOT NULL",
            }
            with db.engine.begin() as connection:
                for name, definition in required_columns.items():
                    if name not in columns:
                        connection.execute(text(f"ALTER TABLE sales ADD COLUMN {name} {definition}"))
            # Create through SQLAlchemy so the primary-key syntax works on
            # both SQLite (local development) and PostgreSQL (Render).
            SalePayment.__table__.create(bind=db.engine, checkfirst=True)
    except Exception:
        logger.exception("Unable to verify credit-sale database schema")
        raise


def ensure_cylinder_schema():
    """Create cylinder tables for live installs that have not run migrations yet."""
    try:
        from models.stock import EmptyCylinderStock, SaleCylinderReturn
        EmptyCylinderStock.__table__.create(bind=db.engine, checkfirst=True)
        SaleCylinderReturn.__table__.create(bind=db.engine, checkfirst=True)
    except Exception:
        logger.exception("Unable to verify cylinder database schema")
        raise

class SaleItem(db.Model):
    __tablename__ = "sale_items"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"))
    item_id = db.Column(db.Integer)
    qty = db.Column(db.Integer)
    unit_price = db.Column(db.Numeric(10,2))  # selling
    unit_cost = db.Column(db.Numeric(10,2))   # buying
    batch_id = db.Column(db.Integer, db.ForeignKey("stock_batches.id"), nullable=True)
