from datetime import datetime
from extensions import db
from utils.timezone_utils import get_local_time

class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True, index=True)
    user_role = db.Column(db.String(50), default="admin")  # admin or attendant
    user_id = db.Column(db.Integer, nullable=True)
    type = db.Column(db.String(64))
    message = db.Column(db.Text)
    status = db.Column(db.String(20), default="unread")  # unread, read, resolved
    created_at = db.Column(db.DateTime, default=get_local_time)
