from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PatientProfile, DoctorProfile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone', 'user_type']

class PatientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = PatientProfile
        fields = '__all__'

class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = DoctorProfile
        fields = '__all__'

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    specialization = serializers.CharField(required=False, allow_blank=True)
    license_number = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password', 'phone', 'user_type', 'specialization', 'license_number']
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("البريد الإلكتروني مسجل بالفعل")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("اسم المستخدم (البريد الإلكتروني) محجوز بالفعل")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            user_type=validated_data.get('user_type', 'patient')
        )
        return user
    
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model

User = get_user_model()

class CustomTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # البحث عن المستخدم بالبريد الإلكتروني
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise serializers.ValidationError('لا يوجد حساب بهذا البريد الإلكتروني')

            # المصادقة باستخدام username وكلمة المرور
            user = authenticate(username=user.username, password=password)

            if not user:
                raise serializers.ValidationError('كلمة المرور غير صحيحة')
            if not user.is_active:
                raise serializers.ValidationError('الحساب غير نشط')

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('يجب إدخال البريد الإلكتروني وكلمة المرور')