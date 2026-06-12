'use client';

import { Bolt, ChartLine, Play, Sparkles, Users } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { googleLogin } from '@/services/authService';

const productCards = [
  {
    title: 'SmartGroup Assistant',
    description: 'Generate task plans from assignment briefs.',
  },
  {
    title: 'Group Management',
    description: 'Create groups and invite members.',
  },
  {
    title: 'Responsibilities',
    description: 'Accept or request changes before tasks begin.',
  },
  {
    title: 'My Tasks',
    description: 'View personal tasks sorted by assessment and urgency.',
  },
  {
    title: 'Team Progress',
    description: 'Track completion and contribution.',
  },
  {
    title: 'Alerts',
    description: 'Keep members updated on assigned responsibilities.',
  },
];

const explanationCards = [
  {
    title: 'Plan',
    description: 'Turn assignment requirements into structured tasks.',
    icon: Bolt,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-200',
  },
  {
    title: 'Assign',
    description: 'Allocate responsibilities clearly to group members.',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200',
  },
  {
    title: 'Track',
    description: 'Monitor task progress and team contribution.',
    icon: ChartLine,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const hasGoogleClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', message: '' });
  const [isDemoSubmitted, setIsDemoSubmitted] = useState(false);

  const openDemoPopup = () => setIsDemoOpen(true);
  const closeDemoPopup = () => {
    setIsDemoOpen(false);
    setIsDemoSubmitted(false);
  };

  const handleDemoChange = (field) => (event) => {
    setDemoForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleDemoSubmit = (event) => {
    event.preventDefault();
    setIsDemoSubmitted(true);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      console.error('Google login failed: missing credential response', credentialResponse);
      alert(
        'Google login failed: no credential returned. Check Vercel NEXT_PUBLIC_GOOGLE_CLIENT_ID and Google Authorized JavaScript origins for this domain.'
      );
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

  const handleGoogleError = (error) => {
    console.error('Google login failed:', error);
    alert('Google login failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <header className="sticky top-0 z-30 rounded-b-[2rem] border border-slate-200 bg-white/95 px-4 py-4 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-black/10 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/10">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold tracking-[0.3em] text-slate-950 dark:text-white">SmartGroup</p>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 lg:flex">
              <a href="#product" className="transition hover:text-slate-900 dark:hover:text-white">Product</a>
              <a href="#features" className="transition hover:text-slate-900 dark:hover:text-white">Features</a>
              <a href="#about" className="transition hover:text-slate-900 dark:hover:text-white">About Us</a>
              <a href="#contact" className="transition hover:text-slate-900 dark:hover:text-white">Contact Us</a>
            </nav>

            <div className="flex items-center gap-3">
              {hasGoogleClientId ? (
                <div className="overflow-hidden rounded-full">
                  <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
                </div>
              ) : (
                <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                  Google sign-in unavailable
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="space-y-24 py-12">
          <div className="fixed bottom-6 right-6 z-40 hidden max-w-sm rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100 md:block">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-3xl bg-indigo-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-indigo-600 dark:text-indigo-400">Demo Available</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  Ready to see SmartGroup in action? Request a tailored walkthrough with one click.
                </p>
                <Button variant="indigo" size="sm" className="mt-4" onClick={openDemoPopup}>
                  Request a Demo
                </Button>
              </div>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 px-6 py-16 shadow-2xl shadow-slate-200/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-black/20 sm:px-10 lg:px-12">
            <div className="pointer-events-none absolute -right-24 top-10 hidden h-72 w-72 rounded-full bg-teal-300/30 blur-3xl md:block" />
            <div className="pointer-events-none absolute left-0 top-28 hidden h-56 w-56 rounded-full bg-amber-200/40 blur-3xl md:block" />
            <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-2xl space-y-8">
                <Badge variant="blue" className="uppercase tracking-[0.32em] text-xs font-semibold text-slate-950 dark:text-white">
                  Built for student teams
                </Badge>
                <div className="space-y-6">
                  <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-6xl">
                    Make student group work fair, clear, and accountable.
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                    SmartGroup helps student teams plan assignments, assign responsibilities, track progress, and improve collaboration using AI-supported workflows.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="indigo" size="lg" className="rounded-full" onClick={openDemoPopup}>
                    Book a Demo
                  </Button>
                  <a href="#product" className="inline-flex rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                    Learn More
                  </a>
                </div>
              </div>

              <div className="relative mx-auto flex h-[420px] w-full max-w-[420px] items-center justify-center rounded-[2rem] bg-gradient-to-br from-white to-slate-100 p-8 shadow-2xl shadow-slate-200/30 dark:from-slate-900 dark:to-slate-950 dark:shadow-black/20">
                <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(251,113,133,0.18),_transparent_30%)]" />
                <div className="relative grid gap-5">
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                    <div className="mb-4 flex items-center gap-3 text-slate-900 dark:text-white">
                      <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-teal-500 text-white">
                        <Bolt className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">AI-supported planning</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Turn assignment briefs into clear task plans without manual guesswork.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">Teamwork</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">Keep everyone aligned with shared responsibilities and updates.</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">Accountability</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">Capture decisions, roles, and progress in one easy workflow.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="product" className="space-y-10 px-2 sm:px-0">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">What is SmartGroup?</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">SmartGroup is an AI-supported collaboration tool designed for university group assessments.</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                It helps students turn assignment briefs into clear task plans, assign responsibilities, manage progress, and keep evidence of contribution.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {explanationCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.title} className="p-6">
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{card.description}</p>
                  </Card>
                );
              })}
            </div>
          </section>

          <section id="features" className="space-y-10 px-2 sm:px-0">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-indigo-600 dark:text-indigo-400">Features built for fair group work</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Everything teams need for accountable collaboration.</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {productCards.map((feature) => (
                <Card key={feature.title} className="p-6">
                  <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{feature.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section id="demo" className="space-y-8 px-2 sm:px-0">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">See SmartGroup in action</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Demo video coming soon</h2>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-14 text-center shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
              {/* TODO: Replace this placeholder with YouTube embed iframe */}
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/20">
                <Play className="h-10 w-10" />
              </div>
              <p className="mt-6 text-xl font-semibold text-slate-950 dark:text-white">Demo video coming soon</p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                We will add our walkthrough video here to explain how SmartGroup helps student teams manage group work.
              </p>
            </div>
          </section>

          <section id="about" className="space-y-8 px-2 sm:px-0">
            <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
              <div className="space-y-6">
                <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">About Us</p>
                <h2 className="text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">
                  Our mission is to help every student team collaborate with confidence.
                </h2>
                <p className="max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                  SmartGroup started with a simple belief: group work should not be the hardest part of a course. We build tools that create clarity around tasks, roles, and progress so teams can focus on doing their best work together.
                </p>
                <p className="max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                  Our commitment to innovation means we keep evolving SmartGroup to support real classroom workflows, reduce friction, and make accountability feel fair instead of overwhelming.
                </p>
                <p className="max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                  We partner with students and educators by delivering a modern collaboration experience that is easy to adopt, grounded in practical use cases, and focused on stronger team outcomes.
                </p>
              </div>

              <div className="space-y-6 rounded-[2rem] bg-slate-100 p-10 shadow-lg shadow-slate-200/40 dark:bg-slate-900 dark:shadow-black/20">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 dark:text-white">Our promise to you</p>
                <div className="space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
                  <p><span className="font-semibold text-slate-950 dark:text-white">Mission-driven design.</span> We deliver tools that help teams stay aligned, accountable, and productive.</p>
                  <p><span className="font-semibold text-slate-950 dark:text-white">Continuous innovation.</span> We listen to users and evolve SmartGroup with features that solve real challenges.</p>
                  <p><span className="font-semibold text-slate-950 dark:text-white">Client-focused support.</span> We are committed to supporting your team with reliable guidance and responsive help.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="contact" className="space-y-8 px-2 sm:px-0">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">Contact Us</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">Want to learn more or request a demo?</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Reach out to learn how SmartGroup can help your student teams plan, assign, and track group work with more clarity.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Email</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">smartgroup.notify@gmail.com</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Book a Demo</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">Request a personalized walkthrough to see how SmartGroup fits your group workflow.</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Support</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">We offer friendly guidance and practical support for onboarding and group project success.</p>
              </Card>
            </div>
          </section>

          <section className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-indigo-900 to-teal-700 px-8 py-12 text-white shadow-2xl shadow-slate-900/30">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Ready to make group work fairer?</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">Use SmartGroup to plan, assign, and track student group work with more clarity.</h2>
              </div>
              <div className="flex items-center justify-start lg:justify-end">
                <Button variant="warning" className="rounded-full" onClick={openDemoPopup}>
                  Book a Demo
                </Button>
              </div>
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-8 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">SmartGroup</p>
                <p className="mt-1">AI-powered group work made fair and simple.</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-slate-950 dark:text-white">Contact</p>
                <a href="mailto:smartgroup.notify@gmail.com" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  smartgroup.notify@gmail.com
                </a>
              </div>
            </div>
          </footer>

          <Modal isOpen={isDemoOpen} onClose={closeDemoPopup} title={isDemoSubmitted ? 'Demo request sent' : 'Book a Demo'}>
            {isDemoSubmitted ? (
              <div className="space-y-5">
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Thanks for your request! We will follow up at <span className="font-semibold text-slate-900 dark:text-white">{demoForm.email}</span> shortly.
                </p>
                <Button variant="indigo" className="w-full" onClick={closeDemoPopup}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-5">
                <div>
                  <label htmlFor="demo-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your name</label>
                  <input
                    id="demo-name"
                    type="text"
                    value={demoForm.name}
                    onChange={handleDemoChange('name')}
                    placeholder="Example: Aisha"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="demo-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    id="demo-email"
                    type="email"
                    value={demoForm.email}
                    onChange={handleDemoChange('email')}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="demo-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                  <textarea
                    id="demo-message"
                    value={demoForm.message}
                    onChange={handleDemoChange('message')}
                    placeholder="Tell us what you'd like to see in the demo."
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    required
                  />
                </div>
                <Button type="submit" variant="indigo" className="w-full">
                  Send request
                </Button>
              </form>
            )}
          </Modal>
        </main>
      </div>
    </div>
  );
}
