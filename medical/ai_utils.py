import numpy as np
from datetime import datetime, timedelta

def assess_risk_level(vital_signs_list):
    if not vital_signs_list:
        return "غير معروف", 0, "لا توجد بيانات كافية", "يرجى تسجيل علامات حيوية للمريض"
    
    # حساب المتوسطات
    avg_systolic = np.mean([v.blood_pressure_systolic for v in vital_signs_list])
    avg_diastolic = np.mean([v.blood_pressure_diastolic for v in vital_signs_list])
    avg_heart_rate = np.mean([v.heart_rate for v in vital_signs_list])
    avg_blood_sugar = np.mean([v.blood_sugar for v in vital_signs_list])
    
    # حساب درجات الخطر
    risk_score = 0
    risk_factors = []
    
    # تحليل ضغط الدم
    if avg_systolic > 140 or avg_diastolic > 90:
        risk_score += 30
        risk_factors.append("ارتفاع ضغط الدم")
    elif avg_systolic > 130 or avg_diastolic > 85:
        risk_score += 15
        risk_factors.append("ارتفاع طفيف في ضغط الدم")
    
    # تحليل معدل نبضات القلب
    if avg_heart_rate > 100:
        risk_score += 20
        risk_factors.append("تسارع في نبضات القلب")
    elif avg_heart_rate < 60:
        risk_score += 10
        risk_factors.append("بطء في نبضات القلب")
    
    # تحليل نسبة السكر
    if avg_blood_sugar > 200:
        risk_score += 30
        risk_factors.append("ارتفاع شديد في السكر")
    elif avg_blood_sugar > 140:
        risk_score += 15
        risk_factors.append("ارتفاع في السكر")
    elif avg_blood_sugar < 70:
        risk_score += 10
        risk_factors.append("انخفاض في السكر")
    
    # تحديد مستوى الخطر
    if risk_score >= 50:
        risk_level = "مرتفع"
    elif risk_score >= 25:
        risk_level = "متوسط"
    else:
        risk_level = "منخفض"
    
    # إنشاء تفاصيل التحليل
    details = f"تم تحليل آخر {len(vital_signs_list)} قراءات:\n"
    details += f"- متوسط الضغط: {avg_systolic:.0f}/{avg_diastolic:.0f}\n"
    details += f"- متوسط النبض: {avg_heart_rate:.0f}\n"
    details += f"- متوسط السكر: {avg_blood_sugar:.1f}\n"
    
    if risk_factors:
        details += f"عوامل الخطر: {', '.join(risk_factors)}"
    else:
        details += "لا توجد عوامل خطر ملحوظة"
    
    # إنشاء توصيات
    recommendations = "توصيات:\n"
    if risk_level == "مرتفع":
        recommendations += "- يرجى مراجعة الطبيب المختص فوراً\n"
        recommendations += "- متابعة العلامات الحيوية بشكل يومي\n"
        recommendations += "- الالتزام بالعلاجات الموصوفة"
    elif risk_level == "متوسط":
        recommendations += "- متابعة العلامات الحيوية أسبوعياً\n"
        recommendations += "- مراجعة الطبيب لتقييم الحالة\n"
        recommendations += "- الالتزام بنمط حياة صحي"
    else:
        recommendations += "- الاستمرار في نمط الحياة الصحي\n"
        recommendations += "- متابعة دورية كل 3-6 أشهر"
    
    return risk_level, risk_score, details, recommendations