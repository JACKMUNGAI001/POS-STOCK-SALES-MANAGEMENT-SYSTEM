from flask import jsonify, Response
from services.receipt_service import get_receipt_by_uuid

def get_receipt_controller(uuid):
    r = get_receipt_by_uuid(uuid)
    if not r:
        return jsonify({"msg": "Receipt not found"}), 404
    return Response(r.payload, mimetype='text/html')
