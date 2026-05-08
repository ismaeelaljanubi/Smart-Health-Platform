import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import '../styles/App.css';

function PatientDashboard() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  console.log('🔍 patientId من الرابط:', patientId);
  
  const [profile, setProfile] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddVital, setShowAddVital] = useState(false);
  const [surgeries, setSurgeries] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState(null);
  const [patientFeedback, setPatientFeedback] = useState('');
  const [vitalSigns, setVitalSigns] = useState({
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    blood_sugar: '',
    temperature: '',
    oxygen_saturation: ''
  });
  
  const [vitalSignsList, setVitalSignsList] = useState([]);
  // ===================================================
  
  // ========== متغيرات تعديل المعلومات الشخصية ==========
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    national_id: '',
    date_of_birth: '',
    blood_type: '',
    allergies: '',
    chronic_diseases: '',
    emergency_contact: '',
    emergency_phone: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);
  // ===================================================

  // ========== متغيرات الأطباء والحجز ==========
  const [doctors, setDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingData, setBookingData] = useState({
    appointment_date: '',
    reason: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  // ============================================

  // ========== متغيرات التحليل بالذكاء الاصطناعي ==========
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  // ===================================================
  
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        let profileRes;
        
        if (patientId) {
          profileRes = await axiosInstance.get(`/patient/profile/${patientId}/`);
        } else {
          profileRes = await axiosInstance.get('/login/profile/');
        }
        
        setProfile(profileRes.data);
        
        const recordsRes = await axiosInstance.get(`/patient/records/${patientId ? patientId + '/' : ''}`);
        setMedicalRecords(recordsRes.data);

        const surgeriesRes = await axiosInstance.get(`/patient/surgeries/${patientId ? patientId + '/' : ''}`);
        setSurgeries(surgeriesRes.data);
        
        // جلب العلامات الحيوية للتحليل
        if (patientId) {
          const vitalRes = await axiosInstance.get(`/patient/vital-signs/${patientId}/`);
          setVitalSignsList(vitalRes.data);
        } else if (profileRes.data?.id) {
          const vitalRes = await axiosInstance.get(`/patient/vital-signs/${profileRes.data.id}/`);
          setVitalSignsList(vitalRes.data);
        }
        
         // ✅ إضافة البيانات المنظمة (Structured Data) للمريض
        if (profileRes.data) {
          const patientData = profileRes.data;
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.text = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Patient",
            "name": `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim(),
            "email": patientData.email,
            "telephone": patientData.phone,
            "medicalRecord": {
              "@type": "MedicalRecord",
              "recordedAt": new Date().toISOString(),
              "identifier": patientData.profile?.national_id
            },
            "condition": patientData.profile?.chronic_diseases ? patientData.profile.chronic_diseases.split(',').map(c => c.trim()) : [],
            "allergy": patientData.profile?.allergies ? patientData.profile.allergies.split(',').map(a => a.trim()) : [],
            "bloodType": patientData.profile?.blood_type,
            "birthDate": patientData.profile?.date_of_birth,
            "address": patientData.profile?.address ? {
              "@type": "PostalAddress",
              "addressLocality": patientData.profile.address,
              "addressCountry": "SY"
            } : undefined
          });
          
          // إزالة أي سكريبت قديم لتجنب التكرار
          const oldScript = document.getElementById('structured-data-patient');
          if (oldScript) oldScript.remove();
          script.id = 'structured-data-patient';
          document.head.appendChild(script);
        }


      } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatientData();
  }, [patientId]);

  const handleUpdateSurgeryFeedback = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/patient/surgery-feedback/${selectedSurgery.id}/`, {
        patient_side_effects: patientFeedback
      });
      alert('✅ تم تحديث الأعراض الجانبية بنجاح');
      setShowFeedbackModal(false);
      setPatientFeedback('');
      // Refresh surgeries
      const surgeriesRes = await axiosInstance.get(`/patient/surgeries/${patientId ? patientId + '/' : ''}`);
      setSurgeries(surgeriesRes.data);
    } catch (error) {
      alert('❌ فشل تحديث الأعراض الجانبية');
    }
  };

  // ========== دوال الأطباء والحجز ==========
  const fetchDoctors = async (query = '') => {
    try {
      const res = await axiosInstance.get(`/doctors/?search=${query}`);
      setDoctors(res.data);
    } catch (error) {
      console.error('خطأ في جلب قائمة الأطباء:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'doctors') {
      fetchDoctors(searchQuery);
    }
  }, [activeTab, searchQuery]);

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookingData.appointment_date) {
      alert('الرجاء اختيار موعد');
      return;
    }

    setBookingLoading(true);
    try {
      await axiosInstance.post('/appointments/book/', {
        doctor_id: selectedDoctor.id,
        appointment_date: bookingData.appointment_date,
        reason: bookingData.reason || 'موعد طبي'
      });
      alert('✅ تم حجز الموعد بنجاح');
      setShowBookingModal(false);
      setBookingData({ appointment_date: '', reason: '' });
    } catch (error) {
      console.error('خطأ في حجز الموعد:', error);
      alert('❌ فشل حجز الموعد');
    } finally {
      setBookingLoading(false);
    }
  };
  // ==========================================

  // ========== دوال تعديل المعلومات الشخصية ==========
  const openEditModal = () => {
    setEditFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      national_id: profile?.profile?.national_id || '',
      date_of_birth: profile?.profile?.date_of_birth || '',
      blood_type: profile?.profile?.blood_type || '',
      allergies: profile?.profile?.allergies || '',
      chronic_diseases: profile?.profile?.chronic_diseases || '',
      emergency_contact: profile?.profile?.emergency_contact || '',
      emergency_phone: profile?.profile?.emergency_phone || '',
      address: profile?.profile?.address || ''
      
    });
    setShowEditModal(true);
  };

  const handleUpdateProfile = async () => {
  const profileIdToUpdate = patientId || profile?.profile?.id || profile?.id;
  if (!profileIdToUpdate) {
    alert("لا يمكن تحديث البيانات: معرف الملف غير موجود");
    setSaving(false);
    return;
  }
  setSaving(true);
  try {
    console.log("📝 البيانات المرسلة لتحديث الملف:", {
      id: profileIdToUpdate,
      ...editFormData
    });
    await axiosInstance.put(`/patient/update/${profileIdToUpdate}/`, editFormData);
    alert('✅ تم تحديث المعلومات بنجاح');
    setShowEditModal(false);
    
    // إعادة جلب البيانات
    const profileRes = await axiosInstance.get(`/patient/profile/${profileIdToUpdate}/`);
    console.log("✅ البيانات المسترجعة بعد التحديث:", profileRes.data);
    setProfile(profileRes.data);
    
    // تحديث العلامات الحيوية
    const vitalRes = await axiosInstance.get(`/patient/vital-signs/${profileIdToUpdate}/`);
    setVitalSignsList(vitalRes.data);
    
  } catch (error) {
    console.error("❌ خطأ في التحديث:", error);
    alert('❌ فشل تحديث المعلومات');
  } finally {
    setSaving(false);
  }
};
  // ================================================

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_type');
    navigate('/login');
  };

  const handleAnalyzeVitals = async () => {
    setAnalysisLoading(true);
    try {
      const currentId = patientId || profile?.id;
      const res = await axiosInstance.post('/analyze-risk/', {
        patient_id: currentId
      });
      setAnalysisResult(res.data);
      setShowAnalysisModal(true);
    } catch (error) {
      console.error('خطأ في تحليل البيانات:', error);
      alert('❌ فشل تحليل البيانات، تأكد من وجود علامات حيوية كافية (على الأقل 1)');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    switch(level) {
      case 'منخفض': return '#4CAF50';
      case 'متوسط': return '#FF9800';
      case 'مرتفع': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getRiskLevelIcon = (level) => {
    switch(level) {
      case 'منخفض': return '🟢';
      case 'متوسط': return '🟡';
      case 'مرتفع': return '🔴';
      default: return '⚪';
    }
  };

  const handleAddVitalSigns = async (e) => {
  e.preventDefault();
  
  // الحصول على معرف المريض الصحيح
  const currentId = patientId || profile?.id;
  if (!currentId) {
    alert("معرف المريض غير موجود");
    return;
  }
  console.log("🆔 patientId:", patientId);
  console.log("🆔 profile?.id:", profile?.id);
  console.log("🆔 currentId:", currentId);
  
  try {
    await axiosInstance.post('/patient/add-vital-signs/', {
      patient_id: currentId,
      ...vitalSigns
    });
    alert('✅ تم إضافة العلامات الحيوية بنجاح');
    setShowAddVital(false);
    setVitalSigns({
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      heart_rate: '',
      blood_sugar: '',
      temperature: '',
      oxygen_saturation: ''
    });
    
    // تحديث قائمة العلامات الحيوية بعد الإضافة
    const vitalRes = await axiosInstance.get(`/patient/vital-signs/${currentId}/`);
    setVitalSignsList(vitalRes.data);
    
  } catch (error) {
    console.error('خطأ في إضافة العلامات الحيوية:', error);
    
    // رسالة خطأ مفهومة
    if (error.response?.status === 404) {
      alert('❌ الخادم لا يستجيب، تأكد من اتصالك بالإنترنت');
    } else if (error.response?.status === 403) {
      alert('❌ ليس لديك صلاحية لإضافة العلامات الحيوية');
    } else {
      alert('❌ فشل إضافة العلامات الحيوية');
    }
  }
};

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'غير محدد';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} سنة`;
  };

  if (loading) return <div className="loading">جاري تحميل الملف الطبي...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header slide-down delay-200">
        <h1>🏥 منصة الصحة الوطنية الذكية</h1>
        <div className="user-info">
          <span>السلام عليكم، {profile?.first_name} {profile?.last_name}</span>
          <button onClick={handleLogout} className="logout-btn">تسجيل خروج</button>
        </div>
      </header>
      
      <div className="dashboard-content">
        {/* tabs التنقل */}
        <div className="profile-tabs slide-up delay-300">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📋 نظرة عامة
          </button>
          <button 
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            📚 السجلات الطبية
          </button>
          <button 
            className={`tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
            onClick={() => setActiveTab('vitals')}
          >
            📊 العلامات الحيوية
          </button>
          <button 
            className={`tab-btn ${activeTab === 'medications' ? 'active' : ''}`}
            onClick={() => setActiveTab('medications')}
          >
            💊 الأدوية
          </button>
          <button 
            className={`tab-btn ${activeTab === 'surgeries' ? 'active' : ''}`}
            onClick={() => setActiveTab('surgeries')}
          >
            🔪 العمليات الجراحية
          </button>
          <button 
            className={`tab-btn ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => setActiveTab('doctors')}
          >
            👨‍⚕️ الأطباء
          </button>
        </div>

        {/* محتوى tabs */}
        <div className="tab-content slide-up delay-400">
          {/* ========== نظرة عامة ========== */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="patient-header-card hover-lift card-hover">
                <div className="patient-avatar">
                  <div className="avatar-circle">
                    {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
                  </div>
                </div>
                <div className="patient-basic-info">
                  <h2>{profile?.first_name} {profile?.last_name}</h2>
                  <p>📧 {profile?.email}</p>
                  <p>📞 {profile?.phone}</p>
                </div>
                <div className="patient-stats">
                  <div className="stat-item">
                    <span className="stat-label">العمر</span>
                    <span className="stat-value">{calculateAge(profile?.profile?.date_of_birth)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">فصيلة الدم</span>
                    <span className="stat-value blood-type">{profile?.profile?.blood_type || 'غير محدد'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">آخر زيارة</span>
                    <span className="stat-value">
                      {medicalRecords[0]?.date ? new Date(medicalRecords[0].date).toLocaleDateString('ar') : 'لا توجد'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-grid">
                {/* المعلومات الشخصية */}
                <div className="info-card hover-lift card-hover">
                  <h3>📋 المعلومات الشخصية</h3>
                  <div className="info-row">
                    <span className="info-label">الرقم الوطني:</span>
                    <span className="info-value">{profile?.profile?.national_id || 'غير محدد'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">تاريخ الميلاد:</span>
                    <span className="info-value">
                      {profile?.profile?.date_of_birth ? new Date(profile.profile.date_of_birth).toLocaleDateString('ar') : 'غير محدد'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">فصيلة الدم:</span>
                    <span className="info-value blood-badge">{profile?.profile?.blood_type || 'غير محدد'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">العنوان:</span>
                    <span className="info-value">{profile?.profile?.address || 'غير محدد'}</span>
                  </div>
                </div>

                {/* جهات الاتصال الطارئة */}
                <div className="info-card hover-lift card-hover">
                  <h3>🚨 جهات الاتصال الطارئة</h3>
                  <div className="info-row">
                    <span className="info-label">جهة الاتصال:</span>
                    <span className="info-value">{profile?.profile?.emergency_contact || 'غير محدد'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">رقم الطوارئ:</span>
                    <span className="info-value">{profile?.profile?.emergency_phone || 'غير محدد'}</span>
                  </div>
                </div>

                {/* الحساسيات والأمراض المزمنة */}
                <div className="info-card hover-lift card-hover">
                  <h3>⚠️ الحساسيات والأمراض المزمنة</h3>
                  <div className="info-row">
                    <span className="info-label">الحساسيات:</span>
                    <span className="info-value allergy">{profile?.profile?.allergies || 'لا توجد'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">الأمراض المزمنة:</span>
                    <span className="info-value chronic">{profile?.profile?.chronic_diseases || 'لا توجد'}</span>
                  </div>
                </div>
              </div>

              {/* زر تعديل المعلومات */}
              <div style={{ textAlign: 'left', marginTop: '20px', marginBottom: '20px' }}>
                <button className="btn-edit" onClick={openEditModal}>
                  ✏️ تعديل المعلومات الشخصية
                </button>
              </div>
            </div>
          )}

          {/* ========== السجلات الطبية ========== */}
          {activeTab === 'records' && (
            <div className="records-tab">
              <h2>📚 السجلات الطبية</h2>
              {medicalRecords.length === 0 ? (
                <p className="no-data">لا توجد سجلات طبية حتى الآن</p>
              ) : (
                <div className="timeline">
                  {medicalRecords.map((record) => (
                    <div key={record.id} className="timeline-item">
                      <div className="timeline-date">
                        {new Date(record.date).toLocaleDateString('ar')}
                      </div>
                      <div className="timeline-content">
                        <div className="record-header">
                          <span className="visit-type">{record.visit_type}</span>
                          <span className="doctor-name">د. {record.doctor_name}</span>
                        </div>
                        <div className="record-diagnosis">
                          <strong>التشخيص:</strong>
                          <p>{record.diagnosis}</p>
                        </div>
                        {record.prescription && (
                          <div className="record-prescription">
                            <strong>الوصفة الطبية:</strong>
                            <p>{record.prescription}</p>
                          </div>
                        )}
                        {record.notes && (
                          <div className="record-notes">
                            <strong>ملاحظات:</strong>
                            <p>{record.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== العلامات الحيوية ========== */}
          {activeTab === 'vitals' && (
            <div className="vitals-tab">
              <div className="section-header">
                <h2>📊 العلامات الحيوية</h2>
                <button className="btn-add" onClick={() => setShowAddVital(true)}>
                  ➕ إضافة قياسات جديدة
                </button>
              </div>

              {showAddVital && (
                <div className="modal">
                  <div className="modal-content">
                    <h3>➕ إضافة علامات حيوية جديدة</h3>
                    <form onSubmit={handleAddVitalSigns}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>الضغط الانقباضي</label>
                          <input
                            type="number"
                            placeholder="مثال: 120"
                            value={vitalSigns.blood_pressure_systolic}
                            onChange={(e) => setVitalSigns({...vitalSigns, blood_pressure_systolic: e.target.value})}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>الضغط الانبساطي</label>
                          <input
                            type="number"
                            placeholder="مثال: 80"
                            value={vitalSigns.blood_pressure_diastolic}
                            onChange={(e) => setVitalSigns({...vitalSigns, blood_pressure_diastolic: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>معدل نبضات القلب</label>
                          <input
                            type="number"
                            placeholder="مثال: 75"
                            value={vitalSigns.heart_rate}
                            onChange={(e) => setVitalSigns({...vitalSigns, heart_rate: e.target.value})}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>نسبة السكر في الدم</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="مثال: 110"
                            value={vitalSigns.blood_sugar}
                            onChange={(e) => setVitalSigns({...vitalSigns, blood_sugar: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>درجة الحرارة</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="مثال: 37"
                            value={vitalSigns.temperature}
                            onChange={(e) => setVitalSigns({...vitalSigns, temperature: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>تشبع الأكسجين</label>
                          <input
                            type="number"
                            placeholder="مثال: 98"
                            value={vitalSigns.oxygen_saturation}
                            onChange={(e) => setVitalSigns({...vitalSigns, oxygen_saturation: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="modal-actions">
                        <button type="submit" className="btn-save">💾 حفظ</button>
                        <button type="button" className="btn-cancel" onClick={() => setShowAddVital(false)}>❌ إلغاء</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <table className="vitals-table">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>الضغط</th>
                    <th>النبض</th>
                    <th>السكر</th>
                    <th>الحرارة</th>
                    <th>الأكسجين</th>
                  </tr>
                </thead>
                <tbody>
                  {vitalSignsList.map((sign, idx) => (
                    <tr key={idx}>
                      <td>{new Date(sign.recorded_at).toLocaleDateString('ar')}</td>
                      <td>{sign.blood_pressure_systolic}/{sign.blood_pressure_diastolic}</td>
                      <td>{sign.heart_rate}</td>
                      <td>{sign.blood_sugar}</td>
                      <td>{sign.temperature || '—'}</td>
                      <td>{sign.oxygen_saturation || '—'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="analysis-actions" style={{ marginTop: '20px', textAlign: 'center' }}>
                <button 
                  className="btn-ai-analyze" 
                  onClick={handleAnalyzeVitals}
                  disabled={analysisLoading || vitalSignsList.length === 0}
                  style={{
                    backgroundColor: '#6c5ce7',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(108, 92, 231, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {analysisLoading ? '⏳ جاري تحليل بياناتك...' : '🤖 تحليل حالتي الصحية بالذكاء الاصطناعي'}
                </button>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                  * سيقوم الذكاء الاصطناعي بتحليل آخر 5 قراءات للعلامات الحيوية وتقديم تقرير شامل.
                </p>
              </div>
            </div>
          )}

          {/* ========== الأدوية ========== */}
          {activeTab === 'medications' && (
            <div className="medications-tab">
              <h2>💊 الأدوية</h2>
              <div className="medications-grid">
                {medicalRecords
                  .filter(record => record.prescription)
                  .map(record => (
                    <div key={record.id} className="medication-card hover-lift card-hover">
                      <div className="medication-date">{new Date(record.date).toLocaleDateString('ar')}</div>
                      <div className="medication-doctor">د. {record.doctor_name}</div>
                      <div className="medication-prescription">{record.prescription}</div>
                      <div className="medication-status">✅ تم الصرف</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========== العمليات الجراحية ========== */}
          {activeTab === 'surgeries' && (
            <div className="surgeries-tab">
              <h2>🔪 العمليات الجراحية</h2>
              {surgeries.length === 0 ? (
                <p className="no-data">لا توجد عمليات مسجلة حالياً</p>
              ) : (
                <div className="surgeries-list">
                  {surgeries.map((surgery) => (
                    <div key={surgery.id} className={`surgery-card ${surgery.status === 'completed' ? 'past' : 'future'} hover-lift card-hover`}>
                      <div className="surgery-header">
                        <span className="surgery-date">{new Date(surgery.surgery_date).toLocaleDateString('ar')}</span>
                        <span className={`status-badge ${surgery.status === 'completed' ? 'badge-stable' : 'badge-followup'}`}>
                          {surgery.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                        </span>
                      </div>
                      <h3 className="surgery-name">{surgery.surgery_name}</h3>
                      <p className="surgery-hospital">🏥 {surgery.hospital}</p>
                      <p className="surgery-doctor">👨‍⚕️ د. {surgery.doctor_name}</p>
                      
                      {surgery.status === 'completed' && (
                        <div className="post-op-info">
                          <hr />
                          <div className="meds">
                            <strong>💊 الأدوية والمسكنات:</strong>
                            <p>{surgery.post_surgery_medications || 'لا يوجد'}</p>
                          </div>
                          <div className="effects">
                            <strong>⚠️ الأعراض الجانبية (تقرير الطبيب):</strong>
                            <p>{surgery.doctor_side_effects || 'لا يوجد'}</p>
                          </div>
                          <div className="patient-effects">
                            <strong>🤝 ملاحظاتك حول الأعراض الجانبية:</strong>
                            <p>{surgery.patient_side_effects || 'لم يتم تسجيل ملاحظات بعد'}</p>
                            <button 
                              className="btn-edit" 
                              style={{marginTop: '10px'}}
                              onClick={() => { setSelectedSurgery(surgery); setPatientFeedback(surgery.patient_side_effects || ''); setShowFeedbackModal(true); }}
                            >
                              ✍️ {surgery.patient_side_effects ? 'تعديل ملاحظاتك' : 'إضافة ملاحظاتك'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== الأطباء والحجز ========== */}
          {activeTab === 'doctors' && (
            <div className="doctors-tab">
              <div className="section-header">
                <h2>👨‍⚕️ الأطباء المتاحون في المنصة</h2>
                <div className="search-box">
                  <input 
                    type="text" 
                    placeholder="ابحث عن طبيب أو تخصص..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="btn-search">🔍</button>
                </div>
              </div>
              
              <div className="doctors-grid">
                {doctors.length === 0 ? (
                  <p className="no-data">لا يوجد أطباء مطابقين للبحث</p>
                ) : (
                  doctors.map((doctor) => (
                    <div key={doctor.id} className="doctor-card hover-lift card-hover">
                      <div className="doctor-avatar">
                        {doctor.user.first_name.charAt(0)}{doctor.user.last_name.charAt(0)}
                      </div>
                      <h3>د. {doctor.user.first_name} {doctor.user.last_name}</h3>
                      <p className="specialization">🎓 {doctor.specialization}</p>
                      <p className="hospital">🏥 {doctor.hospital || 'منصة الصحة الذكية'}</p>
                      <p className="experience">⭐ خبرة {doctor.years_experience} سنوات</p>
                      <button 
                        className="btn-book"
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setShowBookingModal(true);
                        }}
                      >
                        📅 حجز موعد
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== نافذة حجز موعد ========== */}
      {showBookingModal && selectedDoctor && (
        <div className="modal-overlay fade-in" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content-ai" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 حجز موعد مع د. {selectedDoctor.user.first_name} {selectedDoctor.user.last_name}</h3>
              <button className="close-btn" onClick={() => setShowBookingModal(false)}>✖</button>
            </div>
            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label>📅 اختر تاريخ ووقت الموعد</label>
                <input 
                  type="datetime-local" 
                  value={bookingData.appointment_date}
                  onChange={(e) => setBookingData({...bookingData, appointment_date: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>📝 سبب الزيارة</label>
                <textarea 
                  rows="3" 
                  placeholder="مثال: فحص دوري، استشارة بخصوص..."
                  value={bookingData.reason}
                  onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowBookingModal(false)}>إلغاء</button>
                <button type="submit" className="btn-save" disabled={bookingLoading}>
                  {bookingLoading ? 'جاري الحجز...' : '✅ تأكيد الحجز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== نافذة تسجيل الأعراض الجانبية ========== */}
      {showFeedbackModal && selectedSurgery && (
        <div className="modal-overlay fade-in" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content-ai" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✍️ تسجيل الأعراض الجانبية: {selectedSurgery.surgery_name}</h3>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}>✖</button>
            </div>
            <form onSubmit={handleUpdateSurgeryFeedback}>
              <div className="form-group">
                <label>📝 كيف تشعر بعد العملية؟ (الأعراض الجانبية، ألم، ملاحظات)</label>
                <textarea 
                  rows="5" 
                  placeholder="يرجى كتابة أي أعراض تشعر بها هنا ليطلع عليها الطبيب..."
                  value={patientFeedback}
                  onChange={(e) => setPatientFeedback(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowFeedbackModal(false)}>إلغاء</button>
                <button type="submit" className="btn-save">💾 حفظ الملاحظات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay fade-in" onClick={() => setShowEditModal(false)}>
          <div className="modal-content-ai" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px'}}>
            <div className="modal-header">
              <h3>✏️ تعديل المعلومات الشخصية</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>✖</button>
            </div>
            <div className="edit-form-grid">
              <div className="form-group">
                <label>الاسم الأول</label>
                <input type="text" value={editFormData.first_name} onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>الاسم الأخير</label>
                <input type="text" value={editFormData.last_name} onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>رقم الهاتف</label>
                <input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>الرقم الوطني</label>
                <input type="text" value={editFormData.national_id} onChange={(e) => setEditFormData({...editFormData, national_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>تاريخ الميلاد</label>
                <input type="date" value={editFormData.date_of_birth} onChange={(e) => setEditFormData({...editFormData, date_of_birth: e.target.value})} />
              </div>
              <div className="form-group">
                <label>فصيلة الدم</label>
                <select value={editFormData.blood_type} onChange={(e) => setEditFormData({...editFormData, blood_type: e.target.value})}>
                  <option value="">اختر</option>
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
                <input type="text" value={editFormData.address} onChange={(e) => setEditFormData({...editFormData, address: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>الحساسيات</label>
                <textarea rows="2" value={editFormData.allergies} onChange={(e) => setEditFormData({...editFormData, allergies: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>الأمراض المزمنة</label>
                <textarea rows="2" value={editFormData.chronic_diseases} onChange={(e) => setEditFormData({...editFormData, chronic_diseases: e.target.value})} />
              </div>
              <div className="form-group">
                <label>جهة اتصال طارئة</label>
                <input type="text" value={editFormData.emergency_contact} onChange={(e) => setEditFormData({...editFormData, emergency_contact: e.target.value})} />
              </div>
              <div className="form-group">
                <label>رقم الطوارئ</label>
                <input type="tel" value={editFormData.emergency_phone} onChange={(e) => setEditFormData({...editFormData, emergency_phone: e.target.value})} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>إلغاء</button>
              <button className="btn-save" onClick={handleUpdateProfile} disabled={saving}>{saving ? 'جاري الحفظ...' : '💾 حفظ التغييرات'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== نافذة نتائج تحليل الذكاء الاصطناعي ========== */}
      {showAnalysisModal && analysisResult && (
        <div className="modal-overlay fade-in" onClick={() => setShowAnalysisModal(false)}>
          <div className="modal-content-ai" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>🤖 تقرير التحليل الذكي لحالتك الصحية</h3>
              <button className="close-btn" onClick={() => setShowAnalysisModal(false)}>✖</button>
            </div>
            
            <div className="analysis-result-body" style={{ padding: '20px' }}>
              <div 
                className="risk-level-banner" 
                style={{
                  backgroundColor: getRiskLevelColor(analysisResult.risk_level),
                  color: 'white',
                  padding: '15px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '15px'
                }}
              >
                <span style={{ fontSize: '2rem' }}>{getRiskLevelIcon(analysisResult.risk_level)}</span>
                <div>
                  <h2 style={{ margin: 0 }}>مستوى الخطر: {analysisResult.risk_level}</h2>
                  <p style={{ margin: 0, opacity: 0.9 }}>درجة التقييم: {analysisResult.risk_score} / 100</p>
                </div>
              </div>

              <div className="analysis-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ borderRight: '4px solid #6c5ce7', paddingRight: '10px', color: '#2d3436' }}>📊 تفاصيل التحليل الطبي</h4>
                <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', lineHeight: '1.6' }}>
                  {analysisResult.details?.split('\n').map((line, i) => (
                    <p key={i} style={{ marginBottom: '8px' }}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="analysis-section" style={{ marginBottom: '20px' }}>
                <h4 style={{ borderRight: '4px solid #00b894', paddingRight: '10px', color: '#2d3436' }}>💡 التوصيات الصحية</h4>
                <div style={{ backgroundColor: '#e1f5fe', padding: '15px', borderRadius: '8px', lineHeight: '1.6' }}>
                  {analysisResult.recommendations?.split('\n').map((line, i) => (
                    <p key={i} style={{ marginBottom: '8px' }}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="analysis-footer" style={{ fontSize: '0.85rem', color: '#636e72', fontStyle: 'italic', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                تاريخ التحليل: {new Date(analysisResult.analysis_date).toLocaleString('ar')} | تم بواسطة نظام الذكاء الاصطناعي الخاص بالمنصة
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-save" onClick={() => setShowAnalysisModal(false)}>فهمت ذلك</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;