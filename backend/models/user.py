from datetime import datetime
from passlib.hash import bcrypt
from extensions import db
from utils.timezone_utils import get_local_time

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    email = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default="attendant")  # admin | manager | attendant
    is_verified = db.Column(db.Boolean, default=False)
    can_restock = db.Column(db.Boolean, default=False, nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    shop_id = db.Column(db.Integer, db.ForeignKey("shops.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=get_local_time)

    def set_password(self, password):
        self.password_hash = bcrypt.hash(password)

    def check_password(self, password):
        return bcrypt.verify(password, self.password_hash)
