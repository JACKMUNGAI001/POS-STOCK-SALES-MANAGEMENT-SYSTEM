"""add tenant scope to business tables

Revision ID: 9f4a6d8c1b2e
Revises: 7d2a8a2e1f5c
Create Date: 2026-10-04 16:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f4a6d8c1b2e'
down_revision = '7d2a8a2e1f5c'
branch_labels = None
depends_on = None


def _has_column(bind, table_name, column_name):
    inspector = sa.inspect(bind)
    return any(col['name'] == column_name for col in inspector.get_columns(table_name))


def upgrade():
    tables = [
        'categories',
        'items',
        'sales',
        'sale_items',
        'shop_stocks',
        'stock_batches',
        'stock_movements',
        'empty_cylinder_stocks',
        'sale_cylinder_returns',
        'expenses',
        'suppliers',
        'supplier_invoices',
        'supplier_invoice_items',
        'supplier_invoice_payments',
        'transfers',
        'transfer_items',
        'deposit_sales',
        'deposit_payments',
        'notifications',
        'receipts',
    ]

    for table_name in tables:
        if not _has_column(op.get_bind(), table_name, 'tenant_id'):
            with op.batch_alter_table(table_name, schema=None) as batch_op:
                batch_op.add_column(sa.Column('tenant_id', sa.Integer(), nullable=True))
                batch_op.create_index(batch_op.f(f'ix_{table_name}_tenant_id'), ['tenant_id'], unique=False)
                batch_op.create_foreign_key(
                    f'fk_{table_name}_tenant_id_tenants',
                    'tenants',
                    ['tenant_id'],
                    ['id']
                )


def downgrade():
    tables = [
        'categories',
        'items',
        'sales',
        'sale_items',
        'shop_stocks',
        'stock_batches',
        'stock_movements',
        'empty_cylinder_stocks',
        'sale_cylinder_returns',
        'expenses',
        'suppliers',
        'supplier_invoices',
        'supplier_invoice_items',
        'supplier_invoice_payments',
        'transfers',
        'transfer_items',
        'deposit_sales',
        'deposit_payments',
        'notifications',
        'receipts',
    ]

    for table_name in reversed(tables):
        if _has_column(op.get_bind(), table_name, 'tenant_id'):
            with op.batch_alter_table(table_name, schema=None) as batch_op:
                batch_op.drop_constraint(f'fk_{table_name}_tenant_id_tenants', type_='foreignkey')
                batch_op.drop_index(batch_op.f(f'ix_{table_name}_tenant_id'))
                batch_op.drop_column('tenant_id')
