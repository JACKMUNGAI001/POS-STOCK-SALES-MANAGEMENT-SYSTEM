from flask import Blueprint
from controllers.shop_controller import list_shops, create_shop, update_shop, delete_shop, get_shop_controller
from flask_jwt_extended import jwt_required

bp = Blueprint("shops", __name__)

bp.add_url_rule("/", "list_shops", jwt_required()(list_shops), methods=["GET"])
bp.add_url_rule("/", "create_shop", jwt_required()(create_shop), methods=["POST"])
bp.add_url_rule("/<int:shop_id>", "get_shop", jwt_required()(get_shop_controller), methods=["GET"])
bp.add_url_rule("/<int:shop_id>", "update_shop", jwt_required()(update_shop), methods=["PUT"])
bp.add_url_rule("/<int:shop_id>", "delete_shop", jwt_required()(delete_shop), methods=["DELETE"])
