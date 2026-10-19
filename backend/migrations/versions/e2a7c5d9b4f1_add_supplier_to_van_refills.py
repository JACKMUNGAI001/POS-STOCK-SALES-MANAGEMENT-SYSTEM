"""link van depot refills to suppliers

Revision ID: e2a7c5d9b4f1
Revises: 9c41d6a0b217
Create Date: 2026-10-19
"""
from alembic import op
import sqlalchemy as sa


revision = "e2a7c5d9b4f1"
down_revision = "9c41d6a0b217"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("van_stock_movements") as batch_op:
        batch_op.add_column(sa.Column("supplier_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_van_stock_movements_supplier_id_suppliers",
            "suppliers",
            ["supplier_id"],
            ["id"],
        )
        batch_op.create_index("ix_van_stock_movements_supplier_id", ["supplier_id"])


def downgrade():
    with op.batch_alter_table("van_stock_movements") as batch_op:
        batch_op.drop_index("ix_van_stock_movements_supplier_id")
        batch_op.drop_constraint("fk_van_stock_movements_supplier_id_suppliers", type_="foreignkey")
        batch_op.drop_column("supplier_id")
