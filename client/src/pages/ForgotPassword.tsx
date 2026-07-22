import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: data.email,
      });

      if (response.data.status === 'success') {
        // Redirect to Reset Password passing email
        navigate('/reset-password', { state: { email: data.email } });
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Something went wrong. Please try again.');
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
        <button
          onClick={() => navigate('/login')}
          className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Forgot Password</h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter your email and we'll send you an OTP code to reset your password.
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className={`w-full rounded-xl border bg-black/30 py-3 pr-4 pl-12 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 ${
                  errors.email ? 'border-red-500/50' : 'border-gray-800'
                }`}
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-semibold tracking-wide text-white transition-all hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Send OTP Code'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
