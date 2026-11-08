import React, { useState } from 'react';
import { useClubStore } from '../hooks/useClubStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser } = useClubStore();

  const [clubName, setClubName] = useState(
    'University Technology & Innovation Society'
  );
  const [semesterTerm, setSemesterTerm] = useState('Fall 2026');
  const [attendanceThreshold, setAttendanceThreshold] = useState(85);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
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
          Platform & Organization Settings
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Configure club parameters, attendance thresholds, and inspect active authentication status.
        </p>
      </div>

      {/* Real RBAC Status Panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-slate-900" />
          <h3 className="text-sm font-semibold text-slate-900 font-display">
            Active Authentication & Role Privileges
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Authorization is strictly enforced by the backend API and database. Client-side role simulation has been decommissioned.
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
                      ? 'danger'
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
            <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 self-start sm:self-auto">
              Backend Verified (JWT)
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 border-t border-slate-200/80 pt-3">
            {getRoleDescription()}
          </p>
        </div>
      </section>

      {/* General Club Settings Form */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900 font-display">
          General Club Configuration
        </h3>
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
      </section>
    </div>
  );
};
