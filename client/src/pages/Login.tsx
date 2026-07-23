import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, Sparkles, Key } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // OTP Login specific state
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [activeOtp, setActiveOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmitPasswordLogin = async (data: LoginFormValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      if (response.data.status === 'success') {
        const { accessToken, user } = response.data;
        setAuth(user, accessToken);
        navigate('/');
      }
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.status === 'unverified') {
        // Unverified email redirect to verification page with initialOtp if returned
        navigate('/verify-email', { 
          state: { 
            email: data.email, 
            initialOtp: error.response?.data?.otp 
          } 
        });
      } else {
        setErrorMessage(error.response?.data?.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail || !otpEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await api.post('/auth/send-login-otp', { email: otpEmail });
      if (response.data.status === 'success') {
        setOtpSent(true);
        setActiveOtp(response.data.otp || '');
        setSuccessMessage('A 6-digit OTP code has been sent to your email.');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to send OTP code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/verify-email', {
        email: otpEmail,
        otp: otpInput.trim(),
      });

      if (response.data.status === 'success') {
        setSuccessMessage('OTP verified successfully! Logging you in...');
        const { accessToken, user } = response.data;
        setTimeout(() => {
          setAuth(user, accessToken);
          navigate('/');
        }, 1200);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#07080e] px-4 py-12 overflow-hidden text-white font-sans">
      {/* Decorative Blur Blobs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="glass w-full max-w-[440px] rounded-2xl p-8 md:p-10 shadow-2xl relative z-10"
      >
        {/* Logo / Brand header */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/30">
            <span className="text-xl font-bold tracking-wider">V</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white font-sans">Welcome Back</h2>
          <p className="mt-1 text-sm text-gray-400">Login to your account to connect</p>
        </div>

        {/* Method Toggle Tabs */}
        <div className="mb-6 flex rounded-xl bg-black/40 p-1 border border-gray-800">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('password');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              loginMethod === 'password'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('otp');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              loginMethod === 'otp'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            OTP Login
          </button>
        </div>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {loginMethod === 'password' ? (
          /* Password Login Form */
          <form onSubmit={handleSubmit(onSubmitPasswordLogin)} className="space-y-5">
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`w-full rounded-xl border bg-black/30 py-3 pr-4 pl-12 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                    errors.email ? 'border-red-500/50' : 'border-gray-800'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-black/30 py-3 pr-12 pl-12 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                    errors.password ? 'border-red-500/50' : 'border-gray-800'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {/* Remember me */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-800 bg-black/30 text-indigo-600 focus:ring-indigo-500/30"
                {...register('rememberMe')}
              />
              <label htmlFor="rememberMe" className="ml-2.5 text-sm text-gray-400">
                Remember me on this device
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-semibold tracking-wide text-white transition-all hover:opacity-95 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Sign In with Password'
              )}
            </button>
          </form>
        ) : (
          /* OTP Login Form */
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendLoginOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="otpEmail">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="otpEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-800 bg-black/30 py-3 pr-4 pl-12 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-semibold tracking-wide text-white transition-all hover:opacity-95 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Send Login OTP Code'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyLoginOtp} className="space-y-5">
                {activeOtp && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-3.5 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="h-5 w-5 text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-xs text-indigo-300 font-medium">Your Login OTP:</p>
                        <p className="font-mono text-lg font-bold tracking-widest text-indigo-200">{activeOtp}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpInput(activeOtp)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow cursor-pointer"
                    >
                      Fill OTP
                    </button>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="otpInput">
                    Enter 6-Digit OTP
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="otpInput"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full rounded-xl border border-gray-800 bg-black/30 py-3 pr-4 pl-12 text-sm text-white font-mono font-bold tracking-widest placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpInput('');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    onClick={handleSendLoginOtp}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer"
                  >
                    Resend OTP Code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-semibold tracking-wide text-white transition-all hover:opacity-95 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;

