
from django.conf import settings
from openai import OpenAI
import json
import traceback
import requests


def analyze_with_deepseek(vital_signs_list=None, text_to_analyze=None):
    """
    تحليل باستخدام DeepSeek API
    يدعم:
    - تحليل العلامات الحيوية
    - تحليل النصوص الحرة (الأعراض والتقارير)
    """
    
    # بناء النص المرسل حسب نوع البيانات
    if text_to_analyze:
        prompt = f"""
        أنت طبيب خبير في تحليل الأعراض الطبية وتقييم الحالات الصحية.

        النص الطبي المراد تحليله:
        "{text_to_analyze}"

        المطلوب منك:
        1. تحديد مستوى الخطورة (منخفض/متوسط/مرتفع) مع درجة من 0-100
        2. تقديم تحليل مفصل للحالة مع ذكر الأعراض الرئيسية
        3. تقديم توصيات طبية واضحة ومفصلة

        أجب بصيغة JSON فقط بهذا الشكل:
        {{
            "risk_level": "منخفض/متوسط/مرتفع",
            "risk_score": 50,
            "details": "تحليل مفصل للأعراض...",
            "recommendations": "توصيات طبية..."
        }}
        """
        
    elif vital_signs_list and len(vital_signs_list) > 0:
        avg_systolic = sum(v.blood_pressure_systolic for v in vital_signs_list) / len(vital_signs_list)
        avg_diastolic = sum(v.blood_pressure_diastolic for v in vital_signs_list) / len(vital_signs_list)
        avg_heart = sum(v.heart_rate for v in vital_signs_list) / len(vital_signs_list)
        avg_sugar = sum(v.blood_sugar for v in vital_signs_list) / len(vital_signs_list)
        
        prompt = f"""
        أنت طبيب خبير في تحليل العلامات الحيوية وتقييم المخاطر الصحية.

        بيانات المريض:
        - متوسط الضغط: {avg_systolic:.0f}/{avg_diastolic:.0f}
        - متوسط النبض: {avg_heart:.0f} نبضة/دقيقة
        - متوسط السكر: {avg_sugar:.1f} ملغ/دل

        المطلوب منك:
        1. تحديد مستوى الخطر (منخفض/متوسط/مرتفع) مع درجة من 0-100
        2. تحليل مفصل للحالة مع ذكر عوامل الخطر
        3. تقديم توصيات طبية واضحة ومفصلة

        أجب بصيغة JSON فقط:
        {{
            "risk_level": "منخفض/متوسط/مرتفع",
            "risk_score": 50,
            "details": "تحليل مفصل...",
            "recommendations": "توصيات مفصلة..."
        }}
        """
    else:
        return {
            'risk_level': 'غير معروف',
            'risk_score': 0,
            'details': 'لا توجد بيانات كافية للتحليل',
            'recommendations': 'يرجى إدخال علامات حيوية أو نص طبي للتحليل'
        }
    
    try:
        print(f"🔄 جاري الاتصال بـ DeepSeek API...")
        
        # تهيئة عميل OpenAI المتوافق مع DeepSeek
        client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com/v1"
        )
        
        # إرسال الطلب
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        result_text = response.choices[0].message.content
        print(f"✅ تم استلام الرد من DeepSeek")
        
        # استخراج JSON من الرد
        cleaned = result_text.strip()
        if '```json' in cleaned:
            cleaned = cleaned.split('```json')[1].split('```')[0]
        elif '```' in cleaned:
            cleaned = cleaned.split('```')[1].split('```')[0]
        
        try:
            result = json.loads(cleaned)
            return {
                'risk_level': result.get('risk_level', 'متوسط'),
                'risk_score': result.get('risk_score', 50),
                'details': result.get('details', result_text),
                'recommendations': result.get('recommendations', 'يرجى استشارة الطبيب')
            }
        except json.JSONDecodeError:
            return {
                'risk_level': 'متوسط',
                'risk_score': 50,
                'details': result_text,
                'recommendations': 'تم التحليل بواسطة DeepSeek'
            }
            
    except Exception as e:
        print(f"❌ خطأ في DeepSeek: {e}")
        traceback.print_exc()
        return fallback_analysis(vital_signs_list)


def fallback_analysis(vital_signs_list):
    """نظام احتياطي في حال فشل DeepSeek"""
    if not vital_signs_list:
        return {
            'risk_level': 'غير معروف',
            'risk_score': 0,
            'details': 'لا توجد بيانات كافية',
            'recommendations': 'أضف بيانات للتحليل'
        }
    
    avg_systolic = sum(v.blood_pressure_systolic for v in vital_signs_list) / len(vital_signs_list)
    avg_diastolic = sum(v.blood_pressure_diastolic for v in vital_signs_list) / len(vital_signs_list)
    avg_heart = sum(v.heart_rate for v in vital_signs_list) / len(vital_signs_list)
    avg_sugar = sum(v.blood_sugar for v in vital_signs_list) / len(vital_signs_list)
    
    risk_score = 0
    risk_factors = []
    
    if avg_systolic > 140 or avg_diastolic > 90:
        risk_score += 30
        risk_factors.append("ارتفاع ضغط الدم")
    elif avg_systolic > 130 or avg_diastolic > 85:
        risk_score += 15
        risk_factors.append("ارتفاع طفيف في ضغط الدم")
    
    if avg_heart > 100:
        risk_score += 20
        risk_factors.append("تسارع في نبضات القلب")
    elif avg_heart < 60:
        risk_score += 10
        risk_factors.append("بطء في نبضات القلب")
    
    if avg_sugar > 200:
        risk_score += 30
        risk_factors.append("ارتفاع شديد في السكر")
    elif avg_sugar > 140:
        risk_score += 15
        risk_factors.append("ارتفاع في السكر")
    
    if risk_score >= 50:
        risk_level = "مرتفع"
    elif risk_score >= 25:
        risk_level = "متوسط"
    else:
        risk_level = "منخفض"
    
    details = f"تحليل احتياطي (تعذر الاتصال بـ DeepSeek):\n"
    details += f"- متوسط الضغط: {avg_systolic:.0f}/{avg_diastolic:.0f}\n"
    details += f"- متوسط النبض: {avg_heart:.0f}\n"
    details += f"- متوسط السكر: {avg_sugar:.1f}\n"
    
    if risk_factors:
        details += f"عوامل الخطر: {', '.join(risk_factors)}"
    else:
        details += "لا توجد عوامل خطر ملحوظة"
    
    recommendations = "توصيات (نظام احتياطي):\n"
    if risk_level == "مرتفع":
        recommendations += "- يرجى مراجعة الطبيب المختص فوراً\n- متابعة العلامات الحيوية يومياً"
    elif risk_level == "متوسط":
        recommendations += "- متابعة أسبوعية\n- مراجعة الطبيب لتقييم الحالة"
    else:
        recommendations += "- استمرار نمط الحياة الصحي\n- متابعة دورية كل 3 أشهر"
    
    return {
        'risk_level': risk_level,
        'risk_score': risk_score,
        'details': details,
        'recommendations': recommendations
    }


def analyze_text_with_deepseek(text):
    """تحليل أي نص طبي"""
    return analyze_with_deepseek(text_to_analyze=text)
def analyze_with_openrouter(prompt_text):
    """
    التحليل باستخدام OpenRouter API (يدعم النماذج المجانية)
    """
    OPENROUTER_API_KEY = settings.OPENROUTER_API_KEY
    
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "openrouter/free",
            "messages": [{"role": "user", "content": prompt_text}]
        }
    )
    
    if response.status_code == 200:
        try:
            result = response.json()
            return result['choices'][0]['message']['content']
        except KeyError:
            return f"خطأ في تحليل الاستجابة: {result}"
    else:
        return f"فشل الاتصال بـ OpenRouter: [{response.status_code}] {response.text}"