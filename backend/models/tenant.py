from extensions import db
from utils.timezone_utils import get_local_time


class Tenant(db.Model):
    __tablename__ = "tenants"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=get_local_time)

    users = db.relationship("User", backref="tenant", lazy=True)
    shops = db.relationship("Shop", backref="tenant", lazy=True)
