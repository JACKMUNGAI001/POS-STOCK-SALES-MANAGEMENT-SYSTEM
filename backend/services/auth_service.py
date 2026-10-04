from extensions import db
from models.tenant import Tenant
from models.user import User
from models.shop import Shop
from services.tenant_service import get_or_create_default_tenant, create_tenant, resolve_tenant_by_context


def register_user(name, email, password, role="attendant", shop_id=None, tenant_id=None, tenant_name=None, tenant_slug=None):
    if role == "admin":
        if tenant_id is None:
            tenant = resolve_tenant_by_context(tenant_id=tenant_id, tenant_slug=tenant_slug)
            if tenant is None:
                tenant_name = (tenant_name or tenant_slug or "Default Tenant").strip()
                tenant_slug = tenant_slug or tenant_name.lower().replace(" ", "-")
                tenant = create_tenant(tenant_name, slug=tenant_slug)
        else:
            tenant = Tenant.query.get(tenant_id)
        if not tenant:
            raise ValueError("Tenant not found")
    else:
        tenant = resolve_tenant_by_context(tenant_id=tenant_id, tenant_slug=tenant_slug)
        if not tenant:
            raise ValueError("Business tenant is required for managers and attendants")

    if shop_id is not None:
        shop = Shop.query.get(shop_id)
        if not shop or shop.tenant_id != tenant.id:
            raise ValueError("Shop does not belong to this business")

    if User.query.filter_by(email=email, tenant_id=tenant.id).first():
        raise ValueError("Email already registered for this tenant")

    u = User(name=name, email=email, role=role, tenant_id=tenant.id, shop_id=shop_id)
    u.set_password(password)
    db.session.add(u)
    db.session.commit()
    return u


def get_user_by_email(email, tenant_id=None):
    query = User.query.filter_by(email=email)
    if tenant_id is not None:
        query = query.filter_by(tenant_id=tenant_id)
    return query.first()
