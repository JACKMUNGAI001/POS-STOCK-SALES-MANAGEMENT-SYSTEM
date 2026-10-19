from flask_jwt_extended import get_jwt_identity
from models.user import User
from models.van import Van

def get_shop_id_for_attendant():
    """Helper to get shop_id for attendant from identity or DB lookup."""
    user_identity = get_jwt_identity()
    if not user_identity or user_identity.get("role") != "attendant":
        return None
    
    shop_id = user_identity.get("shop_id")
    if shop_id is None:
        # Fallback to DB lookup if shop_id missing from identity (old token)
        u = User.query.get(user_identity.get("id"))
        if u:
            shop_id = u.shop_id
    return shop_id

def get_van_id_for_attendant():
    identity = get_jwt_identity()
    if not identity or identity.get("role") != "attendant":
        return None
    user = User.query.get(identity.get("id"))
    van = Van.query.filter_by(attendant_id=user.id, tenant_id=user.tenant_id).first() if user else None
    return van.id if van else None
