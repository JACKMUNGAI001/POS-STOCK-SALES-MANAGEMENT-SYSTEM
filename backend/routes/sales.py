from flask import Blueprint
from controllers.sale_controller import (
    create_sale_controller, get_shop_sales_controller, 
    todays_sales_controller, current_weeks_sales_controller, 
    current_months_sales_controller, current_years_sales_controller, 
    get_all_sales_controller, delete_sale_controller, update_sale_controller,
    add_sale_payment_controller,
    get_van_sales_controller,
)
from flask_jwt_extended import jwt_required

bp = Blueprint("sales", __name__)

@bp.route("/", methods=["POST"])
@jwt_required()
def create_sale():
    return create_sale_controller()

@bp.route("/all", methods=["GET"])
@jwt_required()
def get_all_sales():
    return get_all_sales_controller()

@bp.route("/today", methods=["GET"])
@jwt_required()
def todays_sales():
    return todays_sales_controller()

@bp.route("/week", methods=["GET"])
@jwt_required()
def current_weeks_sales():
    return current_weeks_sales_controller()

@bp.route("/month", methods=["GET"])
@jwt_required()
def current_months_sales():
    return current_months_sales_controller()

@bp.route("/year", methods=["GET"])
@jwt_required()
def current_years_sales():
    return current_years_sales_controller()

@bp.route("/shop/<int:shop_id>", methods=["GET"])
@jwt_required()
def get_shop_sales(shop_id):
    return get_shop_sales_controller(shop_id)

@bp.route("/van/<int:van_id>", methods=["GET"])
@jwt_required()
def get_van_sales(van_id):
    return get_van_sales_controller(van_id)

@bp.route("/<int:sale_id>", methods=["DELETE"])
@jwt_required()
def delete_sale(sale_id):
    return delete_sale_controller(sale_id)

@bp.route("/<int:sale_id>", methods=["PUT"])
@jwt_required()
def update_sale(sale_id):
    return update_sale_controller(sale_id)


@bp.route("/<int:sale_id>/payments", methods=["POST"])
@jwt_required()
def add_sale_payment(sale_id):
    return add_sale_payment_controller(sale_id)
