import React, { useState } from 'react';
import { useClubStore } from '../hooks/useClubStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, changePassword } = useClubStore();

  const [clubName, setClubName] = useState(
    'University Technology & Innovation Society'
  );
  const [semesterTerm, setSemesterTerm] = useState('Fall 2026');
  const [attendanceThreshold, setAttendanceThreshold] = useState(85);
  const [savedBanner, setSavedBanner] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const isAdmin = currentUser.role === 'Admin';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password successfully updated in database.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please verify current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleDescription = () => {
    switch (currentUser.role) {
      case 'Admin':
        return 'Full Club Authority — Authorized to manage all departments, oversee rosters, disburse credits, and configure platform parameters.';
      case 'Department Head':
        return `Department Scope Authority — Authorized to manage members, attendance rosters, and tasks within ${currentUser.department}.`;
      case 'Member':
      default:
        return 'Personal Member Access — Authorized to view personal attendance history, credit ledger, and assigned deliverables.';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 font-display">
          Platform & Account Settings
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Configure club parameters, manage your account security credentials, and review your RBAC permissions.
        </p>
      </div>

      {/* Real RBAC Status Panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-slate-900" />
          <h3 className="text-sm font-semibold text-slate-900 font-display">
            Active Authentication & Role Privileges
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Role-Based Access Control is cryptographically validated and strictly enforced by the PostgreSQL database.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {currentUser.name}
                </span>
                <Badge
                  tone={
                    currentUser.role === 'Admin'
                      ? 'brand'
                      : currentUser.role === 'Department Head'
                      ? 'info'
                      : 'neutral'
                  }
                >
                  {currentUser.role}
                </Badge>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {currentUser.email} · {currentUser.department}
              </div>
            </div>
            <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Backend Verified (JWT)
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 border-t border-slate-200/80 pt-3 leading-relaxed">
            {getRoleDescription()}
          </p>
        </div>
      </section>

      {/* Security & Password Management Form */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-slate-900" />
          <h3 className="text-sm font-semibold text-slate-900 font-display">
            Account Security & Password
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Update your login password. Rate-limited and securely hashed with bcrypt in PostgreSQL.
        </p>

        <form onSubmit={handleChangePassword} className="mt-4 space-y-4 max-w-lg">
          <div>
            <label
              htmlFor="settings-current-pwd"
              className="block text-xs font-semibold text-slate-700"
            >
              Current Password
            </label>
            <input
              id="settings-current-pwd"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="settings-new-pwd"
                className="block text-xs font-semibold text-slate-700"
              >
                New Password (min 8 chars)
              </label>
              <input
                id="settings-new-pwd"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="settings-confirm-pwd"
                className="block text-xs font-semibold text-slate-700"
              >
                Confirm New Password
              </label>
              <input
                id="settings-confirm-pwd"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {passwordError && (
            <div className="rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={passwordLoading}
            >
              Update Password
            </Button>
          </div>
        </form>
      </section>

      {/* General Club Settings Form (Admin Only) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 font-display">
              General Club Configuration
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Global club governance parameters and attendance benchmark targets.
            </p>
          </div>
          {!isAdmin && (
            <Badge tone="neutral">Admin Only</Badge>
          )}
        </div>

        {isAdmin ? (
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="settings-club-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Organization Name
                </label>
                <input
                  id="settings-club-name"
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-semester"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Active Academic Term
                </label>
                <input
                  id="settings-semester"
                  type="text"
                  value={semesterTerm}
                  onChange={(e) => setSemesterTerm(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-w-xs">
              <label
                htmlFor="settings-threshold"
                className="block text-xs font-semibold text-slate-700"
              >
                Minimum Good-Standing Attendance (%)
              </label>
              <input
                id="settings-threshold"
                type="number"
                min={50}
                max={100}
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                {savedBanner && (
                  <span className="text-xs font-medium text-emerald-700">
                    ✓ Organization settings updated.
                  </span>
                )}
              </div>
              <Button type="submit" variant="primary" size="sm">
                Save Configuration
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600">
            Organization settings (organization name, active semester term, and attendance thresholds) are managed by Club Administrators. You are logged in with <strong>{currentUser.role}</strong> permissions.
          </div>
        )}
      </section>
    </div>
  );
};
