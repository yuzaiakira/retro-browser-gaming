"""Server-side product-approval authorization helpers."""

from django.contrib.auth.models import AbstractBaseUser
from django.core.exceptions import PermissionDenied

PRODUCT_APPROVE_PERM = "catalog.approve_game_product"


def user_can_approve_product(user: AbstractBaseUser | None) -> bool:
    """True for authenticated actors holding approve_game_product (incl. superuser)."""
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return bool(user.has_perm(PRODUCT_APPROVE_PERM))


def require_product_approve_permission(user: AbstractBaseUser | None) -> None:
    if not user_can_approve_product(user):
        raise PermissionDenied(
            "Product catalog decisions require the catalog.approve_game_product permission."
        )
