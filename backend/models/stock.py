from datetime import datetime
from extensions import db
from utils.timezone_utils import get_local_time

class ShopStock(db.Model):
    __tablename__ = "shop_stocks"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    quantity = db.Column(db.Integer, default=0)
    buy_price = db.Column(db.Numeric(10,2))
    updated_at = db.Column(db.DateTime, default=get_local_time)

    __table_args__ = (db.UniqueConstraint("shop_id", "item_id", name="uq_shop_item"),)

class StockBatch(db.Model):
    __tablename__ = "stock_batches"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False, index=True)
    initial_qty = db.Column(db.Integer, nullable=False)
    remaining_qty = db.Column(db.Integer, nullable=False, index=True)
    buy_price = db.Column(db.Numeric(12,2), nullable=False)
    source_type = db.Column(db.String(50))  # purchase, transfer, initial
    source_id = db.Column(db.Integer)       # ID of SupplierInvoiceItem, Transfer, etc.
    created_at = db.Column(db.DateTime, default=get_local_time, index=True)

class StockMovement(db.Model):
    __tablename__ = "stock_movements"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    shop_id = db.Column(db.Integer)
    item_id = db.Column(db.Integer)
    movement_type = db.Column(db.String(50))  # purchase_in, sale, transfer_in, transfer_out, adjustment, reserve
    qty = db.Column(db.Integer)
    unit_buy_price = db.Column(db.Numeric(10,2))
    unit_sell_price = db.Column(db.Numeric(10,2))
    user_id = db.Column(db.Integer)
    reference = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_local_time)

class EmptyCylinderStock(db.Model):
    __tablename__ = "empty_cylinder_stocks"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime, default=get_local_time)
    __table_args__ = (db.UniqueConstraint("shop_id", "item_id", name="uq_empty_cylinder_shop_item"),)

class SaleCylinderReturn(db.Model):
    """The cylinder exchange recorded for each gas item on a sale."""
    __tablename__ = "sale_cylinder_returns"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("items.id"), nullable=False, index=True)
    sold_qty = db.Column(db.Integer, nullable=False)
    returned_qty = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=get_local_time, nullable=False)
