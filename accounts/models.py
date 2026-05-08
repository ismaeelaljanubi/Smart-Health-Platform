
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    USER_TYPES = (
        ('patient', 'مريض'),
        ('doctor', 'طبيب'),
        ('admin', 'مشرف'),
    )
    
    user_type = models.CharField(max_length=10, choices=USER_TYPES, default='patient')
    phone = models.CharField(max_length=15, blank=True)
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    
    def str(self):
        return f"{self.get_full_name()} ({self.get_user_type_display()})"

class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    created_by = models.ForeignKey('DoctorProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='added_patients')
    national_id = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    blood_type = models.CharField(max_length=5, blank=True)
    allergies = models.TextField(blank=True)
    chronic_diseases = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=50, blank=True)
    emergency_phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    
    def str(self):
        return f"ملف مريض: {self.user.get_full_name()}"

class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    license_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    specialization = models.CharField(max_length=100, blank=True)
    hospital = models.CharField(max_length=200, blank=True)
    years_experience = models.IntegerField(default=0)
    bio = models.TextField(blank=True)
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    def str(self):
        return f"د. {self.user.get_full_name()} - {self.specialization}"
