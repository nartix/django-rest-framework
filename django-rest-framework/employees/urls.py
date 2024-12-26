from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, index

# urlpatterns = [
#     path('', index, name='index'),
# ]

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)

urlpatterns = [
    path('', index, name='index'),
    path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
]
