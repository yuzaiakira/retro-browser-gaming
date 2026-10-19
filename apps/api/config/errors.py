from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if isinstance(exc, DjangoValidationError):
        response = Response({"detail": "Invalid request."}, status=422)
    if response is None:
        return None
    request = context.get("request")
    messages = {
        400: "Invalid request.",
        403: "Access denied.",
        404: "This resource is unavailable.",
        405: "Method not allowed.",
        422: "Invalid request.",
        503: "Storage unavailable.",
    }
    response.data = {
        "error": {
            "code": {404: "NOT_FOUND", 405: "READ_ONLY"}.get(
                response.status_code, "REQUEST_REJECTED"
            ),
            "message": messages.get(response.status_code, "Request failed."),
            "requestId": getattr(request, "request_id", ""),
            "details": {},
        }
    }
    return response


def server_error(request):
    return JsonResponse(
        {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Request failed.",
                "requestId": getattr(request, "request_id", ""),
                "details": {},
            }
        },
        status=500,
    )
