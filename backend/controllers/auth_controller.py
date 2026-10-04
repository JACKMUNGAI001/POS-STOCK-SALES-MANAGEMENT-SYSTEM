from flask import request, jsonify
from services.auth_service import register_user, get_user_by_email
from services.tenant_service import resolve_tenant_by_context, get_or_create_default_tenant
from extensions import db
from flask_jwt_extended import create_access_token, get_jwt_identity
from models.user import User
from models.shop import Shop


def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "attendant")
    shop_id = data.get("shop_id")
    tenant_id = data.get("tenant_id")
    tenant_name = data.get("tenant_name") or data.get("business_name")
    tenant_slug = data.get("tenant_slug") or data.get("business_slug") or data.get("slug")
    if not all([name, email, password]):
        return jsonify({"msg":"name, email, password required"}), 400
    try:
        u = register_user(
            name,
            email,
            password,
            role=role,
            shop_id=shop_id,
            tenant_id=tenant_id,
            tenant_name=tenant_name,
            tenant_slug=tenant_slug,
        )
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400
    return jsonify({"msg":"registered. await admin verification"}), 201


def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    tenant_id = data.get("tenant_id")
    tenant_slug = data.get("tenant_slug") or data.get("business_slug") or data.get("slug")
    if not all([email, password]):
        return jsonify({"msg":"email and password required"}), 400

    tenant = resolve_tenant_by_context(tenant_id=tenant_id, tenant_slug=tenant_slug)
    if tenant is None and (tenant_id is not None or tenant_slug is not None):
        return jsonify({"msg":"business not found"}), 404
    if tenant is None:
        tenant = get_or_create_default_tenant()

    u = get_user_by_email(email, tenant_id=tenant.id)
    if not u and tenant_id is None and tenant_slug is None:
        u = get_user_by_email(email)
    if not u or not u.check_password(password):
        return jsonify({"msg":"invalid credentials"}), 401
    if u.role == "attendant" and not u.is_verified:
        return jsonify({"msg":"account not verified by admin"}), 403

    shop_name = None
    if u.shop_id:
        shop = Shop.query.get(u.shop_id)
        if shop:
            shop_name = shop.name

    token = create_access_token(identity={"id":u.id,"role":u.role, "shop_id": u.shop_id, "tenant_id": u.tenant_id})
    return jsonify({"access_token": token, "user": {"id":u.id,"name":u.name,"email":u.email,"role":u.role, "tenant_id": u.tenant_id, "shop_id": u.shop_id, "shop_name": shop_name}}), 200

def get_current_user_controller():
    user_data = get_jwt_identity()
    user_id = user_data['id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    shop_name = None
    if user.shop_id:
        shop = Shop.query.get(user.shop_id)
        if shop:
            shop_name = shop.name

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "tenant_id": user.tenant_id,
        "shop_id": user.shop_id,
        "shop_name": shop_name
    }), 200
