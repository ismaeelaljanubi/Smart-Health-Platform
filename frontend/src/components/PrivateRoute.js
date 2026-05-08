import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function PrivateRoute({ role }) {
  const token = localStorage.getItem('access_token');
  const userType = localStorage.getItem('user_type');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (role && userType !== role) {
    return <Navigate to={`/${userType}/dashboard`} />;
  }
  
  return <Outlet />;
}

export default PrivateRoute;