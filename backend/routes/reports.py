from flask import Blueprint
from controllers.report_controller import (
    global_financial_overview_controller, 
    pnl_report_controller, 
    daily_sales_report_controller, 
    sales_summary_controller, 
    stock_summary_by_category_controller, 
    global_inventory_controller,
    dashboard_summary_controller,
    product_sales_analysis_controller,
    outstanding_credits_controller,
    credits_summary_controller,
    credit_sales_controller
)
from flask_jwt_extended import jwt_required

bp = Blueprint("reports", __name__)

bp.add_url_rule("/dashboard-summary", "dashboard_summary", jwt_required()(dashboard_summary_controller), methods=["GET"])
bp.add_url_rule("/financial-overview", "global_financial_overview", jwt_required()(global_financial_overview_controller), methods=["GET"])
bp.add_url_rule("/pnl", "pnl_report", jwt_required()(pnl_report_controller), methods=["GET"])
bp.add_url_rule("/daily_sales", "daily_sales_report", jwt_required()(daily_sales_report_controller), methods=["GET"])
bp.add_url_rule("/sales-summary", "sales_summary", jwt_required()(sales_summary_controller), methods=["GET"])
bp.add_url_rule("/stock-summary", "stock_summary", jwt_required()(stock_summary_by_category_controller), methods=["GET"])
bp.add_url_rule("/global-inventory", "global_inventory", jwt_required()(global_inventory_controller), methods=["GET"])
bp.add_url_rule("/product-analysis", "product_analysis", jwt_required()(product_sales_analysis_controller), methods=["GET"])
bp.add_url_rule("/outstanding-credits", "outstanding_credits", jwt_required()(outstanding_credits_controller), methods=["GET"])
bp.add_url_rule("/credits-summary", "credits_summary", jwt_required()(credits_summary_controller), methods=["GET"])
bp.add_url_rule("/credit-sales", "credit_sales", jwt_required()(credit_sales_controller), methods=["GET"])
