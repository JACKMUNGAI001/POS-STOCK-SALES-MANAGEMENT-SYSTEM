import argparse

from app import create_app
from extensions import db
from models.tenant import Tenant
from models.user import User
from models.shop import Shop
from models.product import Category, Item

app = create_app()
app.app_context().push()


def database_has_initial_data():
    """Return whether this database has already been set up by a user.

    Seed data is only appropriate for a brand-new database.  In particular,
    checking for each individual shop and recreating it would undo a shop
    deletion made through the application.
    """
    inspector = db.inspect(db.engine)
    tables = set(inspector.get_table_names())

    if "tenants" not in tables:
        return False

    return any((
        db.session.query(Tenant.id).first(),
        db.session.query(User.id).first(),
        db.session.query(Shop.id).first(),
        db.session.query(Category.id).first(),
    ))


def clear_database():
    """Clear all data from the database."""
    # Delete in order to respect foreign keys. Some compatibility tables may not
    # exist yet on a first migration run, so guard each delete by table presence.
    tables = set(db.inspect(db.engine).get_table_names())

    from models.sale import Sale, SaleItem, SalePayment
    from models.stock import ShopStock, StockMovement, StockBatch, EmptyCylinderStock, SaleCylinderReturn
    from models.transfer import Transfer, TransferItem
    from models.expense import Expense
    from models.supplier import Supplier, SupplierInvoice, SupplierInvoiceItem, supplier_items
    from models.receipt import Receipt
    from models.notification import Notification

    if "sale_payments" in tables:
        db.session.query(SalePayment).delete()
    if "sale_items" in tables:
        db.session.query(SaleItem).delete()
    if "sales" in tables:
        db.session.query(Sale).delete()
    if "sale_cylinder_returns" in tables:
        db.session.query(SaleCylinderReturn).delete()
    if "empty_cylinder_stocks" in tables:
        db.session.query(EmptyCylinderStock).delete()
    if "stock_movements" in tables:
        db.session.query(StockMovement).delete()
    if "stock_batches" in tables:
        db.session.query(StockBatch).delete()
    if "shop_stocks" in tables:
        db.session.query(ShopStock).delete()
    if "transfer_items" in tables:
        db.session.query(TransferItem).delete()
    if "transfers" in tables:
        db.session.query(Transfer).delete()
    if "expenses" in tables:
        db.session.query(Expense).delete()
    if "supplier_invoice_items" in tables:
        db.session.query(SupplierInvoiceItem).delete()
    if "supplier_invoices" in tables:
        db.session.query(SupplierInvoice).delete()
    if "supplier_items" in tables:
        db.session.execute(supplier_items.delete())
    if "suppliers" in tables:
        db.session.query(Supplier).delete()
    if "receipts" in tables:
        db.session.query(Receipt).delete()
    if "notifications" in tables:
        db.session.query(Notification).delete()
    if "items" in tables:
        db.session.query(Item).delete()
    if "categories" in tables:
        db.session.query(Category).delete()
    if "users" in tables:
        db.session.query(User).delete()
    if "shops" in tables:
        db.session.query(Shop).delete()
    if "tenants" in tables:
        db.session.query(Tenant).delete()
    db.session.commit()
    print("Database cleared.")


def run(force=False):
    inspector = db.inspect(db.engine)
    tables = set(inspector.get_table_names())
    if "tenants" not in tables:
        raise RuntimeError("Database is not migrated. Run 'flask db upgrade' before seeding.")

    if database_has_initial_data() and not force:
        print(
            "Database already contains data; skipping seed data so existing "
            "shop and user changes are preserved."
        )
        return

    # Clear existing data if forcing
    if force:
        clear_database()

    # Default tenant for the original single-client deployment
    default_tenant = Tenant.query.filter_by(slug="default").first()
    if not default_tenant:
        default_tenant = Tenant(name="Default Tenant", slug="default")
        db.session.add(default_tenant)
        db.session.commit()

    # Shops - Only UMOJA
    shops_data = [
        {"name": "UMOJA", "address": "Nairobi"},
    ]
    shops = {}
    for s_data in shops_data:
        shop = Shop.query.filter_by(name=s_data["name"], tenant_id=default_tenant.id).first()
        if not shop:
            shop = Shop(name=s_data["name"], address=s_data["address"], tenant_id=default_tenant.id)
            db.session.add(shop)
            db.session.commit()
        shops[s_data["name"]] = shop

    # Admin and Manager
    admin = User.query.filter_by(email="admin@gaspos.com", tenant_id=default_tenant.id).first()
    if not admin:
        admin = User(name="Admin User", email="admin@gaspos.com", role="admin", is_verified=True, tenant_id=default_tenant.id, shop_id=shops["UMOJA"].id)
        admin.set_password("password123")
        db.session.add(admin)
    else:
        admin.shop_id = shops["UMOJA"].id
        admin.tenant_id = default_tenant.id

    manager = User.query.filter_by(email="manager@gaspos.com", tenant_id=default_tenant.id).first()
    if not manager:
        manager = User(name="Test Manager", email="manager@gaspos.com", role="manager", is_verified=True, tenant_id=default_tenant.id, shop_id=shops["UMOJA"].id)
        manager.set_password("manager123")
        db.session.add(manager)
    else:
        manager.shop_id = shops["UMOJA"].id
        manager.tenant_id = default_tenant.id

    db.session.commit()

    # Categories and Items
    categories_data = ["Gas Cylinders", "Gas Accessories"]
    categories = {}
    for c_name in categories_data:
        cat = Category.query.filter_by(name=c_name, tenant_id=default_tenant.id).first()
        if not cat:
            cat = Category(name=c_name, tenant_id=default_tenant.id)
            db.session.add(cat)
            db.session.commit()
        categories[c_name] = cat

    db.session.commit()
    print("Seeded admin, UMOJA shop, and categories.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap a new development database.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Add any missing default records to an existing database.",
    )
    args = parser.parse_args()
    run(force=args.force)
