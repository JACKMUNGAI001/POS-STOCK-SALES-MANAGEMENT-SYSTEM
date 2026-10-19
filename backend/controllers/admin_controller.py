from flask import jsonify, request
from models.user import User
from models.shop import Shop
from models.tenant import Tenant
from extensions import db
from sqlalchemy.orm import joinedload
from services.tenant_service import create_tenant
from models.van import Van


def create_tenant_controller(data):
    name = (data or {}).get("name")
    slug = (data or {}).get("slug")
    if not name:
        return jsonify({"msg": "tenant name required"}), 400
    try:
        tenant = create_tenant(name, slug=slug)
    except ValueError as exc:
        return jsonify({"msg": str(exc)}), 400
    return jsonify({"id": tenant.id, "name": tenant.name, "slug": tenant.slug}), 201


def pending_attendants(identity):
    if identity.get("role") != "admin":
        return jsonify({"msg":"admin only"}), 403
    tenant_id = identity.get("tenant_id")
    users = User.query.filter_by(role="attendant", is_verified=False, tenant_id=tenant_id).order_by(User.name.asc()).all()
    out = [{"id":u.id,"name":u.name,"email":u.email,"created_at":u.created_at.isoformat()} for u in users]
    return jsonify(out), 200

def verify_attendant(user_id, identity):
    u = User.query.filter_by(id=user_id, role="attendant", tenant_id=identity.get("tenant_id")).first_or_404()
    u.is_verified = True
    u.shop_id = None
    db.session.commit()
    return jsonify({"msg":"verified"}), 200

def list_all_attendants_controller(identity):
    if identity.get("role") != "admin":
        return jsonify({"msg":"admin only"}), 403
    tenant_id = identity.get("tenant_id")
    attendants = User.query.filter_by(role="attendant", tenant_id=tenant_id).options(joinedload(User.shop)).order_by(User.name.asc()).all()
    van_by_attendant = {van.attendant_id: van for van in Van.query.filter_by(tenant_id=tenant_id).all() if van.attendant_id}
    out = []
    for att in attendants:
        shop_name = None
        if att.shop:
            shop_name = att.shop.name
        out.append({
            "id": att.id,
            "name": att.name,
            "email": att.email,
            "is_verified": att.is_verified,
            "shop_id": att.shop_id,
            "shop_name": shop_name,
            "van_id": van_by_attendant.get(att.id).id if att.id in van_by_attendant else None,
            "van_registration": van_by_attendant.get(att.id).registration_number if att.id in van_by_attendant else None,
            "created_at": att.created_at.isoformat()
        })
    return jsonify(out), 200

def delete_attendant_controller(user_id, identity):
    if identity.get("role") != "admin":
        return jsonify({"msg":"admin only"}), 403
    attendant = User.query.filter_by(id=user_id, role="attendant").first()
    if not attendant:
        return jsonify({"msg": "Attendant not found"}), 404
    Van.query.filter_by(attendant_id=attendant.id).update({"attendant_id": None})
    db.session.delete(attendant)
    db.session.commit()
    return jsonify({"msg": "Attendant deleted"}), 200

def list_managers_controller(identity):
    if identity.get("role") != "admin":
        return jsonify({"msg": "admin only"}), 403
    managers = User.query.filter_by(role="manager", tenant_id=identity.get("tenant_id")).options(joinedload(User.shop)).order_by(User.name.asc()).all()
    return jsonify([{
        "id": manager.id,
        "name": manager.name,
        "email": manager.email,
        "can_restock": bool(manager.can_restock),
        "shop_id": manager.shop_id,
        "shop_name": manager.shop.name if manager.shop else None,
    } for manager in managers]), 200

def assign_manager_shop(user_id, shop_id, identity):
    if identity.get("role") != "admin":
        return jsonify({"msg": "admin only"}), 403
    manager = User.query.filter_by(id=user_id, role="manager", tenant_id=identity.get("tenant_id")).first()
    if not manager:
        return jsonify({"msg": "Manager not found"}), 404
    shop = Shop.query.filter_by(id=shop_id, tenant_id=identity.get("tenant_id")).first() if shop_id else None
    if shop_id and not shop:
        return jsonify({"msg": "Shop not found"}), 404
    manager.shop_id = shop.id if shop else None
    db.session.commit()
    return jsonify({"msg": "Manager shop assignment updated", "shop_id": manager.shop_id}), 200

def set_manager_restock_permission(user_id, data, identity):
    if identity.get("role") != "admin":
        return jsonify({"msg": "admin only"}), 403
    manager = User.query.filter_by(id=user_id, role="manager", tenant_id=identity.get("tenant_id")).first()
    if not manager:
        return jsonify({"msg": "Manager not found"}), 404
    # Accept the former key during rolling deployments, when an older browser
    # build may still be using the gas-only permission endpoint.
    manager.can_restock = bool(data.get("can_restock", data.get("can_restock_gas", False)))
    db.session.commit()
    return jsonify({"msg": "Restock permission updated", "can_restock": manager.can_restock}), 200

def my_restock_permission(identity):
    user = User.query.get(identity.get("id"))
    return jsonify({"can_restock": bool(user and user.role == "manager" and user.can_restock)}), 200
