
"""from django.conf import settings
import google.generativeai as genai
import json

# تهيئة Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

def analyze_with_gemini(vital_signs_list=None, text_to_analyze=None):
    """
#    تحليل باستخدام Google Gemini
 #   يدعم:
  #  - تحليل العلامات الحيوية (vital_signs_list)
#    - تحليل النصوص الحرة (text_to_analyze)
#    """
    
    # ============================================
    # بناء الـ Prompt حسب نوع البيانات
    # ============================================
#    if text_to_analyze:
        # تحليل النص الحر (أعراض، تقارير، استشارات)
 #       prompt = f"""
 #       أنت طبيب خبير في تحليل الأعراض الطبية وتقييم الحالات الصحية.
        
  #      النص الطبي المراد تحليله:
   #     "{text_to_analyze}"
        
#        المطلوب منك:
   #
   # 
   # 
   #        2. تقديم تحليل مفصل للحالة مع ذكر الأعراض الرئيسية
#        3. تقديم توصيات طبية واضحة ومفصلة
        
 #       أجب بصيغة JSON فقط بهذا الشكل:
#        {{
 #           "risk_level": "منخفض/متوسط/مرتفع",
  #          "risk_score": 50,
   #         "details": "تحليل مفصل للأعراض...",
    #        "recommendations": "توصيات طبية..."
     #   }}
"""
        
    elif vital_signs_list and len(vital_signs_list) > 0:
        # تحليل العلامات الحيوية
        avg_systolic = sum(v.blood_pressure_systolic for v in vital_signs_list) / len(vital_signs_list)
        avg_diastolic = sum(v.blood_pressure_diastolic for v in vital_signs_list) / len(vital_signs_list)
        avg_heart = sum(v.heart_rate for v in vital_signs_list) / len(vital_signs_list)
        avg_sugar = sum(v.blood_sugar for v in vital_signs_list) / len(vital_signs_list)
        
        prompt = f"""
       # أنت طبيب خبير في تحليل العلامات الحيوية وتقييم المخاطر الصحية.
        
   #   #  بيانات المريض:
  #      - متوسط الضغط: {avg_systolic:.0f}/{avg_diastolic:.0f}
    #    - متوسط النبض: {avg_heart:.0f} نبضة/دقيقة
     #   - متوسط السكر: {avg_sugar:.1f} ملغ/دل
        
#        المطلوب منك:
 #       1. تحديد مستوى الخطر (منخفض/متوسط/مرتفع) مع درجة من 0-100
  #      2. تحليل مفصل للحالة مع ذكر عوامل الخطر
   #     3. تقديم توصيات طبية واضحة ومفصلة
        
    #    أجب بصيغة JSON فقط:
     #   {{
     
      #      "risk_level": "منخفض/متوسط/مرتفع",
       #     "risk_score": 50,
        #    "details": "تحليل مفصل...",
         #   "recommendations": "توصيات مفصلة..."
        #}}
#        """
 #   else:
  #      return {
#            'risk_level': 'غير معروف',
 #           'risk_score': 0,
#            'details': 'لا توجد بيانات كافية للتحليل',
#            'recommendations': 'يرجى إدخال علامات حيوية أو نص طبي للتحليل'
 #       }
    
    # ============================================
    # استدعاء Gemini
    # ============================================
#    try:
 #       print(f"🔄 جاري الاتصال بـ Gemini API...")
  #      print(f"📝 نوع التحليل: {'نص طبي' if text_to_analyze else 'علامات حيوية'}")
        
        # استخدام الموديل
 #       model = genai.GenerativeModel('gemini-1.5-flash')
  #      response = model.generate_content(prompt)
   #     
    #    result_text = response.text
     #   print(f"✅ تم استلام الرد من Gemini")
        
        # ============================================
        # معالجة الرد واستخراج JSON
        # ============================================
"""       cleaned = result_text.strip()
        
        # إزالة علامات ```json إن وجدت
        if '```json' in cleaned:
            cleaned = cleaned.split('```json')[1].split('```')[0]
        elif '```' in cleaned:
            cleaned = cleaned.split('```')[1].split('```')[0]
        
        # محاولة تحويل النص إلى JSON
        try:
            result = json.loads(cleaned)
            
            return {
                'risk_level': result.get('risk_level', 'متوسط'),
                'risk_score': result.get('risk_score', 50),
                'details': result.get('details', result_text),
                'recommendations': result.get('recommendations', 'يرجى استشارة الطبيب')
            }
            
        except json.JSONDecodeError:
            # إذا لم يكن JSON صالحاً، نعيد النص كـ details
            print("⚠️ الرد ليس JSON صالحاً، نعيد النص مباشرة")
            return {
                'risk_level': 'متوسط',
                'risk_score': 50,
                'details': result_text,
                'recommendations': 'تم التحليل بواسطة Gemini (نص حر)'
            }
        
    except Exception as e:
        print(f"❌ خطأ في Gemini: {e}")
        import traceback
        traceback.print_exc()
        
        # ============================================
        # النظام الاحتياطي في حال فشل Gemini
        # ============================================
        return _analyze_with_fallback(vital_signs_list=vital_signs_list, text_to_analyze=text_to_analyze)


def _analyze_with_fallback(vital_signs_list=None, text_to_analyze=None):
    """
#    نظام تحليل احتياطي (يعمل بدون Gemini)
"""
    
    # ============================================
    # تحليل النص الحر
    # ============================================
    if text_to_analyze:
        # تحليل بسيط للنص
        text_lower = text_to_analyze.lower()
        
        # كلمات تشير إلى خطورة عالية
        high_risk_words = ['شديد', 'حارق', 'نزيف', 'إغماء', 'فقدان وعي', 'صعوبة تنفس', 'ألم شديد', 'حرارة عالية']
        medium_risk_words = ['متوسط', 'ألم', 'غثيان', 'دوار', 'صداع', 'تعب', 'إرهاق']
        
        high_count = sum(1 for word in high_risk_words if word in text_lower)
        medium_count = sum(1 for word in medium_risk_words if word in text_lower)
        
        if high_count >= 2:
            risk_level = "مرتفع"
            risk_score = 75
        elif high_count >= 1 or medium_count >= 2:
            risk_level = "متوسط"
            risk_score = 50
        else:
            risk_level = "منخفض"
            risk_score = 25
        
        details = f"تحليل الأعراض:\n{text_to_analyze}\n\n"
        details += f"✓ عدد الأعراض الشديدة: {high_count}\n"
        details += f"✓ عدد الأعراض المتوسطة: {medium_count}\n\n"
        
        if risk_level == "مرتفع":
            details += "⚠️ يحتاج المريض إلى مراجعة طبية عاجلة."
            recommendations = "🔴 توصيات عاجلة:\n- مراجعة الطوارئ فوراً\n- مراقبة العلامات الحيوية\n- عدم تناول أي دواء دون استشارة"
        elif risk_level == "متوسط":
            details += "🟡 يحتاج المريض إلى متابعة طبية قريبة."
            recommendations = "🟡 توصيات:\n- مراجعة الطبيب خلال 24-48 ساعة\n- الراحة التامة\n- شرب السوائل بكثرة"
        else:
            details += "🟢 الأعراض بسيطة، يمكن متابعتها منزلياً."
            recommendations = "🟢 توصيات:\n- مراقبة الأعراض\n- الراحة\n- في حال تفاقم الأعراض مراجعة الطبيب"
        
        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'details': details,
            'recommendations': recommendations
        }
    
    # ============================================
    # تحليل العلامات الحيوية
    # ============================================
    elif vital_signs_list and len(vital_signs_list) > 0:
        avg_systolic = sum(v.blood_pressure_systolic for v in vital_signs_list) / len(vital_signs_list)
        avg_diastolic = sum(v.blood_pressure_diastolic for v in vital_signs_list) / len(vital_signs_list)
        avg_heart = sum(v.heart_rate for v in vital_signs_list) / len(vital_signs_list)
        avg_sugar = sum(v.blood_sugar for v in vital_signs_list) / len(vital_signs_list)
        
        risk_score = 0
        risk_factors = []
        
        # تحليل ضغط الدم
        if avg_systolic > 140 or avg_diastolic > 90:
            risk_score += 30
            risk_factors.append("ارتفاع ضغط الدم")
        elif avg_systolic > 130 or avg_diastolic > 85:
            risk_score += 15
            risk_factors.append("ارتفاع طفيف في ضغط الدم")
        
        # تحليل نبضات القلب
        if avg_heart > 100:
            risk_score += 20
            risk_factors.append("تسارع في نبضات القلب")
        elif avg_heart < 60:
            risk_score += 10
            risk_factors.append("بطء في نبضات القلب")
        
        # تحليل السكر
        if avg_sugar > 200:
            risk_score += 30
            risk_factors.append("ارتفاع شديد في السكر")
        elif avg_sugar > 140:
            risk_score += 15
            risk_factors.append("ارتفاع في السكر")
        elif avg_sugar < 70:
            risk_score += 10
            risk_factors.append("انخفاض في السكر")
        
        if risk_score >= 50:
            risk_level = "مرتفع"
        elif risk_score >= 25:
            risk_level = "متوسط"
        else:
            risk_level = "منخفض"
        
        details = f"تم تحليل آخر {len(vital_signs_list)} قراءات:\n"
        details += f"- متوسط الضغط: {avg_systolic:.0f}/{avg_diastolic:.0f}\n"
        details += f"- متوسط النبض: {avg_heart:.0f} نبضة/دقيقة\n"
        details += f"- متوسط السكر: {avg_sugar:.1f} ملغ/دل\n\n"
        
        if risk_factors:
            details += f"⚠️ عوامل الخطر: {', '.join(risk_factors)}"
        else:
            details += "✅ لا توجد عوامل خطر ملحوظة"
        
        if risk_level == "مرتفع":
            recommendations = "🔴 توصيات عاجلة:\n- مراجعة الطبيب المختص فوراً\n- متابعة العلامات الحيوية بشكل يومي\n- الالتزام بالعلاجات الموصوفة"
        elif risk_level == "متوسط":
            recommendations = "🟡 توصيات:\n- متابعة العلامات الحيوية أسبوعياً\n- مراجعة الطبيب لتقييم الحالة\n- الالتزام بنمط حياة صحي"
        else:
            recommendations = "🟢 توصيات:\n- الاستمرار في نمط الحياة الصحي\n- متابعة دورية كل 3-6 أشهر\n- ممارسة الرياضة بانتظام"
        
        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'details': details,
            'recommendations': recommendations
        }
    
    else:
        return {
            'risk_level': 'غير معروف',
            'risk_score': 0,
            'details': 'لا توجد بيانات كافية للتحليل',
            'recommendations': 'يرجى إدخال علامات حيوية أو نص طبي للتحليل'
        }


def analyze_text_with_gemini(text):
 # ""#"تحليل أي نص طبي (نظام احتياطي)#"""#
 #   return _analyze_with_fallback(text_to_analyze=text)
