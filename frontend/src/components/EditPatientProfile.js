import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import '../styles/App.css';

function EditPatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    blood_type: '',
    allergies: '',
    chronic_diseases: '',
    emergency_contact: '',
    emergency_phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await axiosInstance.get(`/patient/profile/${patientId}/`);
        const data = res.data;
        setPatient(data);
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          date_of_birth: data.profile?.date_of_birth || '',
          blood_type: data.profile?.blood_type || '',
          allergies: data.profile?.allergies || '',
          chronic_diseases: data.profile?.chronic_diseases || '',
          emergency_contact: data.profile?.emergency_contact || '',
          emergency_phone: data.profile?.emergency_phone || '',
          address: data.profile?.address || ''
        });
      } catch (error) {
        console.error('خطأ:', error);
        setMessage('فشل تحميل بيانات المريض');
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [patientId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axiosInstance.put(`/patient/update/${patientId}/`, formData);
      setMessage('✅ تم تحديث المعلومات بنجاح');
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      console.error('خطأ في الحفظ:', error);
      setMessage('❌ فشل تحديث المعلومات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>منصة الصحة الوطنية الذكية</h1>
        <div className="user-info">
          <button onClick={() => navigate(-1)} className="logout-btn">عودة</button>
        </div>
      </header>
      <div className="dashboard-content">
        <div className="edit-profile-container">
          <h2>✏️ تعديل معلومات المريض</h2>
          <p className="patient-name">{patient?.first_name} {patient?.last_name}</p>
          
          {message && <div className={message.includes('✅') ? 'success-message' : 'error-message'}>{message}</div>}
          
          <form onSubmit={handleSubmit} className="edit-form">
            <div className="form-row">
              <div className="form-group">
                <label>الاسم الأول</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>الاسم الأخير</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>رقم الهاتف</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>تاريخ الميلاد</label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>فصيلة الدم</label>
                <select name="blood_type" value={formData.blood_type} onChange={handleChange}>
                  <option value="">اختر فصيلة الدم</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div className="form-group">
                <label>العنوان</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-group">
              <label>الحساسيات</label>
              <textarea name="allergies" rows="2" value={formData.allergies} onChange={handleChange} placeholder="مثال: حساسية البنسلين"></textarea>
            </div>
            
            <div className="form-group">
              <label>الأمراض المزمنة</label>
              <textarea name="chronic_diseases" rows="2" value={formData.chronic_diseases} onChange={handleChange} placeholder="مثال: سكري، ضغط دم"></textarea>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>جهة اتصال طارئة</label>
                <input type="text" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>رقم الطوارئ</label>
                <input type="tel" name="emergency_phone" value={formData.emergency_phone} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>إلغاء</button>
              <button type="submit" className="btn-save" disabled={saving}>{saving ? 'جاري الحفظ...' : '💾 حفظ التغييرات'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditPatientProfile;