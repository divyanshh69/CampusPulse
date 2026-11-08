import React, { useState } from 'react';
import { UserRole } from '../types';
import { useClubStore } from '../hooks/useClubStore';
import { Button } from '../components/ui/Button';

const ROLE_PRESETS: { role: UserRole; email: string; name: string; desc: string }[] = [
  {
    role: 'Admin',
    email: 'elena.rostova@university.edu',
    name: 'Elena Rostova',
    desc: 'Full access to members, departments, events, attendance, and credits',
  },
  {
    role: 'Department Head',
    email: 'marcus.vance@university.edu',
    name: 'Marcus Vance',
    desc: 'Manage Technical & Engineering members, attendance, and tasks',
  },
  {
    role: 'Member',
    email: 'liam.oconnor@university.edu',
    name: 'Liam O’Connor',
    desc: 'View personal profile, attendance record, credits, and assigned tasks',
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useClubStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [email, setEmail] = useState('elena.rostova@university.edu');
  const [password, setPassword] = useState('campusPulse123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectPreset = (preset: typeof ROLE_PRESETS[number]) => {
    setSelectedRole(preset.role);
    setEmail(preset.email);
    setPassword('campusPulse123!');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your university email and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white font-mono">
            CP
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
            CampusPulse
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 font-display">
          Sign in to your club workspace
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          College Club Management Platform · Fall 2026 Semester
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700"
              >
                University Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="name@university.edu"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <span className="text-xs text-slate-500 font-mono">Secured</span>
              </div>
              <input
                id="login-password"
                type="password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter your password"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none disabled:opacity-60"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 border border-red-200 text-xs font-medium text-red-700"
              >
                ! {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In to Workspace'}
            </Button>
          </form>

          {/* Role Demo Presets */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="text-xs font-semibold text-slate-700">
              Select Demo Role Credential
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Populate seeded credentials for Admin, Department Head, or Member accounts.
            </p>
            <div className="mt-3 space-y-2">
              {ROLE_PRESETS.map((preset) => {
                const isSelected = selectedRole === preset.role;
                return (
                  <button
                    key={preset.role}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">
                        {preset.role} — {preset.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {isSelected ? 'Selected' : 'Use'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
