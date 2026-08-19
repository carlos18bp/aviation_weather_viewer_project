from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    """Return the public liveness contract without infrastructure details."""
    return Response(
        {
            "status": "ok",
            "service": settings.SERVICE_NAME,
            "environment": settings.DJANGO_ENV,
        }
    )
