import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
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
        // Unverified email redirect to verification page
        navigate('/verify-email', { state: { email: data.email } });
      } else {
        setErrorMessage(error.response?.data?.message || 'Invalid email or password.');
      }
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
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/30">
            <span className="text-xl font-bold tracking-wider">V</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white font-sans">Welcome Back</h2>
          <p className="mt-1 text-sm text-gray-400">Login to your account to connect</p>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              'Sign In'
            )}
          </button>
        </form>

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
