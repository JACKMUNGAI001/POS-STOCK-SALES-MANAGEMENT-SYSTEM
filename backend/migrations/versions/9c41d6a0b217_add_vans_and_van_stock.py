"""add vans and van stock

Revision ID: 9c41d6a0b217
Revises: c2f091ab3e5d
Create Date: 2026-10-19
"""
from alembic import op
import sqlalchemy as sa

revision = '9c41d6a0b217'
down_revision = 'c2f091ab3e5d'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('sales', sa.Column('van_id', sa.Integer(), nullable=True))
    op.add_column('sales', sa.Column('operation_type', sa.String(length=20), server_default='shop', nullable=False))
    op.create_table('vans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('registration_number', sa.String(length=32), nullable=False),
        sa.Column('attendant_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['attendant_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'registration_number', name='uq_van_tenant_registration'),
        sa.UniqueConstraint('attendant_id'))
    op.create_index('ix_vans_tenant_id', 'vans', ['tenant_id'])
    with op.batch_alter_table('sales') as batch_op:
        batch_op.create_foreign_key('fk_sales_van_id_vans', 'vans', ['van_id'], ['id'])
        batch_op.create_index('ix_sales_van_id', ['van_id'])
    op.create_table('van_stocks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('van_id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('buy_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['van_id'], ['vans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('van_id', 'item_id', name='uq_van_item'))
    op.create_index('ix_van_stocks_tenant_id', 'van_stocks', ['tenant_id'])
    op.create_index('ix_van_stocks_van_id', 'van_stocks', ['van_id'])
    op.create_table('van_empty_cylinder_stocks',
        sa.Column('id', sa.Integer(), nullable=False), sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('van_id', sa.Integer(), nullable=False), sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['van_id'], ['vans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id']), sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('van_id', 'item_id', name='uq_van_empty_item'))
    op.create_index('ix_van_empty_cylinder_stocks_tenant_id', 'van_empty_cylinder_stocks', ['tenant_id'])
    op.create_index('ix_van_empty_cylinder_stocks_van_id', 'van_empty_cylinder_stocks', ['van_id'])
    op.create_table('van_transfers',
        sa.Column('id', sa.Integer(), nullable=False), sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('from_van_id', sa.Integer(), nullable=False), sa.Column('to_van_id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False), sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False), sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']), sa.ForeignKeyConstraint(['from_van_id'], ['vans.id']),
        sa.ForeignKeyConstraint(['to_van_id'], ['vans.id']), sa.ForeignKeyConstraint(['item_id'], ['items.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']), sa.PrimaryKeyConstraint('id'))
    op.create_index('ix_van_transfers_tenant_id', 'van_transfers', ['tenant_id'])
    op.create_table('van_stock_movements',
        sa.Column('id', sa.Integer(), nullable=False), sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('van_id', sa.Integer(), nullable=False), sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('movement_type', sa.String(length=32), nullable=False), sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_cost', sa.Numeric(precision=12, scale=2), nullable=False), sa.Column('reference', sa.String(length=255), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True), sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']), sa.ForeignKeyConstraint(['van_id'], ['vans.id']),
        sa.ForeignKeyConstraint(['item_id'], ['items.id']), sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'))
    op.create_index('ix_van_stock_movements_tenant_id', 'van_stock_movements', ['tenant_id'])
    op.create_index('ix_van_stock_movements_van_id', 'van_stock_movements', ['van_id'])

def downgrade():
    op.drop_index('ix_van_stock_movements_van_id', table_name='van_stock_movements')
    op.drop_index('ix_van_stock_movements_tenant_id', table_name='van_stock_movements')
    op.drop_table('van_stock_movements')
    op.drop_index('ix_van_transfers_tenant_id', table_name='van_transfers')
    op.drop_table('van_transfers')
    with op.batch_alter_table('sales') as batch_op:
        batch_op.drop_index('ix_sales_van_id')
        batch_op.drop_constraint('fk_sales_van_id_vans', type_='foreignkey')
        batch_op.drop_column('operation_type')
        batch_op.drop_column('van_id')
    op.drop_index('ix_van_empty_cylinder_stocks_van_id', table_name='van_empty_cylinder_stocks')
    op.drop_index('ix_van_empty_cylinder_stocks_tenant_id', table_name='van_empty_cylinder_stocks')
    op.drop_table('van_empty_cylinder_stocks')
    op.drop_index('ix_van_stocks_van_id', table_name='van_stocks')
    op.drop_index('ix_van_stocks_tenant_id', table_name='van_stocks')
    op.drop_table('van_stocks')
    op.drop_index('ix_vans_tenant_id', table_name='vans')
    op.drop_table('vans')
