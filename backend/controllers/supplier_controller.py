from flask import request, jsonify
from services.supplier_service import (
    create_supplier, list_suppliers, update_supplier, delete_supplier,
    create_supplier_invoice, list_supplier_invoices, get_supplier_invoice,
    delete_supplier_invoice,
    update_invoice_status, record_invoice_payment, get_supplier_products
)
from extensions import db
from models.supplier import Supplier, SupplierInvoice
from flask_jwt_extended import get_jwt_identity

def list_suppliers_controller():
    identity = get_jwt_identity() or {}
    suppliers = list_suppliers(tenant_id=identity.get("tenant_id"))
    out = []
    for s in suppliers:
        out.append({
            "id": s.id,
            "name": s.name,
            "contact_person": s.contact_person,
            "phone": s.phone,
            "email": s.email,
            "address": s.address,
            "created_at": s.created_at.isoformat(),
            "supplied_products": [{"id": p.id, "name": p.name} for p in s.supplied_products]
        })
    return jsonify(out), 200

def create_supplier_controller():
    data = request.get_json() or {}
    name = data.get("name")
    if not name:
        return jsonify({"msg": "Supplier name is required"}), 400
    s = create_supplier(
        name=name,
        contact_person=data.get("contact_person"),
        phone=data.get("phone"),
        email=data.get("email"),
        address=data.get("address"),
        item_ids=data.get("item_ids", []),
        tenant_id=(get_jwt_identity() or {}).get("tenant_id"),
    )
    return jsonify({"id": s.id, "name": s.name}), 201

def update_supplier_controller(supplier_id):
    data = request.get_json() or {}
    s = update_supplier(supplier_id, **data)
    if not s:
        return jsonify({"msg": "Supplier not found"}), 404
    return jsonify({"msg": "Supplier updated", "id": s.id}), 200

def delete_supplier_controller(supplier_id):
    success = delete_supplier(supplier_id)
    if not success:
        return jsonify({"msg": "Supplier not found"}), 404
    return jsonify({"msg": "Supplier deleted"}), 200

def list_invoices_controller():
    invoices = list_supplier_invoices()
    out = []
    for inv in invoices:
        out.append({
            "id": inv.id,
            "supplier_id": inv.supplier_id,
            "supplier_name": inv.supplier.name,
            "invoice_number": inv.invoice_number,
            "total_amount": float(inv.total_amount),
            "amount_paid": float(inv.amount_paid or 0),
            "status": inv.status,
            "received_date": inv.received_date.isoformat(),
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "notes": inv.notes,
            "created_at": inv.created_at.isoformat()
        })
    return jsonify(out), 200

def create_invoice_controller():
    data = request.get_json() or {}
    supplier_id = data.get("supplier_id")
    invoice_number = data.get("invoice_number")
    items_data = data.get("items") # list of {item_id, quantity, unit_cost, shop_id}
    user_identity = get_jwt_identity()
    user_id = user_identity.get("id")
    
    if not all([supplier_id, invoice_number, items_data]):
        return jsonify({"msg": "supplier_id, invoice_number, and items are required"}), 400
    
    try:
        inv = create_supplier_invoice(
            supplier_id=supplier_id,
            invoice_number=invoice_number,
            items_data=items_data,
            status=data.get("status", "Pending"),
            received_date=data.get("received_date"),
            due_date=data.get("due_date"),
            notes=data.get("notes"),
            user_id=user_id
        )
        return jsonify({"id": inv.id, "invoice_number": inv.invoice_number}), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

def get_invoice_controller(invoice_id):
    inv = get_supplier_invoice(invoice_id)
    if not inv:
        return jsonify({"msg": "Invoice not found"}), 404
    
    items_out = []
    for item in inv.items:
        items_out.append({
            "id": item.id,
            "item_id": item.item_id,
            "item_name": item.item.name,
            "shop_id": item.shop_id,
            "shop_name": item.shop.name if item.shop else "N/A",
            "quantity": item.quantity,
            "unit_cost": float(item.unit_cost),
            "total_cost": float(item.total_cost)
        })

    payments_out = []
    for p in inv.payments:
        payments_out.append({
            "id": p.id,
            "amount": float(p.amount),
            "payment_method": p.payment_method,
            "notes": p.notes,
            "created_at": p.created_at.isoformat()
        })

    return jsonify({
        "id": inv.id,
        "supplier_id": inv.supplier_id,
        "supplier_name": inv.supplier.name,
        "invoice_number": inv.invoice_number,
        "total_amount": float(inv.total_amount),
        "amount_paid": float(inv.amount_paid or 0),
        "status": inv.status,
        "received_date": inv.received_date.isoformat(),
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "notes": inv.notes,
        "items": items_out,
        "payments": payments_out
    }), 200

def delete_invoice_controller(invoice_id):
    try:
        success = delete_supplier_invoice(invoice_id)
        if not success:
            return jsonify({"msg": "Invoice not found"}), 404
        return jsonify({"msg": "Invoice deleted successfully"}), 200
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400
    except Exception as e:
        return jsonify({"msg": "Internal Server Error"}), 500

def update_invoice_status_controller(invoice_id):
    data = request.get_json() or {}
    status = data.get("status")
    if not status:
        return jsonify({"msg": "Status is required"}), 400
    inv = update_invoice_status(invoice_id, status)
    if not inv:
        return jsonify({"msg": "Invoice not found"}), 404
    return jsonify({"msg": "Status updated", "id": inv.id}), 200

def record_invoice_payment_controller(invoice_id):
    data = request.get_json() or {}
    amount = data.get("amount")
    payment_method = data.get("payment_method", "mobile_money")
    notes = data.get("notes")
    
    if amount is None:
        return jsonify({"msg": "Amount is required"}), 400
    
    try:
        payment = record_invoice_payment(
            invoice_id=invoice_id,
            amount=amount,
            payment_method=payment_method,
            notes=notes
        )
        return jsonify({"msg": "Payment recorded", "payment_id": payment.id}), 201
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400
    except Exception as e:
        return jsonify({"msg": "Internal Server Error"}), 500

def list_supplier_products_controller(supplier_id):
    products = get_supplier_products(supplier_id)
    out = []
    for p in products:
        category_name = None
        if getattr(p, 'category_id', None):
            from models.product import Category
            category = Category.query.get(p.category_id)
            category_name = category.name if category else None
        out.append({"id": p.id, "name": p.name, "category_name": category_name})
    return jsonify(out), 200
