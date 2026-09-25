import argparse

from app import create_app
from extensions import db
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
    return any((
        db.session.query(User.id).first(),
        db.session.query(Shop.id).first(),
        db.session.query(Category.id).first(),
    ))


def clear_database():
    """Clear all data from the database."""
    # Delete in order to respect foreign keys
    from models.sale import Sale, SaleItem, SalePayment
    from models.deposit import DepositSale, DepositPayment
    from models.stock import ShopStock, StockMovement, StockBatch, EmptyCylinderStock, SaleCylinderReturn
    from models.transfer import Transfer, TransferItem
    from models.expense import Expense
    from models.supplier import Supplier, SupplierInvoice, SupplierInvoiceItem, supplier_items
    from models.receipt import Receipt
    from models.notification import Notification

    db.session.query(SalePayment).delete()
    db.session.query(SaleItem).delete()
    db.session.query(Sale).delete()
    db.session.query(DepositPayment).delete()
    db.session.query(DepositSale).delete()
    db.session.query(SaleCylinderReturn).delete()
    db.session.query(EmptyCylinderStock).delete()
    db.session.query(StockMovement).delete()
    db.session.query(StockBatch).delete()
    db.session.query(ShopStock).delete()
    db.session.query(TransferItem).delete()
    db.session.query(Transfer).delete()
    db.session.query(Expense).delete()
    db.session.query(SupplierInvoiceItem).delete()
    db.session.query(SupplierInvoice).delete()
    db.session.execute(supplier_items.delete())
    db.session.query(Supplier).delete()
    db.session.query(Receipt).delete()
    db.session.query(Notification).delete()
    db.session.query(Item).delete()
    db.session.query(Category).delete()
    db.session.query(User).delete()
    db.session.query(Shop).delete()
    db.session.commit()
    print("Database cleared.")


def run(force=False):
    if database_has_initial_data() and not force:
        print(
            "Database already contains data; skipping seed data so existing "
            "shop and user changes are preserved."
        )
        return

    # Clear existing data if forcing
    if force:
        clear_database()

    # Admin and Manager
    admin = User.query.filter_by(email="admin@gaspos.com").first()
    if not admin:
        admin = User(name="Admin User", email="admin@gaspos.com", role="admin", is_verified=True)
        admin.set_password("password123")
        db.session.add(admin)
        db.session.commit()

    if not User.query.filter_by(email="manager@gaspos.com").first():
        m = User(name="Test Manager", email="manager@gaspos.com", role="manager", is_verified=True)
        m.set_password("manager123")
        db.session.add(m)

    # Shops - Only UMOJA
    shops_data = [
        {"name": "UMOJA", "address": "Nairobi"},
    ]
    shops = {}
    for s_data in shops_data:
        shop = Shop.query.filter_by(name=s_data["name"]).first()
        if not shop:
            shop = Shop(name=s_data["name"], address=s_data["address"])
            db.session.add(shop)
            db.session.commit()
        shops[s_data["name"]] = shop

    # Categories and Items
    categories_data = ["Gas Cylinders", "Gas Accessories"]
    categories = {}
    for c_name in categories_data:
        cat = Category.query.filter_by(name=c_name).first()
        if not cat:
            cat = Category(name=c_name)
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
