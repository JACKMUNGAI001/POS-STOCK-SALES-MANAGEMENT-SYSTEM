from marshmallow import Schema, fields, validate

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str()
    email = fields.Email()
    role = fields.Str(validate=validate.OneOf(["admin","manager","attendant"]))
    is_verified = fields.Bool()
    shop_id = fields.Int(allow_none=True)
    created_at = fields.DateTime()

class ItemSchema(Schema):
    id = fields.Int()
    sku = fields.Str()
    name = fields.Str()
    brand = fields.Str()
    description = fields.Str()

class ShopStockSchema(Schema):
    id = fields.Int()
    shop_id = fields.Int()
    item_id = fields.Int()
    quantity = fields.Int()
    buy_price = fields.Float()
    updated_at = fields.DateTime()

class SaleItemSchema(Schema):
    item_id = fields.Int()
    qty = fields.Int()
    unit_price = fields.Float()

class SaleSchema(Schema):
    id = fields.Int()
    shop_id = fields.Int()
    user_id = fields.Int()
    total_amount = fields.Float()
    payment_type = fields.Str()
    sale_type = fields.Str()
    paid_amount = fields.Float()
    status = fields.Str()
    profit_amount = fields.Float()
    items = fields.Nested(SaleItemSchema, many=True)
    created_at = fields.DateTime()
