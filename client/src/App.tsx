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
      <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-[#07080e] p-6 text-white overflow-hidden font-sans">
        {/* Ambient background glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Brand Identity & Glowing Icon */}
        <div className="z-10 flex flex-col items-center gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-400 shadow-xl shadow-emerald-500/30 animate-lumina-glow">
            <span className="material-symbols-outlined text-[44px] text-white fill-1">
              all_inclusive
            </span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Lumina</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mt-1">MESSAGING REDEFINED</p>
          </div>
        </div>

        {/* Loading Indicator & Encryption Badge */}
        <div className="absolute bottom-12 w-full flex flex-col items-center gap-4">
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/30 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-emerald-500/30 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-xs tracking-wider uppercase font-semibold">
            <span className="material-symbols-outlined text-[16px] text-gray-400">lock</span>
            <span>End-to-End Encrypted</span>
          </div>
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
