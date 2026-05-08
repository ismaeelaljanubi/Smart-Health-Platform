from django.db import models
from django.contrib.auth import get_user_model
from accounts.models import PatientProfile, DoctorProfile

User = get_user_model()

class MedicalRecord(models.Model):
    VISIT_TYPES = (
        ('فحص دوري', 'فحص دوري'),
        ('استشارة', 'استشارة'),
        ('طارئ', 'طارئ'),
        ('متابعة', 'متابعة'),
    )
    
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='medical_records')
    diagnosis = models.TextField()
    prescription = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    date = models.DateTimeField(auto_now_add=True)
    visit_type = models.CharField(max_length=20, choices=VISIT_TYPES, default='فحص دوري')
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"سجل طبي لـ {self.patient.user.get_full_name()} - {self.date}"

class VitalSigns(models.Model):
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='vital_signs')
    recorded_at = models.DateTimeField(auto_now_add=True)
    blood_pressure_systolic = models.IntegerField()
    blood_pressure_diastolic = models.IntegerField()
    heart_rate = models.IntegerField()
    blood_sugar = models.FloatField()
    temperature = models.FloatField(null=True, blank=True)
    oxygen_saturation = models.IntegerField(null=True, blank=True)
    recorded_by = models.ForeignKey(DoctorProfile, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-recorded_at']
    
    def __str__(self):
        return f"علامات حيوية لـ {self.patient.user.get_full_name()} - {self.recorded_at}"

class AIAnalysisResult(models.Model):
    RISK_LEVELS = (
        ('منخفض', 'منخفض'),
        ('متوسط', 'متوسط'),
        ('مرتفع', 'مرتفع'),
    )
    
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='ai_analyses')
    analysis_date = models.DateTimeField(auto_now_add=True)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS)
    risk_score = models.FloatField()
    details = models.TextField()
    recommendations = models.TextField(blank=True)
    related_vital_signs = models.ManyToManyField(VitalSigns, blank=True)
    
    class Meta:
        ordering = ['-analysis_date']
    
    def __str__(self):
        return f"تحليل AI لـ {self.patient.user.get_full_name()} - {self.risk_level}"
class Surgery(models.Model):
    SURGERY_STATUS = (
        ('scheduled', 'مجدولة'),
        ('completed', 'مكتملة'),
        ('cancelled', 'ملغاة'),
    )
    
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='surgeries')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='surgeries')
    surgery_name = models.CharField(max_length=200)
    surgery_date = models.DateTimeField()
    hospital = models.CharField(max_length=200)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=SURGERY_STATUS, default='scheduled')
    post_surgery_medications = models.TextField(blank=True, verbose_name="الأدوية والمسكنات بعد العملية")
    doctor_side_effects = models.TextField(blank=True, verbose_name="الأعراض الجانبية (تقرير الطبيب)")
    patient_side_effects = models.TextField(blank=True, verbose_name="الأعراض الجانبية (تقرير المريض)")
    completion_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['surgery_date']
    
    def __str__(self):
        return f"{self.surgery_name} - {self.patient.user.get_full_name()}"    
    

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('scheduled', 'مجدول'),
        ('completed', 'مكتمل'),
        ('cancelled', 'ملغي'),
    )
    
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='appointments')
    appointment_date = models.DateTimeField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['appointment_date']
    
    def __str__(self):
        return f"موعد {self.patient.user.get_full_name()} مع د. {self.doctor.user.get_full_name()} في {self.appointment_date}"    
    

    