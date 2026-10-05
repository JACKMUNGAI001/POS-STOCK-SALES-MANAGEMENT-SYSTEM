from flask import request, jsonify
from services.product_service import create_item, list_items
from models.product import Category, Item
from extensions import db
from flask_jwt_extended import get_jwt_identity

def list_items_controller():
    user_identity = get_jwt_identity() or {}
    tenant_id = user_identity.get("tenant_id")
    items = list_items()
    if tenant_id is not None:
        items = [it for it in items if getattr(it, "tenant_id", None) == tenant_id]
    user_role = user_identity.get("role")
    
    category_ids = {it.category_id for it in items if it.category_id}
    categories = {c.id: c for c in Category.query.filter(Category.id.in_(category_ids), Category.tenant_id == tenant_id).all()} if category_ids else {}
    
    out = []
    for it in items:
        category = categories.get(it.category_id)
        item_data = {
            "id":it.id,
            "sku": it.sku,
            "name":it.name,
            "brand":it.brand,
            "category_id":it.category_id,
            "category_name": category.name if category else None,
            "description": it.description,
        }
            
        out.append(item_data)
    return jsonify(out), 200

def create_item_controller():
    data = request.get_json() or {}
    name = data.get("name")
    category_id = data.get("category_id")
    identity = get_jwt_identity() or {}
    tenant_id = identity.get("tenant_id")
    if not all([name, category_id]):
        return jsonify({"msg":"name and category_id required"}), 400
    if tenant_id is None:
        return jsonify({"msg":"tenant_id required"}), 400
    it = create_item(name, category_id, sku=data.get("sku"), brand=data.get("brand"), description=data.get("description"), tenant_id=tenant_id)
    return jsonify({"id":it.id,"name":it.name}), 201

def list_categories_controller():
    identity = get_jwt_identity() or {}
    tenant_id = identity.get("tenant_id")
    query = Category.query
    if tenant_id is not None:
        query = query.filter_by(tenant_id=tenant_id)
    categories = query.order_by(Category.name.asc()).all()
    out = [{"id":c.id,"name":c.name} for c in categories]
    return jsonify(out), 200

def create_category_controller():
    data = request.get_json() or {}
    name = data.get("name")
    identity = get_jwt_identity() or {}
    tenant_id = identity.get("tenant_id")
    if not name:
        return jsonify({"msg": "Category name is required"}), 400
    if tenant_id is None:
        return jsonify({"msg": "tenant_id required"}), 400
    
    existing = Category.query.filter_by(name=name, tenant_id=tenant_id).first()
    if existing:
        return jsonify({"msg": "Category already exists"}), 400
        
    category = Category(name=name, tenant_id=tenant_id)
    db.session.add(category)
    db.session.commit()
    return jsonify({"id": category.id, "name": category.name}), 201

def delete_category_controller(category_id):
    category = Category.query.get(category_id)
    if not category:
        return jsonify({"msg": "Category not found"}), 404
    
    # Check if category is in use by any items
    items_count = Item.query.filter_by(category_id=category_id).count()
    if items_count > 0:
        return jsonify({"msg": f"Cannot delete category: it is being used by {items_count} products"}), 400
        
    db.session.delete(category)
    db.session.commit()
    return jsonify({"msg": "Category deleted successfully"}), 200

def update_item_controller(item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({"msg": "Item not found"}), 404
    data = request.get_json() or {}
    item.sku = data.get("sku", item.sku)
    item.name = data.get("name", item.name)
    item.category_id = data.get("category_id", item.category_id)
    item.brand = data.get("brand", item.brand)
    item.description = data.get("description", item.description)
    db.session.commit()
    return jsonify({"msg": "Item updated", "id": item.id}), 200

def delete_item_controller(item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({"msg": "Item not found"}), 404
    
    # Cleanup related records to prevent "N/A" orphans and foreign key violations
    from models.stock import ShopStock, StockMovement, StockBatch, EmptyCylinderStock, SaleCylinderReturn
    from models.supplier import SupplierInvoiceItem, supplier_items
    from models.sale import SaleItem
    from models.transfer import TransferItem

    # 1. Handle shop stock
    ShopStock.query.filter_by(item_id=item_id).delete()

    # 2. Handle Supplier records (Foreign Keys)
    # supplier_items association table
    db.session.execute(supplier_items.delete().where(supplier_items.c.item_id == item_id))
    # supplier_invoice_items table
    SupplierInvoiceItem.query.filter_by(item_id=item_id).delete()

    # 3. Handle other orphan records (loose associations)
    # Important: Delete SaleItem by batch reference too just in case
    batch_ids = [b.id for b in StockBatch.query.filter_by(item_id=item_id).all()]
    if batch_ids:
        SaleItem.query.filter(SaleItem.batch_id.in_(batch_ids)).delete(synchronize_session=False)

    SaleItem.query.filter_by(item_id=item_id).delete()
    StockBatch.query.filter_by(item_id=item_id).delete()
    StockMovement.query.filter_by(item_id=item_id).delete()
    EmptyCylinderStock.query.filter_by(item_id=item_id).delete()
    SaleCylinderReturn.query.filter_by(item_id=item_id).delete()
    TransferItem.query.filter_by(item_id=item_id).delete()

    db.session.delete(item)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting item {item_id}: {str(e)}")
        return jsonify({"msg": "Error deleting item due to database constraints", "error": str(e)}), 500

    return jsonify({"msg": "Item and all associated records deleted successfully"}), 200
