import React, { useContext, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Admin from './pages/Admin';
import CEO from './pages/CEO';
import HOD from './pages/HOD';
import Employee from './pages/Employee';

function App() {
  const { user, loading } = useContext(AuthContext);

  // Log the loading state and user for debugging
  useEffect(() => {
    console.log('App.jsx: loading state:', loading);
    console.log('App.jsx: user state:', user);
  }, [loading, user]);

  if (loading) {
    return <div>Loading authentication state...</div>;
  }

  return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin/*"
          element={
            user && user.loginType === "Admin" ? (
              <Admin />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/ceo/*"
          element={
            user && user.loginType === "CEO" ? (
              <CEO />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/hod/*"
          element={
            user && user.loginType === "HOD" ? (
              <HOD />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/employee/*"
          element={
            user && user.loginType === "Employee" ? (
              <Employee />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
        {/* Fallback route for debugging */}
        <Route
          path="*"
          element={
            <div>
              404: Route not found. Please navigate to{" "}
              <a href="/login">Login</a>.
            </div>
          }
        />
      </Routes>
  );
}

export default App;
