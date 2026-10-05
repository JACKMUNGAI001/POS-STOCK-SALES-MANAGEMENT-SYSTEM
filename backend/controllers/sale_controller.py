from flask import request, jsonify
from services.sale_service import (
    create_sale, get_todays_sales, get_current_weeks_sales, 
    get_current_months_sales, get_current_years_sales, get_all_sales, 
    get_sales_by_shop, delete_sale, update_sale
)
from services.sale_service import add_sale_payment
from models.sale import Sale, SaleItem
from extensions import db
from flask_jwt_extended import get_jwt_identity
from utils.auth_utils import get_shop_id_for_attendant

def create_sale_controller():
    data = request.get_json() or {}
    shop_id = data.get("shop_id")
    items = data.get("items", [])
    payment_type = data.get("payment_type", "mobile_money")
    sale_type = data.get("sale_type") or data.get("saleType") or "standard"
    customer_name = data.get("customer_name")
    customer_phone = data.get("customer_phone")
    user = get_jwt_identity()
    try:
        sale = create_sale(shop_id=shop_id, user_id=user.get("id"), items=items, payment_type=payment_type, sale_type=sale_type, customer_name=customer_name, customer_phone=customer_phone, empty_cylinders=data.get("empty_cylinders", []))
        return jsonify({"msg":"sale recorded","sale_id":sale.id, "receipt_uuid": sale.receipt_uuid, "sale_type": sale.sale_type}), 201
    except ValueError as e:
        return jsonify({"msg":str(e)}), 400

def get_all_sales_controller():
    shop_id = get_shop_id_for_attendant()
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", default=25, type=int)
    if shop_id:
        sales = get_sales_by_shop(shop_id, page, per_page)
    else:
        sales = get_all_sales(page, per_page)
    return jsonify(sales), 200

def get_shop_sales_controller(shop_id):
    page = request.args.get("page", type=int)
    per_page = request.args.get("per_page", default=25, type=int)
    sales = get_sales_by_shop(shop_id, page, per_page)
    return jsonify(sales), 200

def todays_sales_controller():
    shop_id = get_shop_id_for_attendant()
    sales = get_todays_sales(shop_id)
    return jsonify(sales), 200

def current_weeks_sales_controller():
    shop_id = get_shop_id_for_attendant()
    sales = get_current_weeks_sales(shop_id)
    return jsonify(sales), 200

def current_months_sales_controller():
    shop_id = get_shop_id_for_attendant()
    sales = get_current_months_sales(shop_id)
    return jsonify(sales), 200

def current_years_sales_controller():
    shop_id = get_shop_id_for_attendant()
    sales = get_current_years_sales(shop_id)
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
