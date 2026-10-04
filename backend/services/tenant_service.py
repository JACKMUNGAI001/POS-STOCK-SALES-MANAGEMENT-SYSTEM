import re

from extensions import db
from models.tenant import Tenant


def normalize_tenant_slug(value):
    if value is None:
        return None
    slug = str(value).strip().lower()
    slug = re.sub(r"[^a-z0-9]+", '-', slug)
    return slug.strip('-')


def get_or_create_default_tenant():
    tenant = Tenant.query.filter_by(slug='default').first()
    if tenant is None:
        tenant = Tenant(name='Default Tenant', slug='default')
        db.session.add(tenant)
        db.session.commit()
    return tenant


def create_tenant(name, slug=None):
    display_name = (name or '').strip()
    normalized_slug = normalize_tenant_slug(slug or display_name)
    if not display_name:
        raise ValueError('tenant name is required')
    if not normalized_slug:
        raise ValueError('tenant slug is required')

    if Tenant.query.filter_by(slug=normalized_slug).first():
        raise ValueError('tenant slug already exists')

    tenant = Tenant(name=display_name, slug=normalized_slug)
    db.session.add(tenant)
    db.session.commit()
    return tenant


def resolve_tenant_by_context(tenant_id=None, tenant_slug=None):
    inspector = db.inspect(db.engine)
    if not inspector.has_table('tenants'):
        return None

    if tenant_id is not None:
        return Tenant.query.get(tenant_id)
    if tenant_slug:
        slug = normalize_tenant_slug(tenant_slug)
        if not slug:
            return None
        return Tenant.query.filter_by(slug=slug).first()
    return None
