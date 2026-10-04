import unittest

from app import create_app
from extensions import db
from models.tenant import Tenant
from models.user import User
from models.shop import Shop
from services.auth_service import register_user, get_user_by_email


class TenantIsolationTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        with self.app.app_context():
            db.drop_all()
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_users_and_shops_are_bound_to_a_tenant(self):
        with self.app.app_context():
            tenant_a = Tenant(name='Client A', slug='client-a')
            tenant_b = Tenant(name='Client B', slug='client-b')
            db.session.add_all([tenant_a, tenant_b])
            db.session.commit()

            shop_a = Shop(name='Branch A', tenant_id=tenant_a.id)
            db.session.add(shop_a)
            db.session.commit()

            user = User(
                name='Jane Admin',
                email='jane@client-a.com',
                password_hash='hashed',
                role='admin',
                tenant_id=tenant_a.id,
                shop_id=shop_a.id,
            )
            db.session.add(user)
            db.session.commit()

            self.assertEqual(shop_a.tenant_id, tenant_a.id)
            self.assertEqual(user.tenant_id, tenant_a.id)
            self.assertEqual(user.shop_id, shop_a.id)

            tenant_b_shop = Shop(name='Branch B', tenant_id=tenant_b.id)
            db.session.add(tenant_b_shop)
            db.session.commit()

            self.assertNotEqual(shop_a.tenant_id, tenant_b_shop.tenant_id)

    def test_admin_registration_creates_tenant_and_user_login_is_tenant_scoped(self):
        with self.app.app_context():
            tenant = Tenant(name='Acme Gas', slug='acme-gas')
            db.session.add(tenant)
            db.session.commit()

            admin = register_user('Admin User', 'admin@acme-gas.com', 'secret123', role='admin', tenant_id=tenant.id)
            self.assertEqual(admin.tenant_id, tenant.id)
            self.assertIsNone(admin.shop_id)

            manager = register_user('Manager One', 'manager@acme-gas.com', 'secret123', role='manager', tenant_id=tenant.id, shop_id=None)
            self.assertEqual(manager.tenant_id, tenant.id)
            self.assertIsNone(manager.shop_id)

            resolved = get_user_by_email('manager@acme-gas.com', tenant_id=tenant.id)
            self.assertIsNotNone(resolved)
            self.assertEqual(resolved.tenant_id, tenant.id)

            other_tenant = Tenant(name='Rival Gas', slug='rival-gas')
            db.session.add(other_tenant)
            db.session.commit()
            other_user = get_user_by_email('manager@acme-gas.com', tenant_id=other_tenant.id)
            self.assertIsNone(other_user)

    def test_admin_signup_creates_business_and_non_admin_signup_requires_business_tenant(self):
        with self.app.app_context():
            admin = register_user('Owner', 'owner@example.com', 'secret123', role='admin', tenant_name='Greenhouse Supply', tenant_slug='greenhouse-supply')
            self.assertIsNotNone(admin.tenant_id)
            self.assertIsNone(admin.shop_id)
            self.assertEqual(Tenant.query.filter_by(slug='greenhouse-supply').count(), 1)

            with self.assertRaises(ValueError):
                register_user('Manager', 'manager@example.com', 'secret123', role='manager', tenant_id=None)


if __name__ == '__main__':
    unittest.main()
