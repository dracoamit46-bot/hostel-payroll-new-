import React, { useEffect, useState } from 'react';
import { PayrollRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPayrollRecordsByUser, getSalaryAdvances } from '../services/dataService';
import {
  FileText,
  IndianRupee,
  Calendar,
  CreditCard,
  Printer,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  X,
} from 'lucide-react';

export default function StaffPayslips() {
  const { currentUser } = useAuth();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    async function loadPayslips() {
      if (!currentUser?.id) return;
      try {
        setLoading(true);
        const data = await getPayrollRecordsByUser(currentUser.id);
        setRecords(data);
      } catch (err) {
        console.error('Failed to load payslips for staff', err);
      } finally {
        setLoading(false);
      }
    }
    loadPayslips();
  }, [currentUser?.id]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading your payslip history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-400" />
          My Monthly Payslips &amp; Salary History
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          View transparent breakdowns of your monthly earnings, attendance metrics, late penalties, and disbursements.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-2">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="font-bold text-white text-base">No Payslips Generated Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Once management runs the monthly payroll cycle for your property, your detailed digital payslips will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((rec) => {
            const isPaid = rec.paymentStatus === 'paid';
            const isLocked = rec.status === 'locked' || rec.status === 'paid';

            return (
              <div
                key={rec.id}
                id={`payslip-card-${rec.payrollMonth}`}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-base font-mono">
                        {rec.payrollMonth}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isPaid
                          ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                          : isLocked
                          ? 'bg-blue-950/80 border-blue-800 text-blue-300'
                          : 'bg-amber-950/80 border-amber-800 text-amber-300'
                      }`}
                    >
                      {isPaid ? 'PAID ✓' : isLocked ? 'FINALIZED' : 'PROCESSING'}
                    </span>
                  </div>

                  {/* Net Payout Highlights */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Net Take-Home</p>
                      <p className="text-xl font-black font-mono text-emerald-300">
                        ₹{rec.netSalary.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <p>Base: ₹{rec.monthlySalary.toLocaleString('en-IN')}</p>
                      <p className="text-emerald-400 font-medium">{rec.payableDays} payable days</p>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
                      <p className="text-slate-500 text-[10px]">Present</p>
                      <p className="font-bold text-white">{rec.presentDays}d</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
                      <p className="text-slate-500 text-[10px]">Week-Offs</p>
                      <p className="font-bold text-white">{rec.weekOffs}d</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/50 border border-slate-800/60">
                      <p className="text-slate-500 text-[10px]">Total LOP</p>
                      <p className={`font-bold ${rec.totalLopDays > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {rec.totalLopDays}d
                      </p>
                    </div>
                  </div>

                  {/* Deductions alert if any */}
                  {(rec.latePenaltyDeduction > 0 || rec.advanceRecovery > 0) && (
                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                      {rec.latePenaltyDeduction > 0 && (
                        <div className="flex justify-between text-amber-400/90">
                          <span>Late arrivals deduction:</span>
                          <span className="font-mono">-₹{rec.latePenaltyDeduction}</span>
                        </div>
                      )}
                      {rec.advanceRecovery > 0 && (
                        <div className="flex justify-between text-indigo-400/90">
                          <span>Salary advance recovered:</span>
                          <span className="font-mono">-₹{rec.advanceRecovery}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {rec.paymentDate ? `Paid on ${rec.paymentDate}` : 'Scheduled for payment'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPayslip(rec)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                  >
                    <span>View Payslip</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payslip Modal View */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Monthly Salary Payslip</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payslip body */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">HostelOps Compensation</h4>
                  <p className="text-slate-400 text-[11px]">Pay Period: {selectedPayslip.payrollMonth}</p>
                </div>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold uppercase">
                  {selectedPayslip.paymentStatus === 'paid' ? 'PAID' : selectedPayslip.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Employee: </span>
                  <strong className="text-white">{currentUser?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Department: </span>
                  <span>{currentUser?.staffType || 'General'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Base Salary: </span>
                  <span className="font-mono text-slate-200">₹{selectedPayslip.monthlySalary.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500">Daily Divisor: </span>
                  <span className="font-mono text-slate-200">₹{selectedPayslip.dailyRate.toFixed(2)} ({selectedPayslip.calendarDays}d)</span>
                </div>
              </div>

              {/* Attendance Matrix */}
              <div className="bg-slate-900/80 rounded-lg p-3 space-y-1">
                <p className="font-bold text-slate-200 text-[11px] uppercase tracking-wider mb-2">
                  Attendance &amp; Leave Metrics
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div>Present: <span className="text-white font-bold">{selectedPayslip.presentDays}d</span></div>
                  <div>Half Days: <span className="text-amber-400 font-bold">{selectedPayslip.halfDays}d</span></div>
                  <div>Week-Offs: <span className="text-white font-bold">{selectedPayslip.weekOffs}d</span></div>
                  <div>Paid Leaves: <span className="text-indigo-400 font-bold">{selectedPayslip.paidLeaves}d</span></div>
                  <div>Absent: <span className="text-rose-400 font-bold">{selectedPayslip.absentDays}d</span></div>
                  <div>Total LOP: <span className="text-rose-400 font-bold">{selectedPayslip.totalLopDays}d</span></div>
                </div>
              </div>

              {/* Earnings vs Deductions */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <p className="font-bold text-emerald-400 text-xs border-b border-slate-800 pb-1">Earnings</p>
                  <div className="flex justify-between text-slate-300">
                    <span>Base Salary:</span>
                    <span className="font-mono">₹{selectedPayslip.grossSalary.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedPayslip.otherAdditions > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Additions/Bonus:</span>
                      <span className="font-mono">+₹{selectedPayslip.otherAdditions}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-rose-400 text-xs border-b border-slate-800 pb-1">Deductions</p>
                  {selectedPayslip.lopDeduction > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>LOP ({selectedPayslip.totalLopDays}d):</span>
                      <span className="font-mono">-₹{selectedPayslip.lopDeduction}</span>
                    </div>
                  )}
                  {selectedPayslip.latePenaltyDeduction > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Late Penalty:</span>
                      <span className="font-mono">-₹{selectedPayslip.latePenaltyDeduction}</span>
                    </div>
                  )}
                  {selectedPayslip.advanceRecovery > 0 && (
                    <div className="flex justify-between text-indigo-400">
                      <span>Advance Recovery:</span>
                      <span className="font-mono">-₹{selectedPayslip.advanceRecovery}</span>
                    </div>
                  )}
                  {selectedPayslip.otherDeductions > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Adjustments:</span>
                      <span className="font-mono">-₹{selectedPayslip.otherDeductions}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Net Total */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Net Disbursable Salary</p>
                  <p className="text-xl font-black font-mono text-emerald-300">
                    ₹{selectedPayslip.netSalary.toLocaleString('en-IN')}
                  </p>
                </div>
                {selectedPayslip.paymentDate && (
                  <div className="text-right text-[11px] text-slate-400">
                    <p>Paid on: {selectedPayslip.paymentDate}</p>
                    <p className="capitalize">Mode: {selectedPayslip.paymentMode}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
