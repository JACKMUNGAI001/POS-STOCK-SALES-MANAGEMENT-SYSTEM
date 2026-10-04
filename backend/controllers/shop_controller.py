from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from models.shop import Shop
from extensions import db

def list_shops():
    tenant_id = request.args.get("tenant_id", type=int)
    query = Shop.query
    if tenant_id is not None:
        query = query.filter_by(tenant_id=tenant_id)
    shops = query.order_by(Shop.name.asc()).all()
    out = [{"id":s.id,"name":s.name,"address":s.address,"tenant_id":s.tenant_id} for s in shops]
    return jsonify(out), 200

def get_shop_controller(shop_id):
    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"msg": "Shop not found"}), 404
    return jsonify({"id":shop.id,"name":shop.name,"address":shop.address,"tenant_id":shop.tenant_id}), 200

def create_shop():
    data = request.get_json() or {}
    name = data.get("name")
    address = data.get("address")
    identity = get_jwt_identity() or {}
    tenant_id = data.get("tenant_id") or identity.get("tenant_id")
    if not name:
        return jsonify({"msg":"name required"}), 400
    if not tenant_id:
        return jsonify({"msg":"tenant_id required"}), 400
    s = Shop(name=name, address=address, tenant_id=tenant_id)
    db.session.add(s)
    db.session.commit()
    return jsonify({"id":s.id,"name":s.name,"tenant_id":s.tenant_id}), 201

def update_shop(shop_id):
    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"msg": "Shop not found"}), 404
    data = request.get_json() or {}
    shop.name = data.get("name", shop.name)
    shop.address = data.get("address", shop.address)
    db.session.commit()
    return jsonify({"msg": "Shop updated", "id": shop.id}), 200

def delete_shop(shop_id):
    shop = Shop.query.get(shop_id)
    if not shop:
        return jsonify({"msg": "Shop not found"}), 404
    db.session.delete(shop)
    db.session.commit()
    return jsonify({"msg": "Shop deleted"}), 200
