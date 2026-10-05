from flask import Blueprint
from controllers.receipt_controller import get_receipt_controller

bp = Blueprint("receipts", __name__)

bp.add_url_rule("/<string:uuid>", "get_receipt", get_receipt_controller, methods=["GET"])
