# 🏥 منصة الصحة الوطنية الذكية
### Smart National Health Platform

## 📋 وصف المشروع
منصة صحية وطنية ذكية تهدف إلى توحيد السجلات الطبية إلكترونياً، وتوفير واجهة موحدة للمرضى والأطباء، مع دعم تحليل البيانات الطبية باستخدام الذكاء الاصطناعي للكشف عن مستويات الأمراض.

## ✨ المميزات
- ✅ نظام تسجيل دخول آمن (JWT)
- ✅ ملف طبي موحد لكل مريض
- ✅ لوحة تحكم خاصة للمرضى
- ✅ لوحة تحكم خاصة للأطباء
- ✅ لوحة تحكم خاصة للمشرفين
- ✅ تحليل المخاطر باستخدام الذكاء الاصطناعي
- ✅ إضافة وتعديل السجلات الطبية
- ✅ واجهات مستخدم عربية جذابة
- ✅ تصميم متجاوب مع جميع الأجهزة
- ✅ تأثيرات حركية احترافية

## 🛠️ التقنيات المستخدمة
### Backend:
- Django 4.2.7
- Django REST Framework
- JWT Authentication
- SQLite (Development)
- PostgreSQL (Production)

### Frontend:
- React 18
- React Router DOM 6
- Axios
- CSS3 مع أنيميشن متقدمة

## 📁 هيكل المشروع
تم تنظيم المشروع وفق أفضل الممارسات لهندسة البرمجيات.

## 🚀 كيفية تشغيل المشروع

### متطلبات التشغيل:
- Python 3.9+
- Node.js 16+
- npm أو yarn

### تشغيل Backend:
`bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver