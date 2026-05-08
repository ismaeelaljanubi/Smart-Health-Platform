import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('محاولة تسجيل الدخول:', { email, password });
      
      const response = await axios.post('http://localhost:8000/api/login/login/', {
        email: email,
        password: password
      });
      
      console.log('الرد من السيرفر:', response.data);

      // حفظ البيانات في localStorage
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('user_type', response.data.user_type);

      // التوجيه حسب نوع المستخدم
      if (response.data.user_type === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.data.user_type === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
      
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      console.error('تفاصيل:', error.response?.data);
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>تسجيل الدخول</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="أدخل بريدك الإلكتروني"
            />
          </div>
          
          <div className="form-group">
            <label>كلمة المرور</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="أدخل كلمة المرور"
            />
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
        
        <p>
          ليس لديك حساب؟ <Link to="/register">إنشاء حساب جديد</Link>
        </p>
      </div>
      <p className="footer-text">قام بتصميم هذه المنصة المهندس اسماعيل الكنعان</p>
    </div>
  );
}

export default Login;