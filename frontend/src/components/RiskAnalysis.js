import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import '../styles/App.css';

function RiskAnalysis() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState(null);
  const [vitalSigns, setVitalSigns] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  // إضافة متغيرات جديدة لتحليل النص
  const [textInput, setTextInput] = useState('');
  const [analysisType, setAnalysisType] = useState('vital'); // 'vital' or 'text'

  useEffect(() => {
    const fetchData = async () => {
      try {
        // جلب معلومات المريض
        const patientRes = await axiosInstance.get(`/patient/profile/${patientId}/`);
        setPatient(patientRes.data);
        
        // جلب العلامات الحيوية
        const vitalRes = await axiosInstance.get(`/patient/vital-signs/${patientId}/`);
        setVitalSigns(vitalRes.data);
      } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        setError('فشل في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [patientId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    
    try {
      let response;
      
      if (analysisType === 'text') {
        // تحليل النص الحر (الأعراض)
        if (!textInput.trim()) {
          setError('الرجاء إدخال النص المراد تحليله');
          setAnalyzing(false);
          return;
        }
        
        response = await axiosInstance.post('/analyze-text/', {
          patient_id: patientId,
          text: textInput
        });
      } else {
        // تحليل العلامات الحيوية
        if (vitalSigns.length === 0) {
          setError('لا توجد علامات حيوية كافية للتحليل');
          setAnalyzing(false);
          return;
        }
        
        response = await axiosInstance.post('/analyze-risk/', {
          patient_id: patientId
        });
      }
      
      setAnalysisResult(response.data);
      
    } catch (error) {
      console.error('خطأ في التحليل:', error);
      setError(error.response?.data?.error || 'حدث خطأ أثناء التحليل');
    } finally {
      setAnalyzing(false);
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
        <div className="risk-analysis-container">
          <h2>🤖 تحليل المخاطر باستخدام الذكاء الاصطناعي</h2>
          
          {patient && (
            <div className="patient-summary">
              <h3>{patient.first_name} {patient.last_name}</h3>
              <p>📧 {patient.email} | 📞 {patient.phone}</p>
            </div>
          )}
          
          {/* اختيار نوع التحليل */}
          <div className="analysis-type-selector">
            <label className={analysisType === 'vital' ? 'active' : ''}>
              <input
                type="radio"
                value="vital"
                checked={analysisType === 'vital'}
                onChange={() => setAnalysisType('vital')}
              />
              📊 تحليل العلامات الحيوية
            </label>
            <label className={analysisType === 'text' ? 'active' : ''}>
              <input
                type="radio"
                value="text"
                checked={analysisType === 'text'}
                onChange={() => setAnalysisType('text')}
              />
              📝 تحليل الأعراض والنص الطبي
            </label>
          </div>
          
          {/* عرض العلامات الحيوية */}
          {analysisType === 'vital' && (
            vitalSigns.length > 0 ? (
              <div className="vital-signs-section">
                <h3>📊 آخر العلامات الحيوية المسجلة</h3>
                <table className="vital-signs-table">
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
                    {vitalSigns.slice(0, 5).map(sign => (
                      <tr key={sign.id}>
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
              </div>
            ) : (
              <div className="warning">
                ⚠️ لا توجد علامات حيوية مسجلة لهذا المريض
              </div>
            )
          )}
          
          {/* حقل إدخال النص لتحليل الأعراض */}
          {analysisType === 'text' && (
            <div className="text-input-area">
              <label>📝 أدخل الأعراض أو النص الطبي:</label>
              <textarea
                rows="6"
                placeholder="مثال: 
- أعاني من صداع شديد منذ 3 أيام
- حرارة 39 درجة
- ألم في المعدة مع غثيان
- دوخة عند الوقوف"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <div className="text-hint">
                💡 يمكنك كتابة الأعراض بالتفصيل، أو وصف الحالة، أو أي نص طبي تريد تحليله
              </div>
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          {!analysisResult ? (
            <button 
              className="btn-analyze" 
              onClick={handleAnalyze} 
              disabled={analyzing || (analysisType === 'vital' && vitalSigns.length === 0)}
              style={{width: '100%', marginTop: '30px'}}
            >
              {analyzing ? '🔄 جاري التحليل...' : '🔍 بدء التحليل الذكي'}
            </button>
          ) : (
            <div className="analysis-result">
              <div className="result-header">
                <h3>📋 نتيجة التحليل</h3>
                <span className="analysis-date">
                  {new Date(analysisResult.analysis_date).toLocaleString('ar')}
                </span>
              </div>
              
              <div 
                className="risk-level-display" 
                style={{
                  backgroundColor: getRiskLevelColor(analysisResult.risk_level),
                }}
              >
                <span className="risk-icon">{getRiskLevelIcon(analysisResult.risk_level)}</span>
                <span className="risk-text">مستوى الخطر: {analysisResult.risk_level}</span>
                <span className="risk-score">(درجة {analysisResult.risk_score}/100)</span>
              </div>
              
              <div className="analysis-details-box">
                <h4>📊 تفاصيل التحليل</h4>
                <div className="details-content">
                  {analysisResult.details?.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
              
              {analysisResult.recommendations && (
                <div className="recommendations-box">
                  <h4>💡 التوصيات الطبية</h4>
                  <div className="recommendations-content">
                    {analysisResult.recommendations.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {analysisType === 'text' && analysisResult.original_text && (
                <div className="original-text-box">
                  <h4>📝 النص الذي تم تحليله:</h4>
                  <p className="original-text">{analysisResult.original_text}</p>
                </div>
              )}
              
              <div className="analysis-actions">
                <button className="btn-new-analysis" onClick={() => {
                  setAnalysisResult(null);
                  setTextInput('');
                }}>
                  🔄 تحليل جديد
                </button>
                <button className="btn-save" onClick={() => navigate(-1)}>
                  ✅ العودة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiskAnalysis;