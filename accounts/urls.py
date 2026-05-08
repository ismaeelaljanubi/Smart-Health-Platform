from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.EmailLoginView.as_view(), name='email_login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('patient/update/<int:patient_id>/', views.UpdatePatientProfileView.as_view(), name='update_patient_profile'),
]