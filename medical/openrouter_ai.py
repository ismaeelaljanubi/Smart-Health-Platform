import requests
import json
import re
import os
from dotenv import load_dotenv

load_dotenv()

# ============================================
# 🔑 إعدادات OpenRouter API
# ============================================
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY environment variable not set")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"


# ============================================
# 📡 دالة الاتصال بـ OpenRouter (الخطوة 1)
# ============================================
def call_openrouter(prompt_text, system_instruction=None, model="openrouter/free"):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-health-platform.com",
        "X-Title": "Smart National Health Platform",
    }

    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt_text})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 1000,
    }

    try:
        response = requests.post(OPENROUTER_BASE_URL, headers=headers, json=payload)
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content']
        else:
            print(f"❌ OpenRouter API Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ OpenRouter Request Exception: {e}")
        return None


# ============================================
# 🩺 دالة تحليل الأعراض الطبية (الخطوة 2)
# ============================================
def analyze_symptoms_with_ai(symptoms_text, vital_signs_data=None, model="google/gemini-2.0-flash-lite-001"):
    """
    تحليل الأعراض الطبية باستخدام OpenRouter
    - symptoms_text: النص الذي يصف الأعراض
    - vital_signs_data: (اختياري) بيانات العلامات الحيوية
    - model: اسم النموذج المستخدم (افتراضي: google/gemini-2.0-flash-lite-001)
    """
    system_instruction = """
    أنت خبير طبي بارع في تحليل الأعراض وتقديم توصيات أولية. مهمتك هي تحليل النص المدخل،
    واستخراج الأعراض الرئيسية، وتحديد مستوى خطورتها. يجب أن يكون الرد بصيغة JSON صالحة.
    
    مثال على المطلوب:
    {
      "risk_level": "مرتفع",
      "risk_score": 85,
      "details": "تحليل مفصل للأعراض وأسباب القلق.",
      "recommendations": "ينصح بمراجعة طبيب فوراً أو التوجه إلى أقرب مستشفى."
    }
    
    فقط JSON، لا شيء آخر.
    """

    user_prompt = f"""
    بيانات المريض للتحليل:
    {symptoms_text}
    """
    
    if vital_signs_data:
        user_prompt += f"\nالعلامات الحيوية: {vital_signs_data}"

    ai_response_text = call_openrouter(user_prompt, system_instruction, model=model)

    if ai_response_text:
        # استخراج JSON من النص
        match = re.search(r'\{.*\}', ai_response_text, re.DOTALL)
        if match:
            json_str = match.group(0)
            try:
                result = json.loads(json_str)
                return result
            except json.JSONDecodeError:
                print("⚠️ خطأ في قراءة JSON")
                return {
                    "risk_level": "غير معروف", 
                    "details": ai_response_text, 
                    "recommendations": "يرجى مراجعة الطبيب"
                }
    
    # إذا فشل كل شيء
    return {
        "risk_level": "خطأ", 
        "details": "تعذر الاتصال بخدمة الذكاء الاصطناعي.",
        "recommendations": "يرجى المحاولة مرة أخرى لاحقاً"
    }