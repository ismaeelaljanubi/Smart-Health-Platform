import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import '../styles/App.css';
import '../styles/AddMedicalRecord.css';

function AddMedicalRecord() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    diagnosis: '',
    prescription: '',
    notes: '',
    visit_type: 'فحص دوري'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        // هذا مجرد مثال، ستحتاج إلى إنشاء API حقيقي
        setPatient({
          id: patientId,
          full_name: 'أحمد محمد',
          national_id: '123456789',
          last_visit: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error fetching patient:', error);
        setError('فشل في تحميل بيانات المريض');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatient();
  }, [patientId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await axiosInstance.post('/doctor/add-record/', {
        patient_id: patientId,
        ...formData
      });
      
      setSuccess('تم إضافة السجل الطبي بنجاح');
      
      setTimeout(() => {
        navigate(`/doctor/patients/${patientId}`);
      }, 2000);
      
    } catch (error) {
      setError(error.response?.data?.message || 'حدث خطأ أثناء إضافة السجل');
      setSubmitting(false);
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
        <div className="add-record-container">
          <h2>إضافة سجل طبي جديد</h2>
          
          {patient && (
            <div className="patient-info-card">
              <h3>معلومات المريض</h3>
              <p><strong>الاسم:</strong> {patient.full_name}</p>
              <p><strong>الرقم الوطني:</strong> {patient.national_id}</p>
              <p><strong>آخر زيارة:</strong> {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString('ar') : 'لا توجد'}</p>
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit} className="record-form">
            <div className="medical-record-grid">
              <div className="form-group">
                <label>نوع الزيارة</label>
                <select name="visit_type" value={formData.visit_type} onChange={handleChange}>
                  <option value="فحص دوري">فحص دوري</option>
                  <option value="استشارة">استشارة</option>
                  <option value="طارئ">طارئ</option>
                  <option value="متابعة">متابعة</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>التشخيص</label>
                <textarea 
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  rows="6"
                  required
                  placeholder="أدخل التشخيص الطبي بالتفصيل..."
                  />
              </div>
              
              <div className="form-group">
                <label>الوصفة الطبية / الأدوية</label>
                <textarea 
                  name="prescription"
                  value={formData.prescription}
                  onChange={handleChange}
                  rows="4"
                  placeholder="أدخل الأدوية الموصوفة والجرعات..."
                />
              </div>
              
              <div className="form-group">
                <label>ملاحظات إضافية</label>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
                إلغاء
              </button>
              <button type="submit" className="btn-save" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'حفظ السجل الطبي'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddMedicalRecord;