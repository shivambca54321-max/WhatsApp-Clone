import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric characters and underscores only'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/register', {
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      });

      if (response.data.status === 'success') {
        navigate('/verify-email', { state: { email: data.email } });
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Registration failed. Try again.');
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
        className="glass w-full max-w-[480px] rounded-2xl p-8 md:p-10 shadow-2xl relative z-10"
      >
        {/* Brand header */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/30">
            <span className="text-xl font-bold tracking-wider">V</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="mt-1 text-sm text-gray-400">Join Velo today and start chatting</p>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="fullName">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  className={`w-full rounded-xl border bg-black/30 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                    errors.fullName ? 'border-red-500/50' : 'border-gray-800'
                  }`}
                  {...register('fullName')}
                />
              </div>
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-gray-500 font-semibold">@</span>
                <input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  className={`w-full rounded-xl border bg-black/30 py-2.5 pr-4 pl-8 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                    errors.username ? 'border-red-500/50' : 'border-gray-800'
                  }`}
                  {...register('username')}
                />
              </div>
              {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                placeholder="john@example.com"
                className={`w-full rounded-xl border bg-black/30 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                  errors.email ? 'border-red-500/50' : 'border-gray-800'
                }`}
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="phone">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-xl border border-gray-800 bg-black/30 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
                {...register('phone')}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={`w-full rounded-xl border bg-black/30 py-2.5 pr-10 pl-10 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                  errors.password ? 'border-red-500/50' : 'border-gray-800'
                }`}
                {...register('password')}
              />
              <button
                type="button"
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-semibold tracking-wide text-white transition-all hover:opacity-95 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
