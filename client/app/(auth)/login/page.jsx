'use client';

import { Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { googleLogin } from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      console.error('Google login failed: missing credential response', credentialResponse);
      alert('Google login failed: no credential returned.');
      return;
    }

    try {
      await googleLogin(credential);
      router.push('/dashboard');
    } catch (error) {
      const serverMessage = error?.response?.data?.error || error?.message || 'Google login failed. Please try again.';
      console.error('Google login failed:', error?.response || error);
      alert(serverMessage);
    }
  };

  const handleGoogleError = () => {
    alert('Google login failed.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:px-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0f172a] p-10 text-white shadow-2xl lg:p-16">
          <div className="flex items-center gap-3 rounded-3xl bg-white/10 px-4 py-3 shadow-sm shadow-slate-950/20 backdrop-blur-xl">
            <img
              src="/smartgroup-logo.svg"
              alt="SmartGroup logo"
              className="h-11 w-11 rounded-2xl bg-white/10 p-1"
            />
            <span className="text-base font-semibold">SmartGroup</span>
          </div>

          <div className="mt-12 max-w-lg">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              An AI Project Coordinator for Student Teams
            </h1>
            <p className="mt-5 text-sm leading-7 text-blue-100 sm:text-base">
              AI-powered accountability for student teams.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {['AI Task Generation', 'Task Management', 'Contribution Tracking'].map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-3xl bg-white/10 px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-white">{feature}</span>
              </div>
            ))}
          </div>

          <p className="mt-10 text-xs text-slate-300/80">
            Built for capstone teams, semester projects, and accountability-first collaboration.
          </p>

          <div className="pointer-events-none absolute -right-16 top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-teal-500/30 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] bg-white p-10 shadow-2xl shadow-slate-200/40 lg:p-12">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Welcome back
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Sign in to continue managing your group projects
            </h2>
          </div>

          <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500">
            Requires a verified university <span className="font-semibold text-slate-950">@gmail.com</span> account for authentication.
          </div>
        </div>
      </div>
    </div>
  );
}
