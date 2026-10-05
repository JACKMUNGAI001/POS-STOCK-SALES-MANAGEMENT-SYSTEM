from .auth import bp as auth_bp
from .admin import bp as admin_bp
from .shops import bp as shops_bp
from .items import bp as items_bp
from .stocks import bp as stocks_bp
from .sales import bp as sales_bp
from .transfers import bp as transfers_bp
from .expenses import bp as expenses_bp
from .receipts import bp as receipts_bp
from .reports import bp as reports_bp
from .user import bp as user_bp
from .suppliers import suppliers_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(shops_bp, url_prefix="/shops")
    app.register_blueprint(items_bp, url_prefix="/items")
    app.register_blueprint(stocks_bp, url_prefix="/stocks")
    app.register_blueprint(sales_bp, url_prefix="/sales")
    app.register_blueprint(transfers_bp, url_prefix="/transfers")
    app.register_blueprint(expenses_bp, url_prefix="/expenses")
    app.register_blueprint(receipts_bp, url_prefix="/receipts")
    app.register_blueprint(reports_bp, url_prefix="/reports")
    app.register_blueprint(user_bp, url_prefix="/user")
    app.register_blueprint(suppliers_bp, url_prefix="/suppliers")
