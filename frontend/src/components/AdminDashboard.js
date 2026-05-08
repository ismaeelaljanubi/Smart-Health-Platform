import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_patients: 0,
    total_doctors: 0,
    total_admins: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    user_type: 'patient',
    national_id: '',
    blood_type: '',
    specialization: '',
    license_number: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const profileRes = await axiosInstance.get('/login/profile/');
      setProfile(profileRes.data);
      
      const statsRes = await axiosInstance.get('/admin/stats/');
      setStats(statsRes.data);
      
      const usersRes = await axiosInstance.get('/admin/users/');
      setUsers(usersRes.data);
      
      // ✅ إضافة البيانات المنظمة (Structured Data) للإحصائيات والمستخدمين
      if (statsRes.data) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Dataset",
          "name": "إحصائيات منصة الصحة الوطنية الذكية",
          "description": "بيانات إحصائية عن عدد المستخدمين والسجلات الطبية في المنصة",
          "variableMeasured": [
            {
              "@type": "PropertyValue",
              "name": "total_users",
              "value": statsRes.data.total_users,
              "unitText": "مستخدم"
            },
            {
              "@type": "PropertyValue",
              "name": "total_patients",
              "value": statsRes.data.total_patients,
              "unitText": "مريض"
            },
            {
              "@type": "PropertyValue",
              "name": "total_doctors",
              "value": statsRes.data.total_doctors,
              "unitText": "طبيب"
            },
            {
              "@type": "PropertyValue",
              "name": "total_admins",
              "value": statsRes.data.total_admins,
              "unitText": "مشرف"
            }
          ]
        });
        
        // إزالة أي سكريبت قديم لتجنب التكرار
        const oldScript = document.getElementById('structured-data-stats');
        if (oldScript) oldScript.remove();
        script.id = 'structured-data-stats';
        document.head.appendChild(script);
      }
      
      // ✅ إضافة البيانات المنظمة لقائمة المستخدمين
      if (usersRes.data && usersRes.data.length > 0) {
        const usersScript = document.createElement('script');
        usersScript.type = 'application/ld+json';
        usersScript.text = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "قائمة مستخدمي المنصة",
          "description": "جميع المستخدمين المسجلين في منصة الصحة الوطنية الذكية",
          "numberOfItems": usersRes.data.length,
          "itemListElement": usersRes.data.map((user, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
              "@type": "Person",
              "name": `${user.first_name || ''} ${user.last_name || ''}`.trim(),
              "email": user.email,
              "telephone": user.phone,
              "memberOf": {
                "@type": "Organization",
                "name": "منصة الصحة الوطنية الذكية"
              }
            }
          }))
        });
        
        const oldUsersScript = document.getElementById('structured-data-users');
        if (oldUsersScript) oldUsersScript.remove();
        usersScript.id = 'structured-data-users';
        document.head.appendChild(usersScript);
      }


    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      // Fallback data for UI testing
      setStats({
        total_users: 150,
        total_patients: 100,
        total_doctors: 45,
        total_admins: 5
      });
      setUsers([
        { id: 1, first_name: 'أحمد', last_name: 'محمد', email: 'ahmed@test.com', user_type: 'patient', phone: '0912345678', is_active: true, date_joined: new Date().toISOString() },
        { id: 2, first_name: 'سارة', last_name: 'أحمد', email: 'sara@test.com', user_type: 'doctor', phone: '0923456789', is_active: true, date_joined: new Date().toISOString() },
        { id: 3, first_name: 'محمد', last_name: 'علي', email: 'mohammed@test.com', user_type: 'admin', phone: '0934567890', is_active: true, date_joined: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_type');
    navigate('/login');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newUser.password !== newUser.confirm_password) {
      alert('❌ كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    try {
      await axiosInstance.post('/admin/users/add/', {
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        user_type: newUser.user_type,
        national_id: newUser.national_id,
        blood_type: newUser.blood_type,
        specialization: newUser.specialization,
        license_number: newUser.license_number
      });
      alert('✅ تم إضافة المستخدم بنجاح');
      setShowAddUser(false);
      fetchData();
      setNewUser({
        first_name: '', last_name: '', email: '', password: '', confirm_password: '',
        phone: '', user_type: 'patient', national_id: '', blood_type: '',
        specialization: '', license_number: ''
      });
    } catch (error) {
      console.error('خطأ:', error);
      alert('❌ فشل إضافة المستخدم');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      await axiosInstance.post(`/admin/users/toggle/${userId}/`);
      fetchData();
    } catch (error) {
      console.error('خطأ في تغيير حالة المستخدم:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await axiosInstance.delete(`/admin/users/delete/${userId}/`);
        fetchData();
      } catch (error) {
        console.error('خطأ في حذف المستخدم:', error);
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserTypeText = (type) => {
    const types = { 'patient': 'مريض', 'doctor': 'طبيب', 'admin': 'مشرف' };
    return types[type] || type;
  };

  if (loading) return (
    <div className="loader-container">
      <div className="loader"></div>
      <p>جاري تحميل البيانات الذكية...</p>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-brand">
          <i className="fas fa-shield-heart fa-2x"></i>
          <h1>منصة الصحة الوطنية الذكية</h1>
        </div>
        <div className="admin-user-info">
          <span><i className="fas fa-user-tie"></i> السلام عليكم، مشرف {profile?.first_name}</span>
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i> تسجيل الخروج
          </button>
        </div>
      </header>
      
      <main className="admin-container">
        <section className="welcome-banner">
          <h2><i className="fas fa-chart-line"></i> لوحة تحكم الإدارة العليا</h2>
          <p>أهلاً بك في مركز التحكم. هنا يمكنك إدارة جميع جوانب المنصة ومراقبة أدائها.</p>
        </section>
        
        {/* Statistics Grid */}
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon icon-users">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-info">
              <span className="stat-val">{stats.total_users}</span>
              <span className="stat-name">إجمالي المستخدمين</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon icon-patients">
              <i className="fas fa-user-injured"></i>
            </div>
            <div className="stat-info">
              <span className="stat-val">{stats.total_patients}</span>
              <span className="stat-name">المرضى المسجلين</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon icon-doctors">
              <i className="fas fa-user-md"></i>
            </div>
            <div className="stat-info">
              <span className="stat-val">{stats.total_doctors}</span>
              <span className="stat-name">الطاقم الطبي</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon icon-admins">
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="stat-info">
              <span className="stat-val">{stats.total_admins}</span>
              <span className="stat-name">المشرفين</span>
            </div>
          </div>
        </div>
        
        {/* User Management Section */}
        <div className="management-header">
          <h3><i className="fas fa-users-cog"></i> إدارة حسابات المستخدمين</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="search-wrapper">
              <i className="fas fa-search"></i>
              <input 
                type="text" 
                placeholder="بحث بالاسم أو البريد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="add-user-btn" onClick={() => setShowAddUser(true)}>
              <i className="fas fa-user-plus"></i> إضافة مستخدم جديد
            </button>
          </div>
        </div>
        
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم الكامل</th>
                <th>البريد الإلكتروني</th>
                <th>التصنيف</th>
                <th>رقم الهاتف</th>
                <th>الحالة</th>
                <th>تاريخ الانضمام</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: '500' }}>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge-${user.user_type}`}>
                      {getUserTypeText(user.user_type)}
                    </span>
                  </td>
                  <td>{user.phone || 'غير متوفر'}</td>
                  <td>
                    <span className={`status-indicator ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                      <i className={`fas fa-${user.is_active ? 'check-circle' : 'times-circle'}`}></i>
                      {user.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td>{user.date_joined ? new Date(user.date_joined).toLocaleDateString('ar-SY') : '—'}</td>
                  <td>
                    <div className="action-btns">
                      <button 
                        className="action-btn btn-toggle"
                        onClick={() => handleToggleUser(user.id)}
                        title={user.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      >
                        <i className={`fas fa-user-${user.is_active ? 'slash' : 'check'}`}></i>
                      </button>
                      <button 
                        className="action-btn btn-delete"
                        onClick={() => handleDeleteUser(user.id)}
                        title="حذف المستخدم"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <i className="fas fa-search fa-3x" style={{ marginBottom: '15px', opacity: 0.3 }}></i>
              <p>لم يتم العثور على أي مستخدمين يطابقون بحثك.</p>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <div className="admin-modal-overlay">
            <div className="admin-modal">
              <div className="modal-header">
                <h3><i className="fas fa-user-plus"></i> إضافة حساب جديد</h3>
                <button className="close-modal" onClick={() => setShowAddUser(false)}>&times;</button>
              </div>
              <form onSubmit={handleAddUser} className="admin-form">
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>الاسم الأول</label>
                      <input
                        type="text"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                        required
                        placeholder="مثال: أحمد"
                      />
                    </div>
                    <div className="form-group">
                      <label>الاسم الأخير</label>
                      <input
                        type="text"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                        required
                        placeholder="مثال: علي"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      required
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>كلمة المرور</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>تأكيد كلمة المرور</label>
                      <input
                        type="password"
                        value={newUser.confirm_password}
                        onChange={(e) => setNewUser({...newUser, confirm_password: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>رقم الهاتف</label>
                      <input
                        type="tel"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                        placeholder="09xxxxxxxx"
                      />
                    </div>
                    <div className="form-group">
                      <label>نوع الحساب</label>
                      <select
                        value={newUser.user_type}
                        onChange={(e) => setNewUser({...newUser, user_type: e.target.value})}
                      >
                        <option value="patient">مريض</option>
                        <option value="doctor">طبيب</option>
                        <option value="admin">مشرف</option>
                      </select>
                    </div>
                  </div>
                  
                  {newUser.user_type === 'patient' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>الرقم الوطني</label>
                        <input
                          type="text"
                          value={newUser.national_id}
                          onChange={(e) => setNewUser({...newUser, national_id: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>فصيلة الدم</label>
                        <input
                          type="text"
                          value={newUser.blood_type}
                          onChange={(e) => setNewUser({...newUser, blood_type: e.target.value})}
                          placeholder="مثال: A+"
                        />
                      </div>
                    </div>
                  )}
                  
                  {newUser.user_type === 'doctor' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>التخصص الطبي</label>
                        <input
                          type="text"
                          value={newUser.specialization}
                          onChange={(e) => setNewUser({...newUser, specialization: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>رقم الترخيص</label>
                        <input
                          type="text"
                          value={newUser.license_number}
                          onChange={(e) => setNewUser({...newUser, license_number: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn-close" onClick={() => setShowAddUser(false)}>إلغاء</button>
                  <button type="submit" className="btn-submit">تأكيد الإضافة</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;