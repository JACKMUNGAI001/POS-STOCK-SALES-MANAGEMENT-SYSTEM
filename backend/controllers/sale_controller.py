from flask import request, jsonify
from services.sale_service import (
    create_sale, get_todays_sales, get_current_weeks_sales, 
    get_current_months_sales, get_current_years_sales, get_all_sales, 
    get_sales_by_shop, delete_sale, update_sale
)
from services.sale_service import add_sale_payment, get_sales_by_van
from models.sale import Sale, SaleItem
from extensions import db
from flask_jwt_extended import get_jwt_identity
from utils.auth_utils import get_shop_id_for_attendant, get_shop_id_for_manager
from utils.auth_utils import get_van_id_for_attendant
from models.van import Van

def create_sale_controller():
    data = request.get_json() or {}
    shop_id = data.get("shop_id")
    van_id = data.get("van_id")
    items = data.get("items", [])
    payment_type = data.get("payment_type", "mobile_money")
    sale_type = data.get("sale_type") or data.get("saleType") or "standard"
    customer_name = data.get("customer_name")
    customer_phone = data.get("customer_phone")
    user = get_jwt_identity()
    if user.get("role") == "attendant":
        assigned_van = get_van_id_for_attendant()
        if assigned_van:
            van_id, shop_id = assigned_van, None
        else:
            van_id = None
            shop_id = get_shop_id_for_attendant()
    elif user.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
        van_id = None
        if not shop_id:
            return jsonify({"msg": "You must be assigned to a shop before recording sales"}), 403
    elif van_id:
        if user.get("role") != "admin":
            return jsonify({"msg": "Only an admin can record a sale for a van"}), 403
        shop_id = None
    try:
        if not van_id and not shop_id:
            return jsonify({"msg": "Choose a shop or assigned van"}), 400
        sale = create_sale(shop_id=shop_id, van_id=van_id, user_id=user.get("id"), items=items, payment_type=payment_type, sale_type=sale_type, customer_name=customer_name, customer_phone=customer_phone, empty_cylinders=data.get("empty_cylinders", []))
        return jsonify({"msg":"sale recorded","sale_id":sale.id, "receipt_uuid": sale.receipt_uuid, "sale_type": sale.sale_type}), 201
    except ValueError as e:
        return jsonify({"msg":str(e)}), 400

def get_all_sales_controller():
    identity = get_jwt_identity() or {}
    van_id = get_van_id_for_attendant() if identity.get("role") == "attendant" else None
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", default=25, type=int)
    if van_id:
        return jsonify(get_sales_by_van(van_id, page, per_page)), 200
    shop_id = get_shop_id_for_attendant()
    if identity.get("role") == "attendant" and not shop_id:
        return jsonify([]), 200
    if shop_id:
        sales = get_sales_by_shop(shop_id, page, per_page)
    elif identity.get("role") == "manager":
        manager_shop_id = get_shop_id_for_manager()
        sales = get_sales_by_shop(manager_shop_id, page, per_page) if manager_shop_id else []
    else:
        sales = get_all_sales(page, per_page)
    return jsonify(sales), 200

def get_shop_sales_controller(shop_id):
    identity = get_jwt_identity() or {}
    if identity.get("role") == "manager" and get_shop_id_for_manager() != shop_id:
        return jsonify({"msg": "Not authorized for this shop"}), 403
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", default=25, type=int)
    sales = get_sales_by_shop(shop_id, page, per_page)
    return jsonify(sales), 200

def get_van_sales_controller(van_id):
    identity = get_jwt_identity() or {}
    van = Van.query.filter_by(id=van_id, tenant_id=identity.get("tenant_id")).first()
    if not van:
        return jsonify({"msg": "Van not found"}), 404
    if identity.get("role") == "manager":
        return jsonify({"msg": "Not authorized for van sales"}), 403
    if identity.get("role") == "attendant" and get_van_id_for_attendant() != van_id:
        return jsonify({"msg": "Not authorized for this van"}), 403
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", default=25, type=int)
    return jsonify(get_sales_by_van(van_id, page, per_page)), 200

def todays_sales_controller():
    shop_id = get_shop_id_for_attendant()
    if (get_jwt_identity() or {}).get("role") == "manager": shop_id = get_shop_id_for_manager()
    van_id = get_van_id_for_attendant()
    sales = get_todays_sales(shop_id, van_id)
    return jsonify(sales), 200

def current_weeks_sales_controller():
    shop_id = get_shop_id_for_attendant()
    if (get_jwt_identity() or {}).get("role") == "manager": shop_id = get_shop_id_for_manager()
    van_id = get_van_id_for_attendant()
    sales = get_current_weeks_sales(shop_id, van_id)
    return jsonify(sales), 200

def current_months_sales_controller():
    shop_id = get_shop_id_for_attendant()
    if (get_jwt_identity() or {}).get("role") == "manager": shop_id = get_shop_id_for_manager()
    van_id = get_van_id_for_attendant()
    sales = get_current_months_sales(shop_id, van_id)
    return jsonify(sales), 200

def current_years_sales_controller():
    shop_id = get_shop_id_for_attendant()
    if (get_jwt_identity() or {}).get("role") == "manager": shop_id = get_shop_id_for_manager()
    van_id = get_van_id_for_attendant()
    sales = get_current_years_sales(shop_id, van_id)
    return jsonify(sales), 200

def delete_sale_controller(sale_id):
    user_identity = get_jwt_identity()
    if user_identity.get("role") != "admin":
        return jsonify({"msg": "Admin privilege required"}), 403
    try:
        delete_sale(sale_id, user_identity.get("id"))
        return jsonify({"msg": "Sale deleted successfully"}), 200
    except ValueError as e:
        return jsonify({"msg": str(e)}), 404
    except Exception as e:
        return jsonify({"msg": "Internal Server Error"}), 500

def update_sale_controller(sale_id):
    user_identity = get_jwt_identity()
    if user_identity.get("role") != "admin":
        return jsonify({"msg": "Admin privilege required"}), 403
    
    data = request.get_json() or {}
    items = data.get("items", [])
    payment_type = data.get("payment_type")
    sale_type = data.get("sale_type") or data.get("saleType") or "standard"
    customer_name = data.get("customer_name")
    customer_phone = data.get("customer_phone")
    
    try:
        sale = update_sale(sale_id, user_identity.get("id"), items, payment_type, sale_type, customer_name, customer_phone)
        return jsonify({"msg": "Sale updated successfully", "sale_id": sale.id, "receipt_uuid": sale.receipt_uuid, "sale_type": sale.sale_type}), 200
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400
    except Exception as e:
        return jsonify({"msg": "Internal Server Error"}), 500


def add_sale_payment_controller(sale_id):
    user_identity = get_jwt_identity()
    sale = Sale.query.get(sale_id)
    if not sale:
        return jsonify({"msg": "Sale not found"}), 404
    if user_identity.get("role") == "attendant":
        if sale.van_id and get_van_id_for_attendant() != sale.van_id:
            return jsonify({"msg": "Not authorized for this van sale"}), 403
        if not sale.van_id and get_shop_id_for_attendant() != sale.shop_id:
            return jsonify({"msg": "Not authorized for this shop sale"}), 403
    data = request.get_json() or {}
    amount = data.get("amount")
    if amount is None:
        return jsonify({"msg": "amount is required"}), 400
    try:
        sale = add_sale_payment(sale_id, amount, user_identity.get("id"))
        return jsonify({"msg": "payment recorded", "sale_id": sale.id, "paid_amount": float(sale.paid_amount)}), 201
    except ValueError as e:
        return jsonify({"msg": str(e)}), 404
    except Exception as e:
        return jsonify({"msg": "Internal Server Error"}), 500
