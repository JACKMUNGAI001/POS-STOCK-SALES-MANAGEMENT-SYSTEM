from extensions import db
from models.product import Item


def create_item(name, category_id, sku=None, brand=None, description=None, tenant_id=None):
    it = Item(name=name, category_id=category_id, sku=sku, brand=brand, description=description, tenant_id=tenant_id)
    db.session.add(it)
    db.session.commit()
    return it


def list_items(tenant_id=None):
    query = Item.query
    if tenant_id is not None:
        query = query.filter_by(tenant_id=tenant_id)
    return query.order_by(Item.name.asc()).all()
