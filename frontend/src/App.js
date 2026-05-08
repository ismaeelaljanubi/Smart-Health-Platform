import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AddMedicalRecord from './components/AddMedicalRecord';
import RiskAnalysis from './components/RiskAnalysis';
import PrivateRoute from './components/PrivateRoute';
import EditPatientProfile from './components/EditPatientProfile';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App" style={{minHeight: '100vh', display: 'block'}}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/patient" element={<PrivateRoute role="patient" />}>
            <Route path="dashboard" element={<PatientDashboard />} />
          </Route>
          <Route path="/patient/:patientId" element={<PatientDashboard />} /> 
          <Route path="/doctor" element={<PrivateRoute role="doctor" />}>
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="patients/:patientId" element={<PatientDashboard />} />
            <Route path="add-record/:patientId" element={<AddMedicalRecord />} />
            <Route path="analyze/:patientId" element={<RiskAnalysis />} />
            <Route path="edit-patient/:patientId" element={<EditPatientProfile />} />
          </Route>
          
          <Route path="/admin" element={<PrivateRoute role="admin" />}>
            <Route path="dashboard" element={<AdminDashboard />} />
          </Route>
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;