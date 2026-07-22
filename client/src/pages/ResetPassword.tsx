import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const resetPasswordSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 characters').max(6, 'OTP must be 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPassword: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        otp: data.otp,
        newPassword: data.newPassword,
      });

      if (response.data.status === 'success') {
        setSuccessMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to reset password. Check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#07080e] px-4 py-12 overflow-hidden text-white font-sans">
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass w-full max-w-[440px] rounded-2xl p-8 md:p-10 shadow-2xl relative z-10"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Set New Password</h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter the 6-digit OTP code sent to <br />
            <span className="font-semibold text-indigo-400">{email}</span>
          </p>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* OTP Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="otp">
              Verification OTP Code
            </label>
            <div className="relative">
              <KeyRound className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="otp"
                type="text"
                placeholder="123456"
                className={`w-full rounded-xl border bg-black/30 py-3 pr-4 pl-12 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                  errors.otp ? 'border-red-500/50' : 'border-gray-800'
                }`}
                {...register('otp')}
              />
            </div>
            {errors.otp && <p className="text-xs text-red-400">{errors.otp.message}</p>}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="newPassword">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={`w-full rounded-xl border bg-black/30 py-3 pr-10 pl-12 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                  errors.newPassword ? 'border-red-500/50' : 'border-gray-800'
                }`}
                {...register('newPassword')}
              />
              <button
                type="button"
                className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-semibold tracking-wide text-white transition-all hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
