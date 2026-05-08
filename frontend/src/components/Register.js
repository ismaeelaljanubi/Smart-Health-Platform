import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function Register() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    user_type: 'patient',
    specialization: '',
    license_number: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    // التحقق من تطابق كلمة المرور
    if (formData.password !== formData.confirm_password) {
      setError('كلمة المرور وتأكيدها غير متطابقين');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.post('http://localhost:8000/api/login/register/', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        user_type: formData.user_type,
        specialization: formData.user_type === 'doctor' ? formData.specialization : '',
        license_number: formData.user_type === 'doctor' ? formData.license_number : ''
      });
      
      setSuccess('تم إنشاء الحساب بنجاح! جاري تحويلك إلى صفحة تسجيل الدخول...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      console.error('خطأ في التسجيل:', error);
      
      let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
      
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'object') {
          // استخراج أول خطأ من الأخطاء التي أرجعها السيرفر
          const firstErrorKey = Object.keys(error.response.data)[0];
          const firstErrorValue = error.response.data[firstErrorKey];
          
          if (Array.isArray(firstErrorValue)) {
            errorMessage = firstErrorValue[0];
          } else if (typeof firstErrorValue === 'string') {
            errorMessage = firstErrorValue;
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="card register-card">
        <h2>إنشاء حساب جديد</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label>الاسم الأول</label>
              <input 
                type="text" 
                name="first_name"
                value={formData.first_name} 
                onChange={handleChange} 
                required 
                placeholder="أحمد"
              />
            </div>
            
            <div className="form-group">
              <label>الاسم الأخير</label>
              <input 
                type="text" 
                name="last_name"
                value={formData.last_name} 
                onChange={handleChange} 
                required 
                placeholder="محمد"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input 
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange} 
              required 
              placeholder="example@email.com"
            />
          </div>
          
          <div className="form-group">
            <label>رقم الهاتف</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone} 
              onChange={handleChange} 
              required 
              placeholder="09XXXXXXXX"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>كلمة المرور</label>
              <input 
                type="password" 
                name="password"
                value={formData.password} 
                onChange={handleChange} 
                required 
                placeholder="****"
              />
              </div>
            
            <div className="form-group">
              <label>تأكيد كلمة المرور</label>
              <input 
                type="password" 
                name="confirm_password"
                value={formData.confirm_password} 
                onChange={handleChange} 
                required 
                placeholder="****"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>نوع المستخدم</label>
            <select name="user_type" value={formData.user_type} onChange={handleChange}>
              <option value="patient">مريض</option>
              <option value="doctor">طبيب</option>
            </select>
          </div>
          
          {formData.user_type === 'doctor' && (
            <div className="form-row animate-fadeIn">
              <div className="form-group">
                <label>التخصص الطبي</label>
                <input 
                  type="text" 
                  name="specialization"
                  value={formData.specialization} 
                  onChange={handleChange} 
                  required={formData.user_type === 'doctor'}
                  placeholder="مثلاً: طب أعصاب"
                />
              </div>
              
              <div className="form-group">
                <label>رقم الترخيص</label>
                <input 
                  type="text" 
                  name="license_number"
                  value={formData.license_number} 
                  onChange={handleChange} 
                  required={formData.user_type === 'doctor'}
                  placeholder="رقم الترخيص الطبي"
                />
              </div>
            </div>
          )}
          
          <button type="submit" disabled={loading}>
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>
        </form>
        
        <p>
          لديك حساب بالفعل؟ <Link to="/login">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;