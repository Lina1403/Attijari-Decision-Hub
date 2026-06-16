from __future__ import annotations

from flask import jsonify


def success_response(*, data=None, message="OK", meta=None, status_code=200):
    payload = {
        "success": True,
        "message": message,
        "data": data,
        "meta": meta or {},
        "errors": [],
    }
    return jsonify(payload), status_code


def error_response(*, message, status="ERROR", errors=None, status_code=500):
    payload = {
        "success": False,
        "message": message,
        "data": None,
        "meta": {"status": status},
        "errors": errors or [],
    }
    return jsonify(payload), status_code
