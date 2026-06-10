'use client';

import { BookOpen, ChartLine, ClipboardList, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { googleLogin } from '@/services/authService';

const heroSteps = [
  { label: 'Assessment', value: 'Technical Implementation Document' },
  { label: 'Tasks generated', value: '6' },
  { label: 'Pending responsibilities', value: '3' },
  { label: 'Team progress', value: '68%' },
];

const featureCards = [
  {
    title: 'SmartGroup Assistant',
    description: 'Generate structured tasks from an assignment brief.',
  },
  {
    title: 'Responsibilities',
    description: 'Members accept or request changes before work starts.',
  },
  {
    title: 'My Tasks',
    description: 'Students see tasks sorted by assessment and due date.',
  },
  {
    title: 'Team Progress',
    description: 'Track contribution and task completion fairly.',
  },
];

const howItWorks = [
  'Create your team',
  'Add group members',
  'Generate tasks with SmartGroup Assistant',
  'Assign and accept responsibilities',
  'Track progress until submission',
];

const screenshotCards = [
  'Dashboard',
  'SmartGroup Assistant',
  'My Tasks',
  'Responsibilities',
  'Team Progress',
];

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
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <header className="sticky top-0 z-20 rounded-b-[2rem] border border-slate-200 bg-white/95 px-4 py-4 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-black/10 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-teal-500 dark:text-slate-950">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 dark:text-slate-100">SmartGroup</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">AI-powered group work</p>
              </div>
            </div>

            <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
              <a href="#features" className="transition hover:text-slate-900 dark:hover:text-white">Features</a>
              <a href="#how-it-works" className="transition hover:text-slate-900 dark:hover:text-white">How it works</a>
              <a href="#demo" className="transition hover:text-slate-900 dark:hover:text-white">Demo</a>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="#sign-in"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Sign in
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="space-y-24 py-12">
          <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/20">
            <div className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="pointer-events-none absolute left-0 top-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div className="space-y-8">
                <div className="max-w-3xl space-y-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">Built for student teams</p>
                  <h1 className="text-5xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
                    Plan group work. Assign tasks. Track contribution fairly.
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                    SmartGroup uses AI to help student teams break down assignments, assign responsibilities, manage tasks, and improve accountability.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center" id="sign-in">
                  <div className="inline-flex rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400">
                    <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                  </div>
                  <a
                    href="#demo"
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Watch Demo
                  </a>
                </div>

                <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Continue with Google to access your group workspace and keep your course collaboration on track.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 p-6 shadow-lg shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <div className="absolute right-4 top-4 rounded-full bg-slate-950/10 p-2 text-slate-950 dark:bg-teal-500/15 dark:text-teal-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="mb-5 rounded-[1.75rem] bg-white p-5 shadow-sm dark:bg-slate-950">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">NIT3004 Capstone Team</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Technical Implementation Document</p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                      Project
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    {heroSteps.map((step) => (
                      <div key={step.label} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                        <span>{step.label}</span>
                        <span className="font-semibold text-slate-950 dark:text-white">{step.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">Mini task board</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.35em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Snapshot</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {['To Do', 'In Progress', 'Done'].map((status) => (
                      <div key={status} className="rounded-3xl bg-slate-100 p-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        {status}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-3xl bg-slate-100 p-3 dark:bg-slate-900">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Prepare methods section</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Due Fri</p>
                    </div>
                    <div className="rounded-3xl bg-slate-100 p-3 dark:bg-slate-900">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Review dataset plan</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">In progress</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="demo" className="space-y-8 px-2 sm:px-0">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">See SmartGroup in action</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Demo video placeholder</h2>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                We will add our project walkthrough video here.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-100 p-16 text-center shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
              {/* TODO: Replace this placeholder with YouTube embed iframe */}
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg shadow-slate-200/60 dark:bg-slate-950 dark:text-white dark:shadow-black/20">
                <Play className="h-10 w-10" />
              </div>
              <p className="mt-6 text-xl font-semibold text-slate-950 dark:text-white">Demo video coming soon</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                This area will show a project walkthrough that explains how SmartGroup helps student teams manage group work.
              </p>
            </div>
          </section>

          <section id="features" className="space-y-8 px-2 sm:px-0">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">Features</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Modern group work tools designed for student teams.</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featureCards.map((feature) => (
                <div key={feature.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{feature.title}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="how-it-works" className="space-y-8 px-2 sm:px-0">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">How it works</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">A simple process for group success.</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {howItWorks.map((step, index) => (
                <div key={step} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500 text-white">
                    <span className="text-sm font-semibold">{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">{step}</h3>
                </div>
              ))}
            </div>
          </section>

          <section id="screenshots" className="space-y-8 px-2 sm:px-0">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">Built around your group workflow</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Screenshots coming soon</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {screenshotCards.map((label) => (
                <div key={label} className="flex min-h-[160px] flex-col justify-between rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <div>
                    <div className="mb-4 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800" />
                    <p className="font-semibold text-slate-950 dark:text-white">{label}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">[Insert screenshot here]</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-slate-100 p-10 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-lg font-semibold text-slate-950 dark:text-white">Ready to make group work fairer?</p>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Sign in and start planning your next group assessment with SmartGroup.
                </p>
              </div>
              <div className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              </div>
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-8 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">SmartGroup</p>
                <p className="mt-1">AI-powered accountability for student teams.</p>
              </div>
              <p>Capstone Project</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
