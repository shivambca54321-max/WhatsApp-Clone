import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import api from './services/api';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';

// Routes Wrappers
import ProtectedRoute from './components/ProtectedRoute';
import AuthRoute from './components/AuthRoute';
import { SocketProvider } from './context/SocketContext';

export const App: React.FC = () => {
  const { setAuth, clearAuth, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        setLoading(true);
        // Request token refresh on load to see if cookies are active
        const refreshResponse = await api.post('/auth/refresh');
        if (refreshResponse.data.status === 'success') {
          const { accessToken } = refreshResponse.data;
          
          // Now fetch user details
          const meResponse = await api.get('/auth/me', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (meResponse.data.status === 'success') {
            const { user } = meResponse.data;
            setAuth(user, accessToken);
          } else {
            clearAuth();
          }
        } else {
          clearAuth();
        }
      } catch (error) {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    checkCurrentUser();
  }, [setAuth, clearAuth, setLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#090a0f] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide text-indigo-400 font-sans">Loading Velo...</p>
        </div>
      </div>
    );
  }

  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <AuthRoute>
              <VerifyEmail />
            </AuthRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthRoute>
              <ForgotPassword />
            </AuthRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AuthRoute>
              <ResetPassword />
            </AuthRoute>
          }
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </SocketProvider>
  );
};

export default App;
