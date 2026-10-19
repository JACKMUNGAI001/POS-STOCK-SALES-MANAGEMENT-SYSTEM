"""add customer profiles for van sales

Revision ID: f31a9b6c2d80
Revises: e2a7c5d9b4f1
Create Date: 2026-10-19
"""
from datetime import datetime
import re

from alembic import op
import sqlalchemy as sa


revision = "f31a9b6c2d80"
down_revision = "e2a7c5d9b4f1"
branch_labels = None
depends_on = None


def _normalize_phone(value):
    compact = re.sub(r"[^0-9+]", "", str(value or ""))
    return ("+" if compact.startswith("+") else "") + compact.replace("+", "")


def upgrade():
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("normalized_phone", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "normalized_phone", name="uq_customer_tenant_phone"),
    )
    op.create_index("ix_customers_tenant_id", "customers", ["tenant_id"])
    with op.batch_alter_table("sales") as batch_op:
        batch_op.add_column(sa.Column("customer_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_sales_customer_id_customers", "customers", ["customer_id"], ["id"])
        batch_op.create_index("ix_sales_customer_id", ["customer_id"])

    bind = op.get_bind()
    sales = sa.table(
        "sales",
        sa.column("id", sa.Integer()),
        sa.column("tenant_id", sa.Integer()),
        sa.column("operation_type", sa.String()),
        sa.column("customer_name", sa.String()),
        sa.column("customer_phone", sa.String()),
        sa.column("customer_id", sa.Integer()),
    )
    customers = sa.table(
        "customers",
        sa.column("id", sa.Integer()),
        sa.column("tenant_id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("phone", sa.String()),
        sa.column("normalized_phone", sa.String()),
        sa.column("created_at", sa.DateTime()),
    )
    existing_sales = bind.execute(
        sa.select(sales.c.id, sales.c.tenant_id, sales.c.customer_name, sales.c.customer_phone)
        .where(sales.c.operation_type == "van")
        .where(sales.c.tenant_id.is_not(None))
        .where(sales.c.customer_name.is_not(None))
        .where(sales.c.customer_phone.is_not(None))
    ).mappings()

    for sale in existing_sales:
        normalized_phone = _normalize_phone(sale["customer_phone"])
        if not normalized_phone:
            continue
        customer_id = bind.execute(
            sa.select(customers.c.id).where(
                customers.c.tenant_id == sale["tenant_id"],
                customers.c.normalized_phone == normalized_phone,
            )
        ).scalar_one_or_none()
        if customer_id is None:
            bind.execute(customers.insert().values(
                tenant_id=sale["tenant_id"],
                name=sale["customer_name"],
                phone=sale["customer_phone"],
                normalized_phone=normalized_phone,
                created_at=datetime.utcnow(),
            ))
            customer_id = bind.execute(
                sa.select(customers.c.id).where(
                    customers.c.tenant_id == sale["tenant_id"],
                    customers.c.normalized_phone == normalized_phone,
                )
            ).scalar_one()
        bind.execute(sales.update().where(sales.c.id == sale["id"]).values(customer_id=customer_id))


def downgrade():
    with op.batch_alter_table("sales") as batch_op:
        batch_op.drop_index("ix_sales_customer_id")
        batch_op.drop_constraint("fk_sales_customer_id_customers", type_="foreignkey")
        batch_op.drop_column("customer_id")
    op.drop_index("ix_customers_tenant_id", table_name="customers")
    op.drop_table("customers")
