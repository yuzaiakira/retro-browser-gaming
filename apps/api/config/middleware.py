import json
import logging
import time
import uuid


class RequestContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Do not trust inbound arbitrary request identifiers in logs.
        request.request_id = str(uuid.uuid4())
        started = time.monotonic()
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        response["Cross-Origin-Opener-Policy"] = "same-origin"
        response["Cross-Origin-Embedder-Policy"] = "require-corp"
        response["Cross-Origin-Resource-Policy"] = "same-origin"
        response["Referrer-Policy"] = "same-origin"
        response["X-Content-Type-Options"] = "nosniff"
        # Admin needs its own CSS/JS; do not allow user-supplied scripts.
        response["Content-Security-Policy"] = (
            "default-src 'none'; script-src 'self'; style-src 'self'; "
            "img-src 'self' data:; font-src 'self'; form-action 'self'; "
            "base-uri 'none'; frame-ancestors 'none'"
        )
        if request.path.startswith("/api/"):
            response["Cache-Control"] = "no-store"
        logging.getLogger("retro").info(
            json.dumps(
                {
                    "requestId": request.request_id,
                    "method": request.method,
                    "status": response.status_code,
                    "durationMs": round((time.monotonic() - started) * 1000),
                }
            )
        )
        return response
