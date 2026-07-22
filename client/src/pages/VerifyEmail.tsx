import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

export const VerifyEmail: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value !== '' && element.nextSibling) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);

      // Focus previous input
      if (e.currentTarget.previousSibling) {
        (e.currentTarget.previousSibling as HTMLInputElement).focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6).split('');
    
    if (pasteData.every((char) => !isNaN(Number(char)))) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (pasteData[i]) {
          newOtp[i] = pasteData[i];
        }
      }
      setOtp(newOtp);
      // Focus last filled or next empty
      const inputs = document.querySelectorAll('input[type="text"]');
      const targetIndex = Math.min(pasteData.length, 5);
      (inputs[targetIndex] as HTMLInputElement).focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setErrorMessage('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post('/auth/verify-email', {
        email,
        otp: code,
      });

      if (response.data.status === 'success') {
        setSuccessMessage('Email verified successfully! Loading chat...');
        const { accessToken, user } = response.data;
        setTimeout(() => {
          setAuth(user, accessToken);
          navigate('/');
        }, 1500);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Verification failed. Please check the OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await api.post('/auth/resend-otp', { email });
      setSuccessMessage(response.data.message || 'A new OTP has been sent to your email.');
      if (response.data.alreadyVerified) {
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to resend code. Please try again later.');
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
          <h2 className="text-2xl font-bold tracking-tight">Verify Your Email</h2>
          <p className="mt-2 text-sm text-gray-400">
            We sent a 6-digit OTP code to <br />
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-gray-800 bg-black/30 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-semibold tracking-wide text-white transition-all hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Verify Code'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Didn't receive the code?{' '}
          <button
            onClick={handleResend}
            className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline bg-transparent border-none cursor-pointer outline-none"
          >
            Resend OTP
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
