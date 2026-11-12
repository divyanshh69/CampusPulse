import React, { useState, useMemo } from 'react';
import { Award, Trophy } from 'lucide-react';
import { CreditTransaction } from '../types';
import { useClubStore } from '../hooks/useClubStore';
import { getLeaderboard } from '../utils/clubLogic';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const CreditsPage: React.FC = () => {
  const {
    members,
    credits,
    adjustMemberCredits,
    currentUser,
    setCurrentPage,
    setViewingMember,
  } = useClubStore();

  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.id || 'usr-1'
  );
  const [operation, setOperation] = useState<'award' | 'deduct'>('award');
  const [amount, setAmount] = useState<number>(20);
  const [category, setCategory] = useState<CreditTransaction['category']>(
    'Task Completion'
  );
  const [reason, setReason] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const leaderboard = useMemo(() => getLeaderboard(members), [members]);
  const canAdjustCredits =
    currentUser.role === 'Admin' || currentUser.role === 'Department Head';

  const myRankIndex = leaderboard.findIndex((m) => m.id === currentUser.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('Please enter a specific reason for this credit adjustment.');
      setFeedbackMessage('');
      return;
    }
    const cleanAmount = Math.abs(Number(amount)) || 0;
    if (cleanAmount <= 0) {
      setErrorMessage('Credit amount must be greater than 0.');
      setFeedbackMessage('');
      return;
    }

    const signedDelta = operation === 'award' ? cleanAmount : -cleanAmount;
    const effectiveCategory =
      operation === 'deduct' ? 'Penalty / Deduction' : category;

    setIsSubmitting(true);
    setErrorMessage('');
    setFeedbackMessage('');

    try {
      await adjustMemberCredits({
        memberId: selectedMemberId,
        delta: signedDelta,
        reason: reason.trim(),
        category: effectiveCategory,
      });

      const target = members.find((m) => m.id === selectedMemberId);
      setReason('');
      setFeedbackMessage(
        `${operation === 'award' ? 'Awarded' : 'Deducted'} ${cleanAmount} credits ${
          operation === 'award' ? 'to' : 'from'
        } ${target?.name || 'member'}.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to adjust credits.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 font-display">
          Club Credits & Merit System
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Track member contributions, view the semester leaderboard, and issue or deduct credits with an audited reason.
        </p>
      </div>

      {/* Main Split: Left 7 Cols Leaderboard + Right 5 Cols Credit Adjustment & Recent Ledger */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left 7 Cols: Member Leaderboard */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Member Leaderboard
              </h3>
              <p className="text-xs text-slate-500">
                Ranked by cumulative Fall 2026 merit credits
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {leaderboard.length} members ranked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 w-16">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Member Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Department
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                    Attendance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                    Total Credits
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {leaderboard.map((member, index) => {
                  const rank = index + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;
                  const isCurrentUser = member.id === currentUser.id;

                  return (
                    <tr
                      key={member.id}
                      className={`transition-colors ${
                        isCurrentUser
                          ? 'bg-amber-50/40 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono tabular-nums text-xs font-semibold">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs ring-1 ring-amber-300">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs ring-1 ring-slate-300">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-50 text-amber-900 font-bold text-xs ring-1 ring-amber-200">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            #{rank.toString().padStart(2, '0')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingMember(member);
                            setCurrentPage('profile');
                          }}
                          className="text-left font-semibold text-slate-900 hover:text-slate-700 underline underline-offset-2 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{member.name}</span>
                          {isCurrentUser && (
                            <span className="rounded-xs bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white font-sans no-underline">
                              You
                            </span>
                          )}
                        </button>
                        <div className="text-[11px] text-slate-500">
                          {member.role}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {member.department}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-slate-600">
                        {member.attendancePercentage}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-sm font-bold text-slate-900">
                        {member.totalCredits} cr
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right 5 Cols: Add/Deduct Credits Form OR Personal Standing + Recent Credit Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Issue / Deduct Credits Card (Admin / Dept Head) */}
          {canAdjustCredits ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Award or Deduct Member Credits
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Record merit points for event leadership, task completion, or unexcused absences.
              </p>

              <form
                onSubmit={handleAdjustCredits}
                className="mt-4 space-y-4"
                noValidate
              >
                {/* Operation Toggle */}
                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Adjustment Type
                  </span>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setOperation('award')}
                      className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        operation === 'award'
                          ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      + Award Credits
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperation('deduct')}
                      className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        operation === 'deduct'
                          ? 'bg-white text-rose-700 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      - Deduct Credits
                    </button>
                  </div>
                </div>

                {/* Target Member */}
                <div>
                  <label
                    htmlFor="credit-member-select"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Select Member
                  </label>
                  <select
                    id="credit-member-select"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.department} — {m.totalCredits} cr)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="credit-amount-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Credit Amount
                    </label>
                    <input
                      id="credit-amount-input"
                      type="number"
                      min={1}
                      max={200}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="credit-category-select"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Category
                    </label>
                    <select
                      id="credit-category-select"
                      value={
                        operation === 'deduct' ? 'Penalty / Deduction' : category
                      }
                      disabled={operation === 'deduct'}
                      onChange={(e) =>
                        setCategory(
                          e.target.value as CreditTransaction['category']
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-50"
                    >
                      <option value="Task Completion">Task Completion</option>
                      <option value="Event Attendance">Event Attendance</option>
                      <option value="Leadership Bonus">Leadership Bonus</option>
                      <option value="Peer Recognition">Peer Recognition</option>
                      <option value="Penalty / Deduction">
                        Penalty / Deduction
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="credit-reason-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Reason for Adjustment
                  </label>
                  <input
                    id="credit-reason-input"
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="e.g. Organized Technical workshop materials"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {errorMessage && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    ! {errorMessage}
                  </p>
                )}

                {feedbackMessage && (
                  <p role="status" className="text-xs font-medium text-emerald-700">
                    ✓ {feedbackMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  variant={operation === 'award' ? 'primary' : 'danger'}
                  size="md"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting
                    ? 'Processing Adjustment...'
                    : operation === 'award'
                    ? `Award +${amount} Credits`
                    : `Deduct -${amount} Credits`}
                </Button>
              </form>
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 font-display">
                    Your Semester Standing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Leaderboard Rank #{myRank || '-'} of {leaderboard.length}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Your Credits</span>
                  <div className="text-lg font-bold text-slate-900 font-mono">
                    {currentUser.totalCredits} cr
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Attendance</span>
                  <div className="text-lg font-bold text-slate-900 font-mono">
                    {currentUser.attendancePercentage}%
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                Credits are awarded by Department Heads and Club Admins for delivering assigned tasks, attending events, and leading initiatives.
              </p>
            </section>
          )}

          {/* Recent Credit Activity Log */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                Recent Credit Activity
              </h3>
              <p className="text-xs text-slate-500">
                Chronological ledger of points awarded and deducted
              </p>
            </div>

            <ul className="divide-y divide-slate-200/80 max-h-96 overflow-y-auto">
              {credits.map((tx) => {
                const isPositive = tx.delta >= 0;
                return (
                  <li key={tx.id} className="px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {tx.memberName}
                      </span>
                      <Badge
                        tone={isPositive ? 'success' : 'danger'}
                        className="font-mono tabular-nums"
                      >
                        {isPositive ? `+${tx.delta} cr` : `${tx.delta} cr`}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-700">{tx.reason}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{tx.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>By {tx.issuedBy}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{tx.timestamp}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
