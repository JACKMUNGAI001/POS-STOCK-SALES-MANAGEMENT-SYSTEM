"""remove deposit feature

Revision ID: c2f091ab3e5d
Revises: 9f4a6d8c1b2e
Create Date: 2026-10-05 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c2f091ab3e5d"
down_revision = "9f4a6d8c1b2e"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("deposit_payments")
    op.drop_table("deposit_sales")


def downgrade():
    op.create_table(
        "deposit_sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=True),
        sa.Column("uuid", sa.String(length=64), nullable=True),
        sa.Column("shop_id", sa.Integer(), nullable=True),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("buyer_name", sa.String(length=255), nullable=True),
        sa.Column("buyer_phone", sa.String(length=50), nullable=True),
        sa.Column("selling_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["item_id"], ["items.id"], name="fk_deposit_sales_item_id"
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"], ["tenants.id"], name="fk_deposit_sales_tenant_id_tenants"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index("ix_deposit_sales_created_at", "deposit_sales", ["created_at"])
    op.create_index("ix_deposit_sales_shop_id", "deposit_sales", ["shop_id"])
    op.create_index("ix_deposit_sales_tenant_id", "deposit_sales", ["tenant_id"])

    op.create_table(
        "deposit_payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=True),
        sa.Column("deposit_id", sa.Integer(), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("recorded_by", sa.Integer(), nullable=True),
        sa.Column("receipt_uuid", sa.String(length=64), nullable=True),
        sa.Column("paid_on", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["deposit_id"], ["deposit_sales.id"]),
        sa.ForeignKeyConstraint(
            ["receipt_uuid"],
            ["receipts.uuid"],
            name="fk_deposit_payments_receipt_uuid",
        ),
        sa.ForeignKeyConstraint(
            ["tenant_id"], ["tenants.id"], name="fk_deposit_payments_tenant_id_tenants"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_deposit_payments_paid_on", "deposit_payments", ["paid_on"])
    op.create_index(
        "ix_deposit_payments_receipt_uuid", "deposit_payments", ["receipt_uuid"]
    )
    op.create_index(
        "ix_deposit_payments_tenant_id", "deposit_payments", ["tenant_id"]
    )
