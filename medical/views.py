from rest_framework.views import APIView
from accounts.models import User
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
#from .gemini_ai import analyze_with_gemini
#from .deepseek_ai import analyze_with_deepseek
#from .deepseek_ai import analyze_with_deepseek, analyze_text_with_deepseek
from .openrouter_ai import analyze_symptoms_with_ai
# from .openrouter_ai import analyze_with_openrouter as analyze_with_gemini, analyze_text_with_openrouter as analyze_text_with_gemini
from django.shortcuts import get_object_or_404
from django.db.models import Q
# from .openrouter_ai import analyze_symptoms_with_ai (تم حذفه للتكرار)
from .models import MedicalRecord, VitalSigns, AIAnalysisResult, Appointment, Surgery
from accounts.models import PatientProfile, DoctorProfile
from django.contrib.auth import get_user_model 
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .serializers import (
    MedicalRecordSerializer, 
    VitalSignsSerializer,
    AIAnalysisResultSerializer,
    AppointmentSerializer,
    SurgerySerializer
)
from accounts.serializers import DoctorProfileSerializer, PatientProfileSerializer  # 👈 أضف هذا السطر

from .ai_utils import assess_risk_level

User = get_user_model()





# ============================================
# ✅ عرض سجلات المريض (للمريض نفسه)
# ============================================
@extend_schema(
    summary="السجلات الطبية للمريض الحالي",
    description="إرجاع جميع السجلات الطبية للمريض الذي يملك التوكن.",
    responses={
        200: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
        404: {"description": "ملف المريض غير موجود"},
    }
)
class PatientRecordsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            patient_profile = PatientProfile.objects.get(user=request.user)
        except PatientProfile.DoesNotExist:
            return Response(
                {"error": "ملف المريض غير موجود"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        records = MedicalRecord.objects.filter(patient=patient_profile)
        serializer = MedicalRecordSerializer(records, many=True)
        return Response(serializer.data)


# ============================================
# ✅ جلب قائمة المرضى للطبيب (محدث)
# ============================================
@extend_schema(
    summary="قائمة المرضى للطبيب",
    description="إرجاع قائمة المرضى الذين سجلوا للطبيب الحالي مع آخر زيارة ومستوى الخطر.",
    responses={
        200: OpenApiTypes.OBJECT,
        401: OpenApiTypes.OBJECT,
        404: {"description": "ملف الطبيب غير موجود"},
    }
)
class DoctorPatientsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
        except DoctorProfile.DoesNotExist:
            return Response(
                {"error": "ملف الطبيب غير موجود"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # جلب جميع المرضى الذين أضافهم هذا الطبيب أو لديهم سجلات معه أو لديهم مواعيد معه
        patients = PatientProfile.objects.filter(
            Q(created_by=doctor_profile) | 
            Q(medical_records__doctor=doctor_profile) |
            Q(appointments__doctor=doctor_profile)
        ).distinct()
        
        patients_data = []
        for patient in patients:
            latest_record = patient.medical_records.filter(
                doctor=doctor_profile
            ).first()
            latest_analysis = patient.ai_analyses.first()
            
            patients_data.append({
                'id': patient.id,
                'full_name': patient.user.get_full_name(),
                'national_id': patient.national_id,
                'phone': patient.user.phone,
                'blood_type': patient.blood_type,
                'address': patient.address,
                'last_visit': latest_record.date if latest_record else None,
                'status': latest_record.visit_type if latest_record else 'لا توجد',
                'risk_level': latest_analysis.risk_level if latest_analysis else 'غير محدد',
                'diagnosis': latest_record.diagnosis if latest_record else ''
            })
        
        return Response(patients_data)


# ============================================
# ✅ إضافة مريض جديد (جديد)
# ============================================
@extend_schema(
    summary="إضافة مريض جديد",
    description="يقوم الطبيب بإضافة مريض جديد إلى النظام. يتم إنشاء حساب مستخدم وملف مريض. كلمة المرور الافتراضية هي 'default123'.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "full_name": {"type": "string", "description": "الاسم الكامل"},
                "national_id": {"type": "string", "description": "الرقم الوطني (فريد)"},
                "phone": {"type": "string", "description": "رقم الهاتف"},
                "blood_type": {"type": "string", "description": "فصيلة الدم"},
                "address": {"type": "string", "description": "العنوان"},
            },
            "required": ["full_name", "national_id"],
        }
    },
    responses={
        201: OpenApiTypes.OBJECT,
        400: {"description": "الرقم الوطني موجود مسبقاً أو بيانات غير صحيحة"},
        401: {"description": "غير مصرح"},
        403: {"description": "ملف الطبيب غير موجود"},
    }
)
class AddPatientView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
        except DoctorProfile.DoesNotExist:
            return Response(
                {"error": "ملف الطبيب غير موجود"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data
        
        # التحقق من البيانات الأساسية
        email = data.get('email')
        full_name = data.get('full_name')
        password = data.get('password')
        
        if not email or not full_name or not password:
            return Response(
                {"error": "الاسم الكامل، البريد الإلكتروني وكلمة المرور مطلوبة"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # التحقق من وجود البريد مسبقاً
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "البريد الإلكتروني موجود مسبقاً"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # التحقق من الرقم الوطني (إذا تم إدخاله)
        national_id = data.get('national_id')
        if national_id and PatientProfile.objects.filter(national_id=national_id).exists():
            return Response(
                {"error": "الرقم الوطني موجود مسبقاً"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # إنشاء اسم المستخدم من البريد الإلكتروني
        username = email.split('@')[0]
        # التأكد من عدم تكرار اسم المستخدم
        original_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{original_username}{counter}"
            counter += 1
        
        # تقسيم الاسم الكامل
        name_parts = full_name.strip().split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        # إنشاء المستخدم
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password,
            phone=data.get('phone', ''),
            user_type='patient'
        )
        
        # إنشاء ملف المريض
        patient = PatientProfile.objects.create(
            user=user,
            national_id=national_id or '',
            blood_type=data.get('blood_type', ''),
            address=data.get('address', ''),
            created_by=doctor_profile 
        )
        
        return Response({
            'id': patient.id,
            'full_name': user.get_full_name(),
            'email': user.email,
            'national_id': patient.national_id,
            'phone': user.phone,
            'blood_type': patient.blood_type,
            'address': patient.address,
            'message': '✅ تم إضافة المريض بنجاح'
        }, status=status.HTTP_201_CREATED)

# ============================================
# ✅ إضافة سجل طبي (محدث)
# ============================================
@extend_schema(
    summary="إضافة سجل طبي جديد",
    description="يقوم الطبيب بإضافة تشخيص ووصفة لمريض معين.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer"},
                "diagnosis": {"type": "string"},
                "prescription": {"type": "string"},
                "notes": {"type": "string"},
                "visit_type": {"type": "string", "enum": ["فحص دوري", "استشارة", "طارئ", "متابعة"]},
            },
            "required": ["patient_id", "diagnosis"]
        }
    },
    responses={
        201: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        403: {"description": "ليس لديك صلاحية لهذا المريض"},
        404: {"description": "المريض غير موجود"},
    }
)
class AddMedicalRecordView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
        except DoctorProfile.DoesNotExist:
            return Response(
                {"error": "ملف الطبيب غير موجود"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        patient_id = request.data.get('patient_id')
        try:
            patient_profile = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response(
                {"error": "المريض غير موجود"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # إنشاء السجل الطبي
        record = MedicalRecord.objects.create(
            patient=patient_profile,
            doctor=doctor_profile,
            diagnosis=request.data.get('diagnosis'),
            prescription=request.data.get('prescription', ''),
            notes=request.data.get('notes', ''),
            visit_type=request.data.get('visit_type', 'فحص دوري')
        )
        
        serializer = MedicalRecordSerializer(record)
        return Response({
            **serializer.data,
            'message': '✅ تم إضافة التقرير بنجاح'
        }, status=status.HTTP_201_CREATED)


# ============================================
# ✅ تحليل المخاطر بالذكاء الاصطناعي
# ============================================
"""
class AnalyzeRiskView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        patient_id = request.data.get('patient_id')
        
        try:
            patient_profile = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response(
                {"error": "المريض غير موجود"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # جلب آخر 5 علامات حيوية
        vital_signs = VitalSigns.objects.filter(
            patient=patient_profile
        ).order_by('-recorded_at')[:5]
        
        if len(vital_signs) == 0:
            return Response(
                {"error": "لا توجد علامات حيوية كافية للتحليل"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # استخدام Gemini للتحليل
        result = analyze_with_gemini(vital_signs_list=vital_signs)
        
        # حفظ النتيجة
        analysis = AIAnalysisResult.objects.create(
            patient=patient_profile,
            risk_level=result['risk_level'],
            risk_score=result['risk_score'],
            details=result['details'],
            recommendations=result['recommendations']
        )
        
        analysis.related_vital_signs.set(vital_signs)
        
        # تجهيز بيانات العلامات الحيوية للإرسال
        vital_data = []
        for v in vital_signs:
            vital_data.append({
                'date': v.recorded_at,
                'blood_pressure': f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}",
                'heart_rate': v.heart_rate,
                'blood_sugar': v.blood_sugar,
                'temperature': v.temperature,
                'oxygen': v.oxygen_saturation
            })
        
        return Response({
            'risk_level': result['risk_level'],
            'risk_score': result['risk_score'],
            'details': result['details'],
            'recommendations': result['recommendations'],
            'patient_name': patient_profile.user.get_full_name(),
            'analysis_date': analysis.analysis_date,
            'vital_signs_used': vital_data
        })
"""
from drf_spectacular.utils import extend_schema, OpenApiTypes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import PatientProfile, VitalSigns, AIAnalysisResult
from .openrouter_ai import analyze_symptoms_with_ai


@extend_schema(
    summary="تحليل مخاطر المريض",
    description="يقوم بتحليل آخر 5 علامات حيوية للمريض وإرجاع مستوى الخطر والتوصيات",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "معرف المريض"},
            },
            "required": ["patient_id"]
        }
    },
    responses={
        200: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        404: OpenApiTypes.OBJECT,
    }
)
class AnalyzeRiskView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        patient_id = request.data.get('patient_id')
        text_input = request.data.get('text', '')  # دعم النص الحر (الأعراض)
        
        if not patient_id:
            # إذا لم يتم إرسال patient_id، نحاول استخراجه من المستخدم الحالي إذا كان مريضاً
            try:
                patient_profile = PatientProfile.objects.get(user=request.user)
                patient_id = patient_profile.id
            except PatientProfile.DoesNotExist:
                return Response({"error": "patient_id مطلوب"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                patient_profile = PatientProfile.objects.get(id=patient_id)
            except PatientProfile.DoesNotExist:
                return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)
        
        # تحقق من الصلاحية: المريض لنفسه، أو الطبيب المعالج، أو المشرف
        user = request.user
        if user.user_type == 'patient' and user.id != patient_profile.user.id:
            return Response({"error": "ليس لديك صلاحية لتحليل بيانات مريض آخر"}, status=status.HTTP_403_FORBIDDEN)
        elif user.user_type == 'doctor':
            doctor_profile = DoctorProfile.objects.get(user=user)
            is_creator = patient_profile.created_by == doctor_profile
            has_record = MedicalRecord.objects.filter(patient=patient_profile, doctor=doctor_profile).exists()
            if not (is_creator or has_record):
                return Response({"error": "ليس لديك صلاحية لتحليل بيانات هذا المريض"}, status=status.HTTP_403_FORBIDDEN)
        
        # 1. جلب العلامات الحيوية (آخر 5)
        vital_signs = VitalSigns.objects.filter(
            patient=patient_profile
        ).order_by('-recorded_at')[:5]
        
        vital_summary = ""
        if vital_signs.exists():
            avg_systolic = sum(v.blood_pressure_systolic for v in vital_signs) / len(vital_signs)
            avg_diastolic = sum(v.blood_pressure_diastolic for v in vital_signs) / len(vital_signs)
            avg_heart = sum(v.heart_rate for v in vital_signs) / len(vital_signs)
            avg_sugar = sum(v.blood_sugar for v in vital_signs) / len(vital_signs)
            
            vital_summary = f"""
            العلامات الحيوية (متوسط آخر 5 قراءات):
            - الضغط: {avg_systolic:.0f}/{avg_diastolic:.0f}
            - النبض: {avg_heart:.0f} نبضة/دقيقة
            - السكر: {avg_sugar:.1f} ملغ/دل
            """

        # 2. بناء النص للتحليل
        combined_text = f"الأعراض المبلغ عنها: {text_input if text_input else 'لم يتم إدخال نص'}\n{vital_summary}"
        
        if not text_input and not vital_summary:
             return Response({"error": "لا توجد بيانات كافية للتحليل (نص أو علامات حيوية)"}, status=status.HTTP_400_BAD_REQUEST)

        # 3. استدعاء الذكاء الاصطناعي (OpenRouter)
        result = analyze_symptoms_with_ai(symptoms_text=combined_text)
        
        # 4. حفظ النتيجة في قاعدة البيانات
        analysis = AIAnalysisResult.objects.create(
            patient=patient_profile,
            risk_level=result.get('risk_level', 'غير معروف'),
            risk_score=result.get('risk_score', 0),
            details=result.get('details', ''),
            recommendations=result.get('recommendations', '')
        )
        
        if vital_signs.exists():
            analysis.related_vital_signs.set(vital_signs)
        
        # 5. تجهيز بيانات العلامات الحيوية للرد
        vital_data = [
            {
                'date': v.recorded_at,
                'blood_pressure': f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}",
                'heart_rate': v.heart_rate,
                'blood_sugar': v.blood_sugar,
                'temperature': v.temperature,
                'oxygen': v.oxygen_saturation
            } for v in vital_signs
        ]
        
        return Response({
            "risk_level": analysis.risk_level,
            "risk_score": analysis.risk_score,
            "details": analysis.details,
            "recommendations": analysis.recommendations,
            "patient_name": patient_profile.user.get_full_name(),
            "analysis_date": analysis.analysis_date,
            "vital_signs_used": vital_data
        }, status=status.HTTP_200_OK)
# ============================================
# ✅ آخر تحليل للمريض
# ============================================
@extend_schema(
    summary="آخر تحليل مخاطر للمريض الحالي",
    description="إرجاع آخر نتيجة تحليل تم إجراؤها للمريض المسجل دخوله.",
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
        404: {"description": "ملف المريض غير موجود أو لا يوجد تحليل"},
    }
)
class PatientLatestAnalysisView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            patient_profile = PatientProfile.objects.get(user=request.user)
        except PatientProfile.DoesNotExist:
            return Response(
                {"error": "ملف المريض غير موجود"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        latest_analysis = patient_profile.ai_analyses.first()
        if latest_analysis:
            serializer = AIAnalysisResultSerializer(latest_analysis)
            return Response(serializer.data)
        return Response(None)


# ============================================
# ✅ عرض العلامات الحيوية للمريض
# ============================================

# ============================================
# ✅ جلب العلامات الحيوية لمريض معين
# ============================================
@extend_schema(
    summary="عرض العلامات الحيوية لمريض",
    description="إرجاع آخر 20 علامة حيوية للمريض. يمكن للمريض نفسه أو الطبيب المعالج أو المشرف.",
    parameters=[
        OpenApiParameter(name="user_id", description="معرف المستخدم (user id)", required=True, type=int),
    ],
    responses={
        200: OpenApiTypes.OBJECT,
        403: {"description": "ليس لديك صلاحية"},
        404: {"description": "المريض غير موجود"},
    }
)
class PatientVitalSignsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, patient_id):
        try:
            # محاولة جلب ملف المريض باستخدام المعرف الممرر
            try:
                patient = PatientProfile.objects.get(id=patient_id)
            except (PatientProfile.DoesNotExist, ValueError):
                patient = PatientProfile.objects.get(user_id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=404)
        
        user = request.user
        
        # التحقق من الصلاحية
        if user.id == patient.user.id or user.user_type == 'admin':
            pass
        else:
            try:
                doctor = DoctorProfile.objects.get(user=user)
                if not MedicalRecord.objects.filter(patient=patient, doctor=doctor).exists():
                    return Response({"error": "ليس لديك صلاحية"}, status=403)
            except DoctorProfile.DoesNotExist:
                return Response({"error": "ليس لديك صلاحية"}, status=403)
        
        vital_signs = VitalSigns.objects.filter(patient=patient).order_by('-recorded_at')[:20]
        serializer = VitalSignsSerializer(vital_signs, many=True)
        return Response(serializer.data)

# ============================================
# ✅ إضافة علامات حيوية جديدة
# ============================================
@extend_schema(
    summary="إضافة علامات حيوية لمريض",
    description="يسمح للمريض نفسه أو للطبيب المعالج بإضافة علامات حيوية.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer"},
                "blood_pressure_systolic": {"type": "integer"},
                "blood_pressure_diastolic": {"type": "integer"},
                "heart_rate": {"type": "integer"},
                "blood_sugar": {"type": "number"},
                "temperature": {"type": "number", "nullable": True},
                "oxygen_saturation": {"type": "integer", "nullable": True},
            },
            "required": ["patient_id", "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "blood_sugar"]
        }
    },
    responses={
        201: OpenApiTypes.OBJECT,
        400: OpenApiTypes.OBJECT,
        403: {"description": "ليس لديك صلاحية"},
        404: {"description": "المريض غير موجود"},
    }
)
class AddVitalSignsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response({"error": "patient_id مطلوب"}, status=400)
        
        try:
            # نحاول البحث بـ ID ملف المريض أولاً، ثم بـ User ID إذا فشل
            try:
                patient_profile = PatientProfile.objects.get(id=patient_id)
            except (PatientProfile.DoesNotExist, ValueError):
                patient_profile = PatientProfile.objects.get(user_id=patient_id)
        except PatientProfile.DoesNotExist:
            print(f"[ERROR] Patient with ID {patient_id} not found")
            return Response({"error": "المريض غير موجود"}, status=404)
        
        user = request.user
        
        # السماح للمريض نفسه أو للمشرف أو للطبيب الذي لديه صلاحية
        if user.id == patient_profile.user.id or user.user_type == 'admin':
            recorded_by = None
        else:
            try:
                doctor_profile = DoctorProfile.objects.get(user=user)
                # التحقق إذا كان الطبيب هو من أضاف المريض أو لديه سجل طبي معه
                if patient_profile.created_by == doctor_profile or MedicalRecord.objects.filter(patient=patient_profile, doctor=doctor_profile).exists():
                    recorded_by = doctor_profile
                else:
                    print(f"[ERROR] Doctor {user.id} does not have permission for patient {patient_id}")
                    return Response({"error": "ليس لديك صلاحية لإضافة علامات حيوية لهذا المريض"}, status=403)
            except DoctorProfile.DoesNotExist:
                print(f"[ERROR] User {user.id} is not a patient, admin, or doctor")
                return Response({"error": "ليس لديك صلاحية"}, status=403)
        
        print(f"[DEBUG] Received vital signs data: {request.data}")

        try:
            vital_sign = VitalSigns.objects.create(
                patient=patient_profile,
                blood_pressure_systolic=request.data.get('blood_pressure_systolic'),
                blood_pressure_diastolic=request.data.get('blood_pressure_diastolic'),
                heart_rate=request.data.get('heart_rate'),
                blood_sugar=request.data.get('blood_sugar'),
                temperature=request.data.get('temperature'),
                oxygen_saturation=request.data.get('oxygen_saturation'),
                recorded_by=recorded_by
            )
            serializer = VitalSignsSerializer(vital_sign)
            print(f"[DEBUG] Vital signs saved successfully: {serializer.data}")
            return Response(serializer.data, status=201)
        except Exception as e:
            print(f"[ERROR] Failed to save vital signs: {e}")
            return Response({"error": f"فشل في إضافة العلامات الحيوية: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================
# ✅ إضافة نموذج Surgery (اختياري - إذا أردت تخزين العمليات)
# ============================================
# إذا أردت إضافة نموذج للعمليات الجراحية، أضف هذا في models.py أولاً
# ثم أضف هذه الـ Views    


# ============================================
# ✅ جلب بيانات مريض معين (للعرض)
# ============================================
@extend_schema(
    summary="جلب بيانات ملف مريض معين",
    description="إرجاع المعلومات الشخصية والطبية لمريض محدد. يسمح للمريض نفسه أو للطبيب المعالج.",
    parameters=[
        OpenApiParameter(
            name="user_id",
            location=OpenApiParameter.PATH,
            description="معرف المستخدم (User.id)",
            required=True,
            type=int,
        )
    ],
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
        403: {"description": "ليس لديك صلاحية"},
        404: {"description": "المريض غير موجود"},
    }
)
class PatientProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, patient_id):
        try:
            try:
                patient = PatientProfile.objects.get(id=patient_id)
            except (PatientProfile.DoesNotExist, ValueError):
                patient = PatientProfile.objects.get(user_id=patient_id)
            
            # التحقق من الصلاحية (الطبيب الذي أضاف المريض أو الطبيب المعالج)
            try:
                doctor_profile = DoctorProfile.objects.get(user=request.user)
                is_creator = patient.created_by == doctor_profile
                has_record = MedicalRecord.objects.filter(patient=patient, doctor=doctor_profile).exists()
                
                if not (is_creator or has_record):
                    return Response({"error": "ليس لديك صلاحية لعرض هذا المريض"}, status=status.HTTP_403_FORBIDDEN)
            except DoctorProfile.DoesNotExist:
                # إذا كان المستخدم هو المريض نفسه
                if request.user.id != patient.user.id:
                    return Response({"error": "ليس لديك صلاحية"}, status=status.HTTP_403_FORBIDDEN)
            
            data = {
                'id': patient.id,
                'first_name': patient.user.first_name,
                'last_name': patient.user.last_name,
                'email': patient.user.email,
                'phone': patient.user.phone,
                'profile': {
                    'national_id': patient.national_id,
                    'date_of_birth': patient.date_of_birth,
                    'blood_type': patient.blood_type,
                    'allergies': patient.allergies,
                    'chronic_diseases': patient.chronic_diseases,
                    'emergency_contact': patient.emergency_contact,
                    'emergency_phone': patient.emergency_phone,
                    'address': patient.address
                }
            }
            return Response(data)
            
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# ✅ جلب سجلات مريض معين
# ============================================
@extend_schema(
    summary="جلب السجلات الطبية لمريض معين",
    description="إرجاع جميع السجلات الطبية لمريض محدد. يسمح للمريض نفسه أو للطبيب المعالج.",
    parameters=[
        OpenApiParameter(
            name="user_id",
            location=OpenApiParameter.PATH,
            description="معرف المستخدم (User.id)",
            required=True,
            type=int,
        )
    ],
    responses={
        200: MedicalRecordSerializer(many=True),
        401: {"description": "غير مصرح"},
        403: {"description": "ليس لديك صلاحية"},
        404: {"description": "المريض غير موجود"},
    }
)
class PatientRecordsByIdView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, patient_id):
        try:
            patient = PatientProfile.objects.get(id=patient_id)
            records = MedicalRecord.objects.filter(patient=patient)
            serializer = MedicalRecordSerializer(records, many=True)
            return Response(serializer.data)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# ✅ جلب آخر تحليل لمريض معين
# ============================================
@extend_schema(
    summary="جلب آخر تحليل مخاطر لمريض معين",
    description="إرجاع أحدث نتيجة تحليل تم إجراؤها للمريض المحدد.",
    parameters=[
        OpenApiParameter(
            name="user_id",
            location=OpenApiParameter.PATH,
            description="معرف المستخدم (User.id)",
            required=True,
            type=int,
        )
    ],
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
        403: {"description": "ليس لديك صلاحية"},
        404: {"description": "المريض غير موجود"},
    }
)
class PatientLatestAnalysisByIdView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, patient_id):
        try:
            patient = PatientProfile.objects.get(id=patient_id)
            latest_analysis = patient.ai_analyses.first()
            if latest_analysis:
                serializer = AIAnalysisResultSerializer(latest_analysis)
                return Response(serializer.data)
            return Response(None)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)
        



# ============================================
# ✅ إحصائيات المشرف (عدد المستخدمين)
# ============================================
@extend_schema(
    summary="إحصائيات المنصة (للمشرف فقط)",
    description="إرجاع أعداد المرضى والأطباء والمشرفين والسجلات الطبية والتحليلات.",
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
        403: {"description": "غير مصرح – يتطلب دور مشرف"},
    }
)
class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # التحقق أن المستخدم مشرف
        if request.user.user_type != 'admin':
            return Response({"error": "غير مصرح"}, status=status.HTTP_403_FORBIDDEN)
        
        stats = {
            'total_users': User.objects.count(),
            'total_patients': User.objects.filter(user_type='patient').count(),
            'total_doctors': User.objects.filter(user_type='doctor').count(),
            'total_admins': User.objects.filter(user_type='admin').count(),
            'total_medical_records': MedicalRecord.objects.count(),
            'total_ai_analyses': AIAnalysisResult.objects.count()
        }
        return Response(stats)


# ============================================
# ✅ جلب جميع المستخدمين (للمشرف)
# ============================================
@extend_schema(
    summary="قائمة جميع المستخدمين (للمشرف فقط)",
    description="إرجاع جميع المستخدمين مع بياناتهم التفصيلية (مرضى، أطباء، مشرفين).",
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
        403: {"description": "غير مصرح – يتطلب دور مشرف"},
    }
)
class AdminUsersView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'admin':
            return Response({"error": "غير مصرح"}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.all().order_by('-date_joined')
        users_data = []
        
        for user in users:
            user_info = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.user_type,
                'phone': user.phone,
                'is_active': user.is_active,
                'date_joined': user.date_joined,
                'last_login': user.last_login
            }
            
            # إضافة معلومات إضافية حسب النوع
            if user.user_type == 'patient':
                try:
                    profile = PatientProfile.objects.get(user=user)
                    user_info['national_id'] = profile.national_id
                    user_info['blood_type'] = profile.blood_type
                except PatientProfile.DoesNotExist:
                    pass
            elif user.user_type == 'doctor':
                try:
                    profile = DoctorProfile.objects.get(user=user)
                    user_info['specialization'] = profile.specialization
                    user_info['license_number'] = profile.license_number
                except DoctorProfile.DoesNotExist:
                    pass
            
            users_data.append(user_info)
        
        return Response(users_data)


# ============================================
# ✅ إضافة مستخدم جديد (للمشرف)
# ============================================
@extend_schema(
    summary="إضافة مستخدم جديد (للمشرف فقط)",
    description="إنشاء حساب مستخدم جديد (مريض، طبيب، مشرف). كلمة المرور إلزامية.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "email": {"type": "string", "format": "email"},
                "password": {"type": "string"},
                "phone": {"type": "string"},
                "user_type": {"type": "string", "enum": ["patient", "doctor", "admin"]},
                "national_id": {"type": "string"},
                "blood_type": {"type": "string"},
                "specialization": {"type": "string"},
                "license_number": {"type": "string"},
            },
            "required": ["first_name", "last_name", "email", "password", "user_type"],
        }
    },
    responses={
        201: OpenApiTypes.OBJECT,
        400: {"description": "بريد موجود مسبقاً أو بيانات غير صالحة"},
        401: {"description": "غير مصرح"},
        403: {"description": "غير مصرح – يتطلب دور مشرف"},
    }
)
class AdminAddUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if request.user.user_type != 'admin':
            return Response({"error": "غير مصرح"}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        
        # التحقق من وجود البريد
        if User.objects.filter(email=data.get('email')).exists():
            return Response({"error": "البريد الإلكتروني موجود مسبقاً"}, status=status.HTTP_400_BAD_REQUEST)
        
        # التحقق من كلمة المرور
        password = data.get('password', 'default123')
        if len(password) < 6:
            return Response({"error": "كلمة المرور يجب أن تكون 6 أحرف على الأقل"}, status=status.HTTP_400_BAD_REQUEST)
        
        # إنشاء المستخدم
        user = User.objects.create_user(
            username=data.get('email'),
            email=data.get('email'),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            password=password,  # 👈 استخدم كلمة المرور المدخلة
            phone=data.get('phone', ''),
            user_type=data.get('user_type', 'patient')
        )
        
        # إنشاء الملف الشخصي حسب النوع
        if user.user_type == 'patient':
            PatientProfile.objects.create(
                user=user,
                national_id=data.get('national_id', ''),
                blood_type=data.get('blood_type', '')
            )
        elif user.user_type == 'doctor':
            DoctorProfile.objects.create(
                user=user,
                specialization=data.get('specialization', ''),
                license_number=data.get('license_number', '')
            )
        
        return Response({
            'message': '✅ تم إضافة المستخدم بنجاح',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.user_type
            }
        }, status=status.HTTP_201_CREATED)

# ============================================
# ✅ تفعيل/تعطيل مستخدم (للمشرف)
# ============================================
@extend_schema(
    summary="تفعيل أو تعطيل مستخدم (للمشرف فقط)",
    description="تغيير حالة is_active للمستخدم المحدد.",
    parameters=[
        OpenApiParameter(
            name="user_id",
            location=OpenApiParameter.PATH,
            description="معرف المستخدم",
            required=True,
            type=int,
        )
    ],
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
        403: {"description": "غير مصرح – يتطلب دور مشرف"},
        404: {"description": "المستخدم غير موجود"},
    }
)
class AdminToggleUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, user_id):
        if request.user.user_type != 'admin':
            return Response({"error": "غير مصرح"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id)
            user.is_active = not user.is_active
            user.save()
            return Response({
                'message': f'✅ تم {"تفعيل" if user.is_active else "تعطيل"} المستخدم',
                'is_active': user.is_active
            })
        except User.DoesNotExist:
            return Response({"error": "المستخدم غير موجود"}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# ✅ حذف مستخدم (للمشرف)
# ============================================
@extend_schema(
    summary="حذف مستخدم (للمشرف فقط)",
    description="حذف المستخدم نهائياً من النظام.",
    parameters=[
        OpenApiParameter(
            name="user_id",
            location=OpenApiParameter.PATH,
            description="معرف المستخدم",
            required=True,
            type=int,
        )
    ],
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
        403: {"description": "غير مصرح – يتطلب دور مشرف"},
        404: {"description": "المستخدم غير موجود"},
    }
)
class AdminDeleteUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, user_id):
        if request.user.user_type != 'admin':
            return Response({"error": "غير مصرح"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response({'message': '✅ تم حذف المستخدم بنجاح'})
        except User.DoesNotExist:
            return Response({"error": "المستخدم غير موجود"}, status=status.HTTP_404_NOT_FOUND)  
        # ============================================
# ✅ تحليل النص الحر بالذكاء الاصطناعي
# ============================================
"""
class AnalyzeTextView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        patient_id = request.data.get('patient_id')
        text_to_analyze = request.data.get('text')
        
        if not text_to_analyze:
            return Response({"error": "الرجاء إدخال نص للتحليل"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            patient_profile = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)
        
        # استخدام Gemini لتحليل النص
        result = analyze_text_with_gemini(text_to_analyze)
        
        # حفظ النتيجة
        analysis = AIAnalysisResult.objects.create(
            patient=patient_profile,
            risk_level=result['risk_level'],
            risk_score=result['risk_score'],
            details=f"تحليل الأعراض:\n{text_to_analyze}\n\n{result['details']}",
            recommendations=result['recommendations']
        )
        
        return Response({
            'risk_level': result['risk_level'],
            'risk_score': result['risk_score'],
            'details': result['details'],
            'recommendations': result['recommendations'],
            'original_text': text_to_analyze,
            'analysis_date': analysis.analysis_date
        })      
"""
# ============================================
# ✅ تحليل النص الحر (API مخصص للوكلاء)
# ============================================
@extend_schema(
    summary="تحليل نص طبي حر (للوكلاء)",
    description="يقبل نصاً طبياً (أعراض، تقرير) ويعيد تحليلاً مع مستوى الخطر وتوصيات.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "معرف المريض"},
                "text": {"type": "string", "description": "النص الطبي المراد تحليله"},
            },
            "required": ["patient_id", "text"],
        }
    },
    responses={
        200: OpenApiTypes.OBJECT,
        400: {"description": "نص فارغ"},
        401: {"description": "غير مصرح"},
        404: {"description": "المريض غير موجود"},
    }
)
class AnalyzeTextView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        patient_id = request.data.get('patient_id')
        text_to_analyze = request.data.get('text')
        
        if not text_to_analyze:
            return Response({"error": "الرجاء إدخال نص للتحليل"}, status=400)
        
        try:
            patient_profile = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=404)
        
        # جلب العلامات الحيوية لتعزيز التحليل
        vital_signs = VitalSigns.objects.filter(
            patient=patient_profile
        ).order_by('-recorded_at')[:5]
        
        vital_summary = ""
        if vital_signs.exists():
            avg_systolic = sum(v.blood_pressure_systolic for v in vital_signs) / len(vital_signs)
            avg_diastolic = sum(v.blood_pressure_diastolic for v in vital_signs) / len(vital_signs)
            avg_heart = sum(v.heart_rate for v in vital_signs) / len(vital_signs)
            avg_sugar = sum(v.blood_sugar for v in vital_signs) / len(vital_signs)
            
            vital_summary = f"\nالعلامات الحيوية المرفقة: ضغط {avg_systolic:.0f}/{avg_diastolic:.0f}, نبض {avg_heart:.0f}, سكر {avg_sugar:.1f}"

        combined_text = f"{text_to_analyze}{vital_summary}"

        # استخدام OpenRouter لتحليل النص والعلامات
        result = analyze_symptoms_with_ai(symptoms_text=combined_text)
        
        analysis = AIAnalysisResult.objects.create(
            patient=patient_profile,
            risk_level=result.get('risk_level', 'غير معروف'),
            risk_score=result.get('risk_score', 0),
            details=f"تحليل الأعراض:\n{text_to_analyze}\n\n{result.get('details', '')}",
            recommendations=result.get('recommendations', '')
        )
        
        if vital_signs.exists():
            analysis.related_vital_signs.set(vital_signs)
            
        return Response(result) 

# ============================================
# ✅ Agent: ملخص كامل للمريض (للوكلاء)
# ============================================
@extend_schema(
    summary="ملخص كامل للمريض (للوكلاء)",
    description="إرجاع جميع بيانات المريض: الشخصية، السجلات الطبية، العلامات الحيوية، تحليلات الذكاء الاصطناعي.",
    parameters=[
        OpenApiParameter(
            name="patient_id",
            location=OpenApiParameter.QUERY,
            description="معرف المريض (PatientProfile.id)",
            required=True,
            type=int,
        )
    ],
    responses={200: OpenApiTypes.OBJECT, 404: {"description": "المريض غير موجود"}}
)
class AgentPatientSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({"error": "patient_id مطلوب"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)

        # التحقق من الصلاحية: المريض نفسه أو طبيب معالج أو مشرف
        user = request.user
        if user.id != patient.user.id and user.user_type != 'admin':
            try:
                doctor = DoctorProfile.objects.get(user=user)
                if not MedicalRecord.objects.filter(patient=patient, doctor=doctor).exists():
                    return Response({"error": "ليس لديك صلاحية"}, status=status.HTTP_403_FORBIDDEN)
            except DoctorProfile.DoesNotExist:
                return Response({"error": "ليس لديك صلاحية"}, status=status.HTTP_403_FORBIDDEN)

        # جلب السجلات الطبية
        records = MedicalRecord.objects.filter(patient=patient).order_by('-date')
        
        # جلب العلامات الحيوية (آخر 10)
        vital_signs = VitalSigns.objects.filter(patient=patient).order_by('-recorded_at')[:10]
        
        # جلب تحليلات الذكاء الاصطناعي (آخر 5)
        analyses = AIAnalysisResult.objects.filter(patient=patient).order_by('-analysis_date')[:5]

        # تجهيز الرد
        summary = {
            "patient": {
                "id": patient.id,
                "full_name": patient.user.get_full_name(),
                "email": patient.user.email,
                "phone": patient.user.phone,
                "national_id": patient.national_id,
                "date_of_birth": patient.date_of_birth,
                "blood_type": patient.blood_type,
                "allergies": patient.allergies,
                "chronic_diseases": patient.chronic_diseases,
                "emergency_contact": patient.emergency_contact,
                "emergency_phone": patient.emergency_phone,
                "address": patient.address,
            },
            "medical_records": [
                {
                    "date": record.date,
                    "doctor": record.doctor.user.get_full_name(),
                    "diagnosis": record.diagnosis,
                    "prescription": record.prescription,
                    "visit_type": record.visit_type,
                }
                for record in records
            ],
            "vital_signs": [
                {
                    "date": v.recorded_at,
                    "blood_pressure": f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}",
                    "heart_rate": v.heart_rate,
                    "blood_sugar": v.blood_sugar,
                    "temperature": v.temperature,
                    "oxygen_saturation": v.oxygen_saturation,
                }
                for v in vital_signs
            ],
            "ai_analyses": [
                {
                    "date": a.analysis_date,
                    "risk_level": a.risk_level,
                    "risk_score": a.risk_score,
                    "details": a.details,
                    "recommendations": a.recommendations,
                }
                for a in analyses
            ],
        }
        return Response(summary)     
          


# ============================================
# ✅ Agent: فحص كامل (سجل طبي + تحليل ذكاء)
# ============================================
@extend_schema(
    summary="فحص كامل للمريض (للوكلاء)",
    description="يقوم بإنشاء سجل طبي جديد، ثم تحليل الأعراض باستخدام الذكاء الاصطناعي، ويعيد النتيجة كاملة.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "معرف المريض"},
                "doctor_email": {"type": "string", "description": "بريد الطبيب الإلكتروني"},
                "diagnosis": {"type": "string", "description": "التشخيص"},
                "symptoms": {"type": "string", "description": "الأعراض (نص حر للتحليل)"},
                "prescription": {"type": "string", "description": "الوصفة الطبية (اختياري)"},
                "visit_type": {"type": "string", "enum": ["فحص دوري", "استشارة", "طارئ", "متابعة"]},
            },
            "required": ["patient_id", "doctor_email", "diagnosis", "symptoms"]
        }
    },
    responses={200: OpenApiTypes.OBJECT, 400: {"description": "بيانات غير صالحة"}, 404: {"description": "المريض أو الطبيب غير موجود"}}
)
class AgentFullCheckupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        patient_id = data.get('patient_id')
        doctor_email = data.get('doctor_email')
        diagnosis = data.get('diagnosis')
        symptoms = data.get('symptoms')
        prescription = data.get('prescription', '')
        visit_type = data.get('visit_type', 'استشارة')

        # 1. جلب المريض
        try:
            patient = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)

        # 2. جلب الطبيب
        try:
            doctor = DoctorProfile.objects.get(user__email=doctor_email)
        except DoctorProfile.DoesNotExist:
            return Response({"error": "الطبيب غير موجود"}, status=status.HTTP_404_NOT_FOUND)

        # 3. إنشاء السجل الطبي
        record = MedicalRecord.objects.create(
            patient=patient,
            doctor=doctor,
            diagnosis=diagnosis,
            prescription=prescription,
            visit_type=visit_type,
            notes=f"تم بواسطة وكيل ذكي. الأعراض المبلغ عنها: {symptoms}"
        )

        # 4. تحليل الأعراض باستخدام OpenRouter
        ai_result = analyze_symptoms_with_ai(symptoms_text=symptoms)

        # 5. حفظ نتيجة التحليل
        analysis = AIAnalysisResult.objects.create(
            patient=patient,
            risk_level=ai_result.get('risk_level', 'غير معروف'),
            risk_score=ai_result.get('risk_score', 0),
            details=f"تحليل الأعراض:\n{symptoms}\n\n{ai_result.get('details', '')}",
            recommendations=ai_result.get('recommendations', '')
        )

        # 6. إرجاع الرد الكامل
        return Response({
            "message": "تم إجراء الفحص الكامل بنجاح",
            "medical_record": {
                "id": record.id,
                "date": record.date,
                "diagnosis": record.diagnosis,
                "prescription": record.prescription,
                "visit_type": record.visit_type,
            },
            "ai_analysis": {
                "risk_level": ai_result['risk_level'],
                "risk_score": ai_result['risk_score'],
                "details": ai_result['details'],
                "recommendations": ai_result['recommendations'],
            },
            "patient": {
                "id": patient.id,
                "name": patient.user.get_full_name(),
                "national_id": patient.national_id,
            }
        }, status=status.HTTP_201_CREATED)
    

# ============================================
# ✅ Agent: حجز موعد (للوكلاء)
# ============================================
@extend_schema(
    summary="حجز موعد طبي (للوكلاء)",
    description="يقوم بحجز موعد لمريض مع طبيب في تاريخ محدد.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "patient_id": {"type": "integer", "description": "معرف المريض"},
                "doctor_email": {"type": "string", "description": "بريد الطبيب الإلكتروني"},
                "appointment_date": {"type": "string", "format": "date-time", "description": "تاريخ ووقت الموعد (ISO format)"},
                "reason": {"type": "string", "description": "سبب الحجز"},
            },
            "required": ["patient_id", "doctor_email", "appointment_date", "reason"]
        }
    },
    responses={201: OpenApiTypes.OBJECT, 400: {"description": "بيانات غير صالحة"}, 404: {"description": "المريض أو الطبيب غير موجود"}}
)
class AgentBookAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        patient_id = data.get('patient_id')
        doctor_email = data.get('doctor_email')
        appointment_date = data.get('appointment_date')
        reason = data.get('reason')

        # 1. جلب المريض
        try:
            patient = PatientProfile.objects.get(id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)

        # 2. جلب الطبيب
        try:
            doctor = DoctorProfile.objects.get(user__email=doctor_email)
        except DoctorProfile.DoesNotExist:
            return Response({"error": "الطبيب غير موجود"}, status=status.HTTP_404_NOT_FOUND)

        # 3. إنشاء الموعد
        try:
            appointment = Appointment.objects.create(
                patient=patient,
                doctor=doctor,
                appointment_date=appointment_date,
                reason=reason
            )
        except Exception as e:
            return Response({"error": f"خطأ في إنشاء الموعد: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "تم حجز الموعد بنجاح",
            "appointment": {
                "id": appointment.id,
                "patient_name": patient.user.get_full_name(),
                "doctor_name": doctor.user.get_full_name(),
                "appointment_date": appointment.appointment_date,
                "reason": appointment.reason,
                "status": appointment.status,
            }
        }, status=status.HTTP_201_CREATED)

# ============================================
# ✅ جلب قائمة جميع الأطباء (للمرضى)
# ============================================
@extend_schema(
    summary="قائمة جميع الأطباء مع البحث",
    description="إرجاع قائمة بجميع الأطباء المسجلين في المنصة. يمكن البحث بالاسم أو التخصص.",
    parameters=[
        OpenApiParameter(name="search", description="البحث بالاسم أو التخصص", required=False, type=str),
    ],
    responses={200: DoctorProfileSerializer(many=True)}
)
class DoctorsListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        search_query = request.query_params.get('search', '')
        doctors = DoctorProfile.objects.filter(
            Q(user__first_name__icontains=search_query) |
            Q(user__last_name__icontains=search_query) |
            Q(specialization__icontains=search_query) |
            Q(hospital__icontains=search_query)
        ).distinct()
        
        serializer = DoctorProfileSerializer(doctors, many=True)
        return Response(serializer.data)

# ============================================
# ✅ حجز موعد للمريض الحالي
# ============================================
@extend_schema(
    summary="حجز موعد جديد (للمرضى)",
    description="يسمح للمريض المسجل دخوله بحجز موعد مع طبيب معين.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "doctor_id": {"type": "integer", "description": "معرف الطبيب"},
                "appointment_date": {"type": "string", "format": "date-time", "description": "تاريخ الموعد"},
                "reason": {"type": "string", "description": "سبب الزيارة"},
            },
            "required": ["doctor_id", "appointment_date"]
        }
    },
    responses={201: OpenApiTypes.OBJECT, 400: {"description": "بيانات غير صالحة"}, 404: {"description": "الطبيب غير موجود"}}
)
class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            patient_profile = PatientProfile.objects.get(user=request.user)
        except PatientProfile.DoesNotExist:
            return Response({"error": "ملف المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)
            
        doctor_id = request.data.get('doctor_id')
        appointment_date = request.data.get('appointment_date')
        reason = request.data.get('reason', 'موعد طبي')
        
        if not doctor_id or not appointment_date:
            return Response({"error": "يجب توفير معرف الطبيب وتاريخ الموعد"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({"error": "الطبيب غير موجود"}, status=status.HTTP_404_NOT_FOUND)
            
        appointment = Appointment.objects.create(
            patient=patient_profile,
            doctor=doctor,
            appointment_date=appointment_date,
            reason=reason
        )
        
        return Response({
            "message": "✅ تم حجز الموعد بنجاح",
            "appointment": AppointmentSerializer(appointment).data
        }, status=status.HTTP_201_CREATED)

# ============================================
# ✅ مواعيد الطبيب (سجل المواعيد)
# ============================================
@extend_schema(
    summary="سجل مواعيد الطبيب",
    description="إرجاع جميع المواعيد الخاصة بالطبيب الحالي. يمكن التصفية حسب الحالة (scheduled, completed).",
    parameters=[
        OpenApiParameter(name="status", description="حالة الموعد", required=False, type=str),
    ],
    responses={200: AppointmentSerializer(many=True)}
)
class DoctorAppointmentsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
        except DoctorProfile.DoesNotExist:
            return Response({"error": "ملف الطبيب غير موجود"}, status=status.HTTP_404_NOT_FOUND)
            
        status_filter = request.query_params.get('status')
        appointments = Appointment.objects.filter(doctor=doctor_profile)
        
        if status_filter:
            appointments = appointments.filter(status=status_filter)
            
        appointments = appointments.order_by('appointment_date')
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)


# ============================================
# ✅ إنهاء الموعد (نقل للمراجعات)
# ============================================
@extend_schema(
    summary="إنهاء الموعد",
    description="تغيير حالة الموعد إلى 'completed' لكي ينتقل إلى سجل المراجعات.",
    responses={200: OpenApiTypes.OBJECT, 404: {"description": "الموعد غير موجود"}}
)
class CompleteAppointmentView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, appointment_id):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
            appointment = Appointment.objects.get(id=appointment_id, doctor=doctor_profile)
            appointment.status = 'completed'
            appointment.save()
            return Response({"message": "✅ تم إنهاء الموعد ونقله إلى المراجعات"})
        except DoctorProfile.DoesNotExist:
            return Response({"error": "ملف الطبيب غير موجود"}, status=status.HTTP_403_FORBIDDEN)
        except Appointment.DoesNotExist:
            return Response({"error": "الموعد غير موجود"}, status=status.HTTP_404_NOT_FOUND)

# ============================================
# ✅ إضافة عملية جراحية جديدة
# ============================================
@extend_schema(
    summary="إضافة عملية جراحية جديدة",
    description="يسمح للطبيب بجدولة عملية جراحية لمريض.",
    request=SurgerySerializer,
    responses={201: SurgerySerializer}
)
class AddSurgeryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
        except DoctorProfile.DoesNotExist:
            return Response({"error": "ملف الطبيب غير موجود"}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data.copy()
        data['doctor'] = doctor_profile.id
        
        serializer = SurgerySerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ============================================
# ✅ جلب عمليات الطبيب
# ============================================
class DoctorSurgeriesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
        except DoctorProfile.DoesNotExist:
            return Response({"error": "ملف الطبيب غير موجود"}, status=status.HTTP_403_FORBIDDEN)
            
        surgeries = Surgery.objects.filter(doctor=doctor_profile).order_by('-surgery_date')
        serializer = SurgerySerializer(surgeries, many=True)
        return Response(serializer.data)

# ============================================
# ✅ جلب عمليات المريض
# ============================================
class PatientSurgeriesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            patient_profile = PatientProfile.objects.get(user=request.user)
        except PatientProfile.DoesNotExist:
            return Response({"error": "ملف المريض غير موجود"}, status=status.HTTP_403_FORBIDDEN)
            
        surgeries = Surgery.objects.filter(patient=patient_profile).order_by('-surgery_date')
        serializer = SurgerySerializer(surgeries, many=True)
        return Response(serializer.data)

class PatientSurgeriesByIdView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, patient_id):
        try:
            patient_profile = PatientProfile.objects.get(id=patient_id)
            surgeries = Surgery.objects.filter(patient=patient_profile).order_by('-surgery_date')
            serializer = SurgerySerializer(surgeries, many=True)
            return Response(serializer.data)
        except PatientProfile.DoesNotExist:
            return Response({"error": "ملف المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)

# ============================================
# ✅ إنهاء العملية وإضافة الملاحظات الطبية
# ============================================
class CompleteSurgeryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, surgery_id):
        try:
            doctor_profile = DoctorProfile.objects.get(user=request.user)
            surgery = Surgery.objects.get(id=surgery_id, doctor=doctor_profile)
            
            surgery.status = 'completed'
            surgery.completion_date = request.data.get('completion_date', surgery.surgery_date)
            surgery.post_surgery_medications = request.data.get('post_surgery_medications', '')
            surgery.doctor_side_effects = request.data.get('doctor_side_effects', '')
            surgery.save()
            
            # تلقائياً، يمكننا إنشاء سجل طبي لهذه العملية لكي تظهر في السجلات
            MedicalRecord.objects.create(
                patient=surgery.patient,
                doctor=doctor_profile,
                diagnosis=f"عملية جراحية: {surgery.surgery_name}",
                prescription=surgery.post_surgery_medications,
                notes=f"تقرير العملية: {surgery.notes}\nالأعراض الجانبية المرصودة: {surgery.doctor_side_effects}",
                visit_type='متابعة'
            )
            
            return Response({"message": "✅ تم إنهاء العملية وتحديث السجل الطبي للمريض"})
        except Surgery.DoesNotExist:
            return Response({"error": "العملية غير موجودة"}, status=status.HTTP_404_NOT_FOUND)

# ============================================
# ✅ تحديث الأعراض الجانبية من قبل المريض
# ============================================
class PatientUpdateSurgeryFeedbackView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, surgery_id):
        try:
            patient_profile = PatientProfile.objects.get(user=request.user)
            surgery = Surgery.objects.get(id=surgery_id, patient=patient_profile)
            
            surgery.patient_side_effects = request.data.get('patient_side_effects', '')
            surgery.save()
            
            return Response({"message": "✅ تم تحديث الأعراض الجانبية بنجاح"})
        except Surgery.DoesNotExist:
            return Response({"error": "العملية غير موجودة"}, status=status.HTTP_404_NOT_FOUND)
