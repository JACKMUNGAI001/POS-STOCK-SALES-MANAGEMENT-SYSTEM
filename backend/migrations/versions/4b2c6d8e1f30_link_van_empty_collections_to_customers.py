"""link collected van empties to customer profiles

Revision ID: 4b2c6d8e1f30
Revises: f31a9b6c2d80
Create Date: 2026-10-26
"""
from alembic import op
import sqlalchemy as sa


revision = "4b2c6d8e1f30"
down_revision = "f31a9b6c2d80"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("van_stock_movements") as batch_op:
        batch_op.add_column(sa.Column("customer_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_van_stock_movements_customer_id_customers",
            "customers",
            ["customer_id"],
            ["id"],
        )
        batch_op.create_index("ix_van_stock_movements_customer_id", ["customer_id"])


def downgrade():
    with op.batch_alter_table("van_stock_movements") as batch_op:
        batch_op.drop_index("ix_van_stock_movements_customer_id")
        batch_op.drop_constraint("fk_van_stock_movements_customer_id_customers", type_="foreignkey")
        batch_op.drop_column("customer_id")
