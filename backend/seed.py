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


def run(force=False):
    if database_has_initial_data() and not force:
        print(
            "Database already contains data; skipping seed data so existing "
            "shop and user changes are preserved."
        )
        return

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

    # Shops
    shops_data = [
        {"name": "UMOJA", "address": "Nairobi"},
        {"name": "MUTINDWA", "address": "Nairobi"},
        {"name": "KABATI", "address": "Muranga"},
        {"name": "JUDAH", "address": "Nairobi"},
        {"name": "NDARACHA", "address": "Nairobi"},
        {"name": "KENOL", "address": "Muranga"},
        {"name": "UNITY", "address": "Nairobi"},
        {"name": "JESKA", "address": "Nairobi"},
        {"name": "RUIRU", "address": "Kiambu"}
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
    print("Seeded admin, shops, and categories.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap a new development database.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Add any missing default records to an existing database.",
    )
    args = parser.parse_args()
    run(force=args.force)
