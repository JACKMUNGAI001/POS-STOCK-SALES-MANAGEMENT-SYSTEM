"""add tenant support

Revision ID: 7d2a8a2e1f5c
Revises: e5f6a7b8c9d0
Create Date: 2026-10-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7d2a8a2e1f5c'
down_revision = 'f7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tenants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_tenants_slug')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tenant_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_tenant_id'), ['tenant_id'], unique=False)
        batch_op.create_foreign_key('fk_users_tenant_id_tenants', 'tenants', ['tenant_id'], ['id'])
    with op.batch_alter_table('shops', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tenant_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_shops_tenant_id'), ['tenant_id'], unique=False)
        batch_op.create_foreign_key('fk_shops_tenant_id_tenants', 'tenants', ['tenant_id'], ['id'])


def downgrade():
    with op.batch_alter_table('shops', schema=None) as batch_op:
        batch_op.drop_constraint('fk_shops_tenant_id_tenants', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_shops_tenant_id'))
        batch_op.drop_column('tenant_id')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('fk_users_tenant_id_tenants', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_users_tenant_id'))
        batch_op.drop_column('tenant_id')
    op.drop_table('tenants')
