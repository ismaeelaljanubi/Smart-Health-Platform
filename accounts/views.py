
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, PatientProfileSerializer, DoctorProfileSerializer
from .models import PatientProfile, DoctorProfile
from medical.models import MedicalRecord
User = get_user_model()



# ============================================
# ✅ تسجيل الدخول باستخدام البريد الإلكتروني
# ============================================
@extend_schema(
    summary="تسجيل الدخول باستخدام البريد الإلكتروني",
    description="يقبل البريد الإلكتروني وكلمة المرور. يعيد توكنات JWT (access, refresh) ونوع المستخدم.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "format": "email", "description": "البريد الإلكتروني"},
                "password": {"type": "string", "description": "كلمة المرور"},
            },
            "required": ["email", "password"],
        }
    },
    responses={
        200: OpenApiTypes.OBJECT,
        400: {"description": "بريد أو كلمة مرور مفقودة"},
        401: {"description": "بريد غير موجود أو كلمة مرور خاطئة"},
    }
)
class EmailLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {"error": "الرجاء إدخال البريد الإلكتروني وكلمة المرور"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "لا يوجد مستخدم بهذا البريد الإلكتروني"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = authenticate(username=user.username, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user_type": user.user_type,
                "email": user.email,
                "username": user.username
            })
        else:
            return Response(
                {"error": "كلمة المرور غير صحيحة"},
                status=status.HTTP_401_UNAUTHORIZED
            )


# ============================================
# ✅ إنشاء حساب جديد (المشكلة هنا)
# ============================================
@extend_schema(
    summary="إنشاء حساب جديد",
    description="تسجيل مستخدم جديد كنوع 'patient' أو 'doctor'. يتم إنشاء الملف الشخصي تلقائياً.",
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string", "description": "الاسم الأول"},
                "last_name": {"type": "string", "description": "الاسم الأخير"},
                "email": {"type": "string", "format": "email", "description": "البريد الإلكتروني"},
                "password": {"type": "string", "description": "كلمة المرور"},
                "phone": {"type": "string", "description": "رقم الهاتف"},
                "user_type": {"type": "string", "enum": ["patient", "doctor"], "description": "نوع المستخدم"},
                "specialization": {"type": "string", "description": "التخصص (للأطباء فقط)"},
                "license_number": {"type": "string", "description": "رقم الترخيص (للأطباء فقط)"},
            },
            "required": ["first_name", "last_name", "email", "password", "user_type"],
        }
    },
    responses={
        201: OpenApiTypes.OBJECT,
        400: {"description": "بيانات غير صالحة أو بريد موجود مسبقاً"},
    }
)
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        print("📥 بيانات التسجيل:", request.data)
        
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # إنشاء الملف الشخصي حسب نوع المستخدم
            if user.user_type == 'patient':
                PatientProfile.objects.create(user=user)
                print("✅ تم إنشاء ملف مريض")
            elif user.user_type == 'doctor':
                specialization = request.data.get('specialization', '')
                license_number = request.data.get('license_number', '')
                DoctorProfile.objects.create(
                    user=user,
                    specialization=specialization,
                    license_number=license_number
                )
                print(f"✅ تم إنشاء ملف طبيب: {specialization}")
            else:
                print("⚠️ نوع مستخدم غير معروف:", user.user_type)
            
            return Response({
                'message': 'تم إنشاء الحساب بنجاح',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        print("❌ أخطاء التسجيل:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ============================================
# ✅ عرض الملف الشخصي للمستخدم الحالي
# ============================================
@extend_schema(
    summary="عرض الملف الشخصي للمستخدم الحالي",
    description="إرجاع بيانات المستخدم مع الملف الشخصي (PatientProfile أو DoctorProfile).",
    responses={
        200: OpenApiTypes.OBJECT,
        401: {"description": "غير مصرح"},
    }
)
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data
        
        if user.user_type == 'patient':
            try:
                profile = PatientProfile.objects.get(user=user)
                data['profile'] = PatientProfileSerializer(profile).data
            except PatientProfile.DoesNotExist:
                data['profile'] = None
        elif user.user_type == 'doctor':
            try:
                profile = DoctorProfile.objects.get(user=user)
                data['profile'] = DoctorProfileSerializer(profile).data
            except DoctorProfile.DoesNotExist:
                data['profile'] = None
        
        return Response(data)

from django.db.models import Q

# ============================================
# ✅ تحديث ملف المريض (للطبيب أو المريض نفسه)
# ============================================
@extend_schema(
    summary="تحديث معلومات المريض",
    description="تحديث البيانات الشخصية والطبية للمريض. يمكن للمريض نفسه أو للطبيب المعالج.",
    parameters=[
        OpenApiParameter(
            name="user_id",
            location=OpenApiParameter.PATH,
            description="معرف المستخدم (User.id) وليس PatientProfile.id",
            required=True,
            type=int,
        )
    ],
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "phone": {"type": "string"},
                "national_id": {"type": "string"},
                "date_of_birth": {"type": "string", "format": "date"},
                "blood_type": {"type": "string"},
                "allergies": {"type": "string"},
                "chronic_diseases": {"type": "string"},
                "emergency_contact": {"type": "string"},
                "emergency_phone": {"type": "string"},
                "address": {"type": "string"},
            },
        }
    },
    responses={
        200: OpenApiTypes.OBJECT,
        400: {"description": "بيانات غير صالحة"},
        401: {"description": "غير مصرح"},
        403: {"description": "ليس لديك صلاحية"},
        404: {"description": "المريض غير موجود"},
    }
)
class UpdatePatientProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, patient_id):
        try:
            # محاولة جلب ملف المريض باستخدام المعرف الممرر (سواء كان ID الملف أو ID المستخدم)
            try:
                patient = PatientProfile.objects.get(id=patient_id)
            except (PatientProfile.DoesNotExist, ValueError):
                patient = PatientProfile.objects.get(user_id=patient_id)
        except PatientProfile.DoesNotExist:
            return Response({"error": "المريض غير موجود"}, status=status.HTTP_404_NOT_FOUND)
        
        # التحقق من الصلاحية
        user = request.user
        is_doctor = user.user_type == 'doctor'
        is_patient = user.id == patient.user.id
        
        if not (is_doctor or is_patient):
            return Response({"error": "ليس لديك صلاحية"}, status=status.HTTP_403_FORBIDDEN)
        
        # إذا كان طبيباً، تأكد أنه هو من أضاف المريض أو لديه سجل طبي معه
        if is_doctor:
            try:
                doctor = DoctorProfile.objects.get(user=user)
                is_creator = patient.created_by == doctor
                has_record = MedicalRecord.objects.filter(patient=patient, doctor=doctor).exists()
                
                if not (is_creator or has_record):
                    return Response({"error": "ليس لديك صلاحية لهذا المريض"}, status=status.HTTP_403_FORBIDDEN)
            except DoctorProfile.DoesNotExist:
                return Response({"error": "ملف الطبيب غير موجود"}, status=status.HTTP_403_FORBIDDEN)
        
        # تحديث البيانات
        data = request.data
        
        # تحديث معلومات المستخدم الأساسية
        user_obj = patient.user
        user_obj.first_name = data.get('first_name', user_obj.first_name)
        user_obj.last_name = data.get('last_name', user_obj.last_name)
        user_obj.phone = data.get('phone', user_obj.phone)
        user_obj.save()
        
        # تحديث معلومات المريض الإضافية (بما فيها national_id و date_of_birth)
        patient.national_id = data.get('national_id', patient.national_id)
        patient.date_of_birth = data.get('date_of_birth') or patient.date_of_birth
        patient.blood_type = data.get('blood_type', patient.blood_type)
        patient.allergies = data.get('allergies', patient.allergies)
        patient.chronic_diseases = data.get('chronic_diseases', patient.chronic_diseases)
        patient.emergency_contact = data.get('emergency_contact', patient.emergency_contact)
        patient.emergency_phone = data.get('emergency_phone', patient.emergency_phone)
        patient.address = data.get('address', patient.address)
        patient.save()
        
        # إرجاع البيانات المحدثة
        return Response({
            'message': '✅ تم تحديث الملف بنجاح',
            'profile': {
                'id': patient.id,
                'first_name': user_obj.first_name,
                'last_name': user_obj.last_name,
                'email': user_obj.email,
                'phone': user_obj.phone,
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
        })