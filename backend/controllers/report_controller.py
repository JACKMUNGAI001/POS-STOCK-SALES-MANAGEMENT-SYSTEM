from flask import request, jsonify
from services.report_service import (
    get_global_financial_overview, 
    get_pnl_report, 
    get_daily_sales, 
    get_sales_summary, 
    get_stock_summary_by_category, 
    get_global_inventory,
    get_dashboard_summary,
    get_product_sales_analysis
)
from services.report_service import get_outstanding_credits
from services.report_service import get_credits_summary, get_all_credit_sales
from utils.timezone_utils import get_local_time
from flask_jwt_extended import get_jwt_identity
from utils.auth_utils import get_shop_id_for_attendant, get_shop_id_for_manager
from utils.auth_utils import get_van_id_for_attendant
from models.van import Van

def global_financial_overview_controller():
    overview = get_global_financial_overview()
    return jsonify(overview), 200

def dashboard_summary_controller():
    shop_id = request.args.get('shop_id', type=int)
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    
    summary = get_dashboard_summary(shop_id)
    return jsonify(summary), 200

def pnl_report_controller():
    if get_jwt_identity().get("role") != "admin":
        return jsonify({"msg": "Profit and margin reports are available to administrators only"}), 403
    year = request.args.get('year', type=int, default=get_local_time().year)
    month = request.args.get('month', type=int) # Now optional for yearly report
    shop_id = request.args.get('shop_id', type=int) # Optional for global report
    period = request.args.get('period') # e.g. today, this_week
    
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    
    report = get_pnl_report(year, month, shop_id, period)
    return jsonify(report), 200

def daily_sales_report_controller():
    shop_id = request.args.get('shop_id', type=int)
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    daily_sales = get_daily_sales(shop_id)
    return jsonify(daily_sales), 200

def sales_summary_controller():
    shop_id = request.args.get('shop_id', type=int)
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    summary = get_sales_summary(shop_id)
    return jsonify(summary), 200

def stock_summary_by_category_controller():
    shop_id = request.args.get('shop_id', type=int)
    
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    
    summary = get_stock_summary_by_category(shop_id)
    return jsonify(summary), 200

def global_inventory_controller():
    identity = get_jwt_identity() or {}
    if identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
        return jsonify([row for row in get_global_inventory() if row["shop_id"] == shop_id]), 200
    return jsonify(get_global_inventory()), 200

def product_sales_analysis_controller():
    shop_id = request.args.get('shop_id', type=int)
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    period = request.args.get('period')
    identity = get_jwt_identity() or {}
    if identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    
    analysis = get_product_sales_analysis(year=year, month=month, shop_id=shop_id, period=period)
    return jsonify(analysis), 200


def outstanding_credits_controller():
    shop_id = request.args.get('shop_id', type=int)
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    van_id = get_van_id_for_attendant() if user_identity.get("role") == "attendant" else request.args.get('van_id', type=int)
    if user_identity.get("role") == "attendant" and not van_id and not shop_id: return jsonify([]), 200
    if user_identity.get("role") == "manager" and van_id: return jsonify({"msg": "Not authorized for van credits"}), 403
    if van_id and not Van.query.filter_by(id=van_id, tenant_id=user_identity.get("tenant_id")).first(): return jsonify({"msg": "Van not found"}), 404
    results = get_outstanding_credits(shop_id, van_id)
    return jsonify(results), 200


def credits_summary_controller():
    shop_id = request.args.get('shop_id', type=int)
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    van_id = get_van_id_for_attendant() if user_identity.get("role") == "attendant" else request.args.get('van_id', type=int)
    if user_identity.get("role") == "attendant" and not van_id and not shop_id: return jsonify({"total_credit_sales": 0, "total_outstanding_amount": 0, "outstanding_count": 0, "paid_count": 0}), 200
    if user_identity.get("role") == "manager" and van_id: return jsonify({"msg": "Not authorized for van credits"}), 403
    if van_id and not Van.query.filter_by(id=van_id, tenant_id=user_identity.get("tenant_id")).first(): return jsonify({"msg": "Van not found"}), 404
    summary = get_credits_summary(shop_id, van_id)
    return jsonify(summary), 200


def credit_sales_controller():
    shop_id = request.args.get('shop_id', type=int)
    user_identity = get_jwt_identity()
    if user_identity.get("role") == "attendant":
        shop_id = get_shop_id_for_attendant()
    elif user_identity.get("role") == "manager":
        shop_id = get_shop_id_for_manager()
    van_id = get_van_id_for_attendant() if user_identity.get("role") == "attendant" else request.args.get('van_id', type=int)
    if user_identity.get("role") == "attendant" and not van_id and not shop_id: return jsonify([]), 200
    if user_identity.get("role") == "manager" and van_id: return jsonify({"msg": "Not authorized for van credits"}), 403
    if van_id and not Van.query.filter_by(id=van_id, tenant_id=user_identity.get("tenant_id")).first(): return jsonify({"msg": "Van not found"}), 404
    sales = get_all_credit_sales(shop_id, van_id)
    return jsonify(sales), 200
