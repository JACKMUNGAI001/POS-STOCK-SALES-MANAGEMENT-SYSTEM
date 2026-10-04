from flask import Blueprint, request
from controllers.admin_controller import pending_attendants, verify_attendant, list_all_attendants_controller, delete_attendant_controller, list_managers_controller, set_manager_restock_permission, my_restock_permission, create_tenant_controller
from flask_jwt_extended import jwt_required, get_jwt_identity

bp = Blueprint("admin", __name__)

@bp.route("/tenants", methods=["POST"])
@jwt_required()
def create_tenant():
    identity = get_jwt_identity()
    if identity.get("role") != "admin":
        return {"msg": "admin only"}, 403
    return create_tenant_controller(request.get_json() or {})

@bp.route("/attendants/pending", methods=["GET"])
@jwt_required()
def pending():
    identity = get_jwt_identity()
    return pending_attendants(identity)

@bp.route("/attendants/<int:user_id>/verify", methods=["PATCH"])
@jwt_required()
def verify(user_id):
    identity = get_jwt_identity()
    if identity.get("role") != "admin":
        return {"msg":"admin only"}, 403
    data = request.get_json() or {}
    return verify_attendant(user_id, data)

@bp.route("/attendants/all", methods=["GET"])
@jwt_required()
def all_attendants():
    identity = get_jwt_identity()
    return list_all_attendants_controller(identity)

@bp.route("/attendants/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_attendant(user_id):
    identity = get_jwt_identity()
    return delete_attendant_controller(user_id, identity)

@bp.route("/managers", methods=["GET"])
@jwt_required()
def managers():
    return list_managers_controller(get_jwt_identity())

@bp.route("/managers/<int:user_id>/restock-permission", methods=["PATCH"])
@jwt_required()
def update_manager_restock_permission(user_id):
    return set_manager_restock_permission(user_id, request.get_json() or {}, get_jwt_identity())

@bp.route("/managers/<int:user_id>/gas-restock-permission", methods=["PATCH"])
@jwt_required()
def update_manager_gas_restock_permission_legacy(user_id):
    """Compatibility route for dashboard builds cached before the rename."""
    return set_manager_restock_permission(user_id, request.get_json() or {}, get_jwt_identity())

@bp.route("/my-restock-permission", methods=["GET"])
@jwt_required()
def get_my_restock_permission():
    return my_restock_permission(get_jwt_identity())
