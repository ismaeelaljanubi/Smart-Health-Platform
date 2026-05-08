import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import '../styles/DoctorDashboard.css';

function DoctorDashboard() {
  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('patients');
  const [appointments, setAppointments] = useState([]);
  const [surgeries, setSurgeries] = useState([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);
  const [showAddSurgery, setShowAddSurgery] = useState(false);
  const [showCompleteSurgery, setShowCompleteSurgery] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    national_id: '',
    phone: '',
    blood_type: '',
    address: ''
  });
  const [newSurgery, setNewSurgery] = useState({
    patient: '',
    surgery_name: '',
    surgery_date: '',
    hospital: '',
    notes: ''
  });
  const [completionData, setCompletionData] = useState({
    post_surgery_medications: '',
    doctor_side_effects: '',
    completion_date: new Date().toISOString().slice(0, 16)
  });
  const [newReport, setNewReport] = useState({
    diagnosis: '',
    prescription: '',
    notes: '',
    visit_type: 'فحص دوري',
    patient_status: 'مستقر'
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await axiosInstance.get('/login/profile/');
      setProfile(profileRes.data);
      
      const patientsRes = await axiosInstance.get('/doctor/patients/');
      setPatients(patientsRes.data);
      setFilteredPatients(patientsRes.data);
      
      const appointmentsRes = await axiosInstance.get('/doctor/appointments/');
      setAppointments(appointmentsRes.data);

      const surgeriesRes = await axiosInstance.get('/doctor/surgeries/');
      setSurgeries(surgeriesRes.data);
      
       // ✅ إضافة البيانات المنظمة (Structured Data) للوكلاء الذكية
      if (patientsRes.data && patientsRes.data.length > 0) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "قائمة الأطباء المتاحين",
          "description": "أطباء منصة الصحة الوطنية الذكية",
          "numberOfItems": patientsRes.data.length,
          "itemListElement": patientsRes.data.map((doctor, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Physician",
              "name": doctor.full_name,
              "specialty": doctor.specialization || "غير محدد",
              "telephone": doctor.phone,
              "availableService": {
                "@type": "MedicalProcedure",
                "name": "استشارة طبية",
                "description": "خدمة استشارة طبية عن بعد"
              },
              "address": {
                "@type": "PostalAddress",
                "addressLocality": doctor.hospital || "دمشق",
                "addressCountry": "SY"
              }
            }
          }))
        });
        
        // إزالة أي سكريبت قديم لتجنب التكرار
        const oldScript = document.getElementById('structured-data-doctors');
        if (oldScript) oldScript.remove();
        script.id = 'structured-data-doctors';
        document.head.appendChild(script);
      }



    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      const fakePatients = [
        { id: 1, full_name: 'أحمد محمد', national_id: '123456789', phone: '0912345678', blood_type: 'O+', last_visit: '2026-03-10', status: 'مستقر', risk_level: 'منخفض', diagnosis: 'زكام عادي' },
        { id: 2, full_name: 'سارة أحمد', national_id: '987654321', phone: '0923456789', blood_type: 'A+', last_visit: '2026-03-09', status: 'حرجة', risk_level: 'مرتفع', diagnosis: 'ارتفاع ضغط الدم' },
        { id: 3, full_name: 'محمد علي', national_id: '456789123', phone: '0934567890', blood_type: 'B+', last_visit: '2026-03-08', status: 'متابعة', risk_level: 'متوسط', diagnosis: 'السكري من النوع الثاني' },
      ];
      setPatients(fakePatients);
      setFilteredPatients(fakePatients);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = patients.filter(patient =>
      patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.national_id?.includes(searchTerm)
    );
    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_type');
    navigate('/login');
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (newPatient.password !== newPatient.confirm_password) {
      alert('❌ كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    if (newPatient.password.length < 6) {
      alert('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    try {
      await axiosInstance.post('/doctor/add-patient/', {
        full_name: newPatient.full_name,
        email: newPatient.email,
        password: newPatient.password,
        national_id: newPatient.national_id,
        phone: newPatient.phone,
        blood_type: newPatient.blood_type,
        address: newPatient.address
      });
      alert('✅ تم إضافة المريض بنجاح');
      setShowAddPatient(false);
      setNewPatient({ full_name: '', email: '', password: '', confirm_password: '', national_id: '', phone: '', blood_type: '', address: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || '❌ فشل إضافة المريض');
    }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/doctor/add-record/', {
        patient_id: selectedPatient.id,
        ...newReport
      });
      alert('✅ تم إضافة التقرير بنجاح');
      setShowAddReport(false);
      setNewReport({ diagnosis: '', prescription: '', notes: '', visit_type: 'فحص دوري', patient_status: 'مستقر' });
      fetchData();
    } catch (error) {
      alert('❌ فشل إضافة التقرير');
    }
  };

  const handleCompleteAppointment = async (appId) => {
    if (window.confirm('هل أنت متأكد من إنهاء هذه المعاينة ونقلها إلى سجل المراجعات؟')) {
      try {
        await axiosInstance.post(`/appointments/complete/${appId}/`);
        alert('✅ تم إنهاء المعاينة بنجاح');
        fetchData();
      } catch (error) {
        alert('❌ فشل إنهاء المعاينة');
      }
    }
  };

  const handleAddSurgery = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/doctor/add-surgery/', newSurgery);
      alert('✅ تم جدولة العملية بنجاح');
      setShowAddSurgery(false);
      setNewSurgery({ patient: '', surgery_name: '', surgery_date: '', hospital: '', notes: '' });
      fetchData();
    } catch (error) {
      alert('❌ فشل جدولة العملية');
    }
  };

  const handleCompleteSurgery = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/doctor/complete-surgery/${selectedSurgery.id}/`, completionData);
      alert('✅ تم إنهاء العملية ونقلها للسجل الطبي');
      setShowCompleteSurgery(false);
      setSelectedSurgery(null);
      setCompletionData({ post_surgery_medications: '', doctor_side_effects: '', completion_date: new Date().toISOString().slice(0, 16) });
      fetchData();
    } catch (error) {
      alert('❌ فشل إنهاء العملية');
    }
  };

  const getRiskDot = (level) => {
    switch(level) {
      case 'منخفض': return 'dot-low';
      case 'متوسط': return 'dot-medium';
      case 'مرتفع': return 'dot-high';
      default: return '';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'مستقر': return 'badge-stable';
      case 'متابعة': return 'badge-followup';
      case 'حرجة': return 'badge-critical';
      default: return '';
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>جاري تحميل البيانات الذكية...</p>
    </div>
  );

  return (
    <div className="doctor-dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <span style={{fontSize: '2rem'}}>🏥</span>
          <h1>المنصة الصحية الوطنية</h1>
        </div>
        <div className="nav-user">
          <div className="doctor-info-header">
            <span className="welcome-text">السلام عليكم د. {profile?.first_name || 'طبيب'} {profile?.last_name || ''}</span>
            {profile?.profile?.specialization && (
              <span className="specialization-badge">{profile.profile.specialization}</span>
            )}
          </div>
          <button onClick={handleLogout} className="nav-logout-btn">تسجيل خروج</button>
        </div>
      </nav>

      <header className="dashboard-hero">
        <h2>لوحة التحكم الطبية</h2>
        <p>مرحباً بك مجدداً في نظام الرعاية الصحية المدعوم بالذكاء الاصطناعي</p>
      </header>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          👥 المرضى
        </button>
        <button 
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          📅 سجل المواعيد
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          📋 المراجعات
        </button>
        <button 
          className={`tab-btn ${activeTab === 'surgeries' ? 'active' : ''}`}
          onClick={() => setActiveTab('surgeries')}
        >
          🔪 العمليات الجراحية
        </button>
      </div>

      {activeTab === 'patients' ? (
        <>
          <section className="stats-container">
        <div className="glass-card">
          <span className="stat-icon">👥</span>
          <span className="stat-val">{patients.length}</span>
          <span className="stat-tit">إجمالي المرضى</span>
        </div>
        <div className="glass-card">
          <span className="stat-icon">🚨</span>
          <span className="stat-val">{patients.filter(p => p.status === 'حرجة').length}</span>
          <span className="stat-tit">حالات حرجة</span>
        </div>
        <div className="glass-card">
          <span className="stat-icon">⚠️</span>
          <span className="stat-val">{patients.filter(p => p.risk_level === 'مرتفع').length}</span>
          <span className="stat-tit">مخاطر عالية</span>
        </div>
        <div className="glass-card">
          <span className="stat-icon">✅</span>
          <span className="stat-val">{patients.filter(p => p.status === 'مستقر').length}</span>
          <span className="stat-tit">حالات مستقرة</span>
        </div>
      </section>

      <div className="actions-bar">
        <div className="search-wrapper">
          <input 
            type="text" 
            placeholder="🔍 ابحث عن مريض بالاسم أو الرقم الوطني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-add-patient" onClick={() => setShowAddPatient(true)}>
          <span>+</span> إضافة مريض جديد
        </button>
      </div>

      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>المريض</th>
              <th>الرقم الوطني</th>
              <th>الهاتف</th>
              <th>فصيلة الدم</th>
              <th>آخر زيارة</th>
              <th>الحالة</th>
              <th>الخطر</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map(patient => (
              <tr key={patient.id}>
                <td>
                  <div className="patient-name-cell">
                    <div className="avatar-initial">{patient.full_name?.charAt(0)}</div>
                    <strong>{patient.full_name}</strong>
                  </div>
                </td>
                <td>{patient.national_id}</td>
                <td>{patient.phone}</td>
                <td><span className="blood-badge">{patient.blood_type || 'N/A'}</span></td>
                <td>{patient.last_visit ? new Date(patient.last_visit).toLocaleDateString('ar') : '---'}</td>
                <td>
                  <span className={`status-badge ${getStatusBadge(patient.status || 'مستقر')}`}>
                    {patient.status || 'مستقر'}
                  </span>
                </td>
                <td>
                  <span className={`risk-dot ${getRiskDot(patient.risk_level)}`}></span>
                  {patient.risk_level || 'غير محدد'}
                </td>
                <td>
                  <div className="action-group">
                    <button className="btn-table-action btn-report" title="إضافة تقرير" onClick={() => { setSelectedPatient(patient); setShowAddReport(true); }}>
                      <span>📝</span> تقرير
                    </button>
                    <button className="btn-table-action btn-ai" title="تحليل AI" onClick={() => navigate(`/doctor/analyze/${patient.id}`)}>
                      <span>🤖</span> تحليل
                    </button>
                    <button className="btn-table-action btn-edit" title="تعديل" onClick={() => navigate(`/doctor/edit-patient/${patient.id}`)}>
                      <span>✏️</span> تعديل
                    </button>
                    <button className="btn-table-action btn-view" title="عرض" onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
                      <span>👁️</span> عرض
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      ) : activeTab === 'appointments' ? (
        <div className="appointments-tab">
          <div className="glass-card full-width">
            <h3>📅 سجل المواعيد المحجوزة</h3>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>المريض</th>
                    <th>التاريخ والوقت</th>
                    <th>السبب</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.filter(a => a.status === 'scheduled').length === 0 ? (
                    <tr><td colSpan="5" className="no-data">لا توجد مواعيد محجوزة حالياً</td></tr>
                  ) : (
                    appointments.filter(a => a.status === 'scheduled').map(app => (
                      <tr key={app.id}>
                        <td><strong>{app.patient_name}</strong></td>
                        <td>{new Date(app.appointment_date).toLocaleString('ar')}</td>
                        <td>{app.reason}</td>
                        <td>
                          <span className="status-badge badge-followup">مجدول</span>
                        </td>
                        <td>
                          <button 
                            className="btn-table-action" 
                            style={{backgroundColor: '#e74c3c', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', border: 'none'}}
                            onClick={() => handleCompleteAppointment(app.id)}
                          >
                            إنهاء المعاينة
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'surgeries' ? (
        <div className="appointments-tab">
          <div className="glass-card full-width">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
              <h3>🔪 سجل العمليات الجراحية</h3>
              <button className="btn-add-patient" onClick={() => setShowAddSurgery(true)}>
                <span>+</span> جدولة عملية جديدة
              </button>
            </div>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>المريض</th>
                    <th>اسم العملية</th>
                    <th>التاريخ</th>
                    <th>المشفى</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {surgeries.length === 0 ? (
                    <tr><td colSpan="6" className="no-data">لا توجد عمليات مسجلة حالياً</td></tr>
                  ) : (
                    surgeries.map(surgery => (
                      <tr key={surgery.id}>
                        <td><strong>{surgery.patient_name}</strong></td>
                        <td>{surgery.surgery_name}</td>
                        <td>{new Date(surgery.surgery_date).toLocaleString('ar')}</td>
                        <td>{surgery.hospital}</td>
                        <td>
                          <span className={`status-badge ${surgery.status === 'completed' ? 'badge-stable' : 'badge-followup'}`}>
                            {surgery.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                          </span>
                        </td>
                        <td>
                          {surgery.status === 'scheduled' && (
                            <button 
                              className="btn-table-action" 
                              style={{backgroundColor: '#27ae60', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', border: 'none'}}
                              onClick={() => { setSelectedSurgery(surgery); setShowCompleteSurgery(true); }}
                            >
                              إتمام العملية
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="appointments-tab">
          <div className="glass-card full-width">
            <h3>📋 سجل المراجعات (المواعيد المكتملة)</h3>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>المريض</th>
                    <th>تاريخ المراجعة</th>
                    <th>السبب</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.filter(a => a.status === 'completed').length === 0 ? (
                    <tr><td colSpan="4" className="no-data">لا توجد مراجعات سابقة</td></tr>
                  ) : (
                    appointments.filter(a => a.status === 'completed').map(app => (
                      <tr key={app.id}>
                        <td><strong>{app.patient_name}</strong></td>
                        <td>{new Date(app.appointment_date).toLocaleString('ar')}</td>
                        <td>{app.reason}</td>
                        <td>
                          <span className="status-badge badge-stable">مكتمل</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Patient */}
      {showAddPatient && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content">
            <h3 className="modal-title">➕ إضافة مريض جديد للنظام</h3>
            <form onSubmit={handleAddPatient} className="modal-form">
              <div className="form-field">
                <label>الاسم الكامل</label>
                <input type="text" placeholder="مثال: أحمد محمد علي" value={newPatient.full_name} onChange={(e) => setNewPatient({...newPatient, full_name: e.target.value})} required />
              </div>
              <div className="form-field">
                <label>البريد الإلكتروني</label>
                <input type="email" placeholder="example@email.com" value={newPatient.email} onChange={(e) => setNewPatient({...newPatient, email: e.target.value})} required />
              </div>
              <div className="input-row">
                <div className="form-field">
                  <label>كلمة المرور</label>
                  <input type="password" value={newPatient.password} onChange={(e) => setNewPatient({...newPatient, password: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>تأكيد كلمة المرور</label>
                  <input type="password" value={newPatient.confirm_password} onChange={(e) => setNewPatient({...newPatient, confirm_password: e.target.value})} required />
                </div>
              </div>
              <div className="input-row">
                <div className="form-field">
                  <label>الرقم الوطني</label>
                  <input type="text" value={newPatient.national_id} onChange={(e) => setNewPatient({...newPatient, national_id: e.target.value})} />
                </div>
                <div className="form-field">
                  <label>رقم الهاتف</label>
                  <input type="tel" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} />
                </div>
              </div>
              <div className="input-row">
                <div className="form-field">
                  <label>فصيلة الدم</label>
                  <select value={newPatient.blood_type} onChange={(e) => setNewPatient({...newPatient, blood_type: e.target.value})}>
                    <option value="">اختر الفصيلة</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>العنوان</label>
                  <input type="text" value={newPatient.address} onChange={(e) => setNewPatient({...newPatient, address: e.target.value})} />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">حفظ المريض</button>
                <button type="button" className="btn-cancel-modal" onClick={() => setShowAddPatient(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Report */}
      {showAddReport && selectedPatient && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content">
            <h3 className="modal-title">📋 تقرير طبي جديد: {selectedPatient.full_name}</h3>
            <form onSubmit={handleAddReport} className="modal-form">
              <div className="input-row">
                <div className="form-field">
                  <label>نوع الزيارة</label>
                  <select value={newReport.visit_type} onChange={(e) => setNewReport({...newReport, visit_type: e.target.value})}>
                    <option value="فحص دوري">فحص دوري</option>
                    <option value="استشارة">استشارة</option>
                    <option value="طارئ">طارئ</option>
                    <option value="متابعة">متابعة</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>حالة المريض</label>
                  <select value={newReport.patient_status} onChange={(e) => setNewReport({...newReport, patient_status: e.target.value})}>
                    <option value="مستقر">🟢 مستقر</option>
                    <option value="متابعة">🟡 متابعة</option>
                    <option value="حرجة">🔴 حرجة</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>التشخيص</label>
                <textarea rows="4" value={newReport.diagnosis} onChange={(e) => setNewReport({...newReport, diagnosis: e.target.value})} required />
              </div>
              <div className="form-field">
                <label>الوصفة الطبية</label>
                <textarea rows="3" value={newReport.prescription} onChange={(e) => setNewReport({...newReport, prescription: e.target.value})} />
              </div>
              <div className="form-field">
                <label>ملاحظات</label>
                <textarea rows="2" value={newReport.notes} onChange={(e) => setNewReport({...newReport, notes: e.target.value})} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">حفظ التقرير</button>
                <button type="button" className="btn-cancel-modal" onClick={() => setShowAddReport(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Surgery */}
      {showAddSurgery && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content">
            <h3 className="modal-title">🔪 جدولة عملية جراحية جديدة</h3>
            <form onSubmit={handleAddSurgery} className="modal-form">
              <div className="form-field">
                <label>المريض</label>
                <select value={newSurgery.patient} onChange={(e) => setNewSurgery({...newSurgery, patient: e.target.value})} required>
                  <option value="">اختر مريضاً</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>اسم العملية</label>
                <input type="text" placeholder="مثال: استئصال الزائدة" value={newSurgery.surgery_name} onChange={(e) => setNewSurgery({...newSurgery, surgery_name: e.target.value})} required />
              </div>
              <div className="input-row">
                <div className="form-field">
                  <label>تاريخ وموعد العملية</label>
                  <input type="datetime-local" value={newSurgery.surgery_date} onChange={(e) => setNewSurgery({...newSurgery, surgery_date: e.target.value})} required />
                </div>
                <div className="form-field">
                  <label>المشفى</label>
                  <input type="text" value={newSurgery.hospital} onChange={(e) => setNewSurgery({...newSurgery, hospital: e.target.value})} required />
                </div>
              </div>
              <div className="form-field">
                <label>ملاحظات أولية</label>
                <textarea rows="3" value={newSurgery.notes} onChange={(e) => setNewSurgery({...newSurgery, notes: e.target.value})} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">جدولة العملية</button>
                <button type="button" className="btn-cancel-modal" onClick={() => setShowAddSurgery(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Surgery */}
      {showCompleteSurgery && selectedSurgery && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content">
            <h3 className="modal-title">✅ إتمام العملية: {selectedSurgery.surgery_name}</h3>
            <p style={{marginBottom: '1rem', color: '#666'}}>المريض: {selectedSurgery.patient_name}</p>
            <form onSubmit={handleCompleteSurgery} className="modal-form">
              <div className="form-field">
                <label>الأدوية والمسكنات بعد العملية</label>
                <textarea rows="3" placeholder="أدخل قائمة الأدوية والجرعات..." value={completionData.post_surgery_medications} onChange={(e) => setCompletionData({...completionData, post_surgery_medications: e.target.value})} required />
              </div>
              <div className="form-field">
                <label>الأعراض الجانبية (تقرير الطبيب)</label>
                <textarea rows="3" placeholder="أي أعراض لوحظت بعد العملية مباشرة..." value={completionData.doctor_side_effects} onChange={(e) => setCompletionData({...completionData, doctor_side_effects: e.target.value})} />
              </div>
              <div className="form-field">
                <label>تاريخ الإتمام الفعلي</label>
                <input type="datetime-local" value={completionData.completion_date} onChange={(e) => setCompletionData({...completionData, completion_date: e.target.value})} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">تأكيد الإتمام</button>
                <button type="button" className="btn-cancel-modal" onClick={() => { setShowCompleteSurgery(false); setSelectedSurgery(null); }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Analysis Display */}
      {aiAnalysis && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-content ai-box">
            <div className="ai-header">🤖 تحليل الذكاء الاصطناعي</div>
            <div className={`status-badge ${aiAnalysis.risk_level === 'مرتفع' ? 'badge-critical' : 'badge-stable'}`}>
              مستوى الخطر: {aiAnalysis.risk_level}
            </div>
            <div style={{marginTop: '20px', lineHeight: '1.8'}}>
              {aiAnalysis.details?.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
            <button className="btn-cancel-modal" style={{marginTop: '20px'}} onClick={() => setAiAnalysis(null)}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;
