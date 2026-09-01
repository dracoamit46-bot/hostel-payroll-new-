import React, { useEffect, useState, useMemo } from 'react';
import {
  Property,
  User,
  PayrollRecord,
  PayrollStatus,
  SalaryAdvance,
  PayrollPaymentMode,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getProperties,
  getPropertyById,
  getUsersByProperty,
  getPayrollRecords,
  generateMonthlyPayroll,
  updatePayrollStatus,
  lockPayroll,
  recordPayrollPayment,
  addPayrollAdjustment,
  deletePayrollAdjustment,
  getSalaryAdvances,
  createSalaryAdvance,
} from '../services/dataService';
import {
  Calculator,
  Calendar,
  IndianRupee,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Building2,
  Users,
  TrendingDown,
  TrendingUp,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  Printer,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  AlertTriangle,
  Receipt,
  X,
} from 'lucide-react';

export default function PayrollManagement() {
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';
  const isManager = currentUser?.role === 'manager';

  // Properties & Selection
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);

  // Month & Year Selector (Default: Current Month YYYY-MM)
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Payroll Records State
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal States
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<PayrollRecord | null>(null);
  const [paymentModalRecord, setPaymentModalRecord] = useState<PayrollRecord | null>(null);
  const [advanceModalOpen, setAdvanceModalOpen] = useState<boolean>(false);
  const [adjustmentModalRecord, setAdjustmentModalRecord] = useState<PayrollRecord | null>(null);

  // Payout Form State
  const [paymentMode, setPaymentMode] = useState<PayrollPaymentMode>('upi');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [recordingPayment, setRecordingPayment] = useState<boolean>(false);

  // New Advance Form State
  const [advanceUserId, setAdvanceUserId] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceDate, setAdvanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [advanceReason, setAdvanceReason] = useState<string>('');
  const [submittingAdvance, setSubmittingAdvance] = useState<boolean>(false);

  // Adjustment Form State
  const [adjType, setAdjType] = useState<'addition' | 'deduction'>('addition');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState<boolean>(false);

  // Feedback Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initial Load: Properties
  useEffect(() => {
    async function initProperties() {
      try {
        setLoading(true);
        if (isOwner) {
          const props = await getProperties();
          setProperties(props);
          if (props.length > 0) {
            setSelectedPropertyId((prev) => (prev ? prev : props[0].id));
          }
        } else if (isManager) {
          let propId = currentUser?.propertyId;
          if (!propId) {
            const props = await getProperties();
            setProperties(props);
            if (props.length > 0) propId = props[0].id;
          }
          if (propId) {
            setSelectedPropertyId(propId);
            const prop = await getPropertyById(propId);
            setCurrentProperty(prop);
          }
        }
      } catch (err) {
        console.error('Failed to load properties for payroll', err);
      } finally {
        setLoading(false);
      }
    }
    initProperties();
  }, [isOwner, isManager, currentUser?.propertyId]);

  // 2. Fetch Payroll Records & Staff for selected property + month
  const loadPayrollData = async (propId: string, month: string) => {
    if (!propId) return;
    try {
      setLoading(true);
      const [fetchedRecords, propUsers, fetchedAdvances] = await Promise.all([
        getPayrollRecords(propId, month),
        getUsersByProperty(propId),
        getSalaryAdvances(),
      ]);

      const activeStaff = propUsers.filter((u) => u.isActive !== false);
      setStaffList(activeStaff);
      setRecords(fetchedRecords);
      setAdvances(fetchedAdvances);

      const prop = await getPropertyById(propId);
      setCurrentProperty(prop);
    } catch (err) {
      console.error('Failed to load payroll records', err);
      setErrorMessage('Could not load payroll data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPropertyId && selectedMonth) {
      loadPayrollData(selectedPropertyId, selectedMonth);
    }
  }, [selectedPropertyId, selectedMonth]);

  // Active Property Name
  const activePropertyName = useMemo(() => {
    if (currentProperty) return currentProperty.name;
    const match = properties.find((p) => p.id === selectedPropertyId);
    return match ? match.name : 'Unknown Property';
  }, [currentProperty, properties, selectedPropertyId]);

  // Aggregate Metrics Summary
  const payrollSummary = useMemo(() => {
    const totalGross = records.reduce((sum, r) => sum + (r.grossSalary || 0), 0);
    const totalNet = records.reduce((sum, r) => sum + (r.netSalary || 0), 0);
    const totalLopDeductions = records.reduce((sum, r) => sum + (r.lopDeduction || 0), 0);
    const totalLatePenalties = records.reduce((sum, r) => sum + (r.latePenaltyDeduction || 0), 0);
    const totalAdvanceRecoveries = records.reduce((sum, r) => sum + (r.advanceRecovery || 0), 0);
    const totalPaid = records.reduce((sum, r) => sum + (r.paidAmount || (r.paymentStatus === 'paid' ? r.netSalary : 0)), 0);

    const countLocked = records.filter((r) => r.status === 'locked' || r.status === 'paid').length;
    const countDraft = records.filter((r) => r.status === 'draft' || r.status === 'calculated').length;
    const countApproved = records.filter((r) => r.status === 'approved').length;

    return {
      totalGross,
      totalNet,
      totalLopDeductions,
      totalLatePenalties,
      totalAdvanceRecoveries,
      totalPaid,
      countLocked,
      countDraft,
      countApproved,
      totalEmployees: staffList.length,
      calculatedCount: records.length,
    };
  }, [records, staffList]);

  // Generate / Recalculate Payroll
  const handleGeneratePayroll = async () => {
    if (!selectedPropertyId) return;
    setGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const generated = await generateMonthlyPayroll(
        selectedPropertyId,
        selectedMonth,
        currentUser?.id || 'system'
      );
      setRecords(generated);
      setSuccessMessage(
        `Successfully generated and calculated payroll for ${generated.length} employees for ${selectedMonth}.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      console.error('Failed to generate payroll', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  };

  // Status Lifecycle Update (Approve / Lock)
  const handleStatusChange = async (recordId: string, newStatus: PayrollStatus) => {
    setActionLoadingId(recordId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (newStatus === 'locked') {
        await lockPayroll(recordId, currentUser?.id || 'system');
      } else {
        await updatePayrollStatus(recordId, newStatus, currentUser?.id || 'system');
      }
      setSuccessMessage(`Payroll record updated to ${newStatus.toUpperCase()}.`);
      await loadPayrollData(selectedPropertyId, selectedMonth);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Status change error', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update record status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Record Payout Modal
  const handleOpenPaymentModal = (record: PayrollRecord) => {
    setPaymentModalRecord(record);
    setPaymentMode('upi');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setTransactionRef('');
    setPaymentAmount(String(record.netSalary));
    setPaymentNotes('');
  };

  // Submit Payout
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalRecord) return;
    const parsedAmount = parseFloat(paymentAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid payout amount.');
      return;
    }

    setRecordingPayment(true);
    try {
      await recordPayrollPayment(paymentModalRecord.id, {
        paymentMode,
        paymentDate,
        transactionRef,
        paidAmount: parsedAmount,
        notes: paymentNotes,
        paidBy: currentUser?.id || 'system',
      });

      setSuccessMessage(
        `Disbursement of ₹${parsedAmount.toLocaleString('en-IN')} recorded successfully for ${paymentModalRecord.employeeName || 'staff'}.`
      );
      setPaymentModalRecord(null);
      await loadPayrollData(selectedPropertyId, selectedMonth);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      console.error('Failed to record payment', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record payment disbursement.');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Submit New Advance
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(advanceAmount);
    if (!advanceUserId) {
      setErrorMessage('Please select an employee for the advance.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid advance amount.');
      return;
    }
    if (!advanceReason.trim()) {
      setErrorMessage('Please provide a reason for the advance.');
      return;
    }

    setSubmittingAdvance(true);
    try {
      await createSalaryAdvance({
        userId: advanceUserId,
        amount: parsedAmount,
        date: advanceDate,
        reason: advanceReason.trim(),
        createdBy: currentUser?.id,
      });

      setSuccessMessage(
        `Salary advance of ₹${parsedAmount.toLocaleString('en-IN')} recorded successfully.`
      );
      setAdvanceModalOpen(false);
      setAdvanceUserId('');
      setAdvanceAmount('');
      setAdvanceReason('');
      await loadPayrollData(selectedPropertyId, selectedMonth);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      console.error('Failed to create salary advance', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to disburse salary advance.');
    } finally {
      setSubmittingAdvance(false);
    }
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentModalRecord) return;
    const parsedAmount = parseFloat(adjAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid adjustment amount.');
      return;
    }
    if (!adjReason.trim()) {
      setErrorMessage('Please provide a reason for this adjustment.');
      return;
    }

    setSubmittingAdjustment(true);
    try {
      await addPayrollAdjustment(adjustmentModalRecord.id, {
        type: adjType,
        amount: parsedAmount,
        reason: adjReason.trim(),
        createdBy: currentUser?.id,
      });

      setSuccessMessage(
        `${adjType === 'addition' ? 'Bonus/Addition' : 'Deduction'} of ₹${parsedAmount.toLocaleString('en-IN')} applied.`
      );
      setAdjustmentModalRecord(null);
      setAdjAmount('');
      setAdjReason('');
      await loadPayrollData(selectedPropertyId, selectedMonth);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to add adjustment', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to apply adjustment.');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Delete Adjustment
  const handleDeleteAdjustment = async (adjustmentId: string) => {
    try {
      await deletePayrollAdjustment(adjustmentId);
      setSuccessMessage('Adjustment removed.');
      await loadPayrollData(selectedPropertyId, selectedMonth);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to remove adjustment', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete adjustment.');
    }
  };

  if (loading && records.length === 0 && !selectedPropertyId) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading payroll engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Monthly Payroll &amp; Compensation Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automated attendance-based calculations, tiered late deductions, salary advance recoveries, and locked cycles.
          </p>
        </div>

        {/* Scoping Controls: Property & Month */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Property Selector for Owner */}
          {isOwner && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 p-1.5 rounded-xl">
              <Building2 className="w-4 h-4 text-purple-400 ml-2 shrink-0" />
              <label htmlFor="payroll-prop-select" className="sr-only">Property</label>
              <select
                id="payroll-prop-select"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-100 pr-3 py-1 outline-none cursor-pointer"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 p-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-emerald-400 ml-2 shrink-0" />
            <label htmlFor="payroll-month-select" className="sr-only">Payroll Month</label>
            <input
              id="payroll-month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-100 pr-2 py-1 outline-none cursor-pointer"
            />
          </div>

          {/* New Advance Button */}
          <button
            id="btn-disburse-advance"
            type="button"
            onClick={() => setAdvanceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Disburse Advance</span>
          </button>

          {/* One-Click Generate / Recalculate Button */}
          <button
            id="btn-generate-payroll"
            type="button"
            disabled={generating}
            onClick={handleGeneratePayroll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Calculating...' : records.length > 0 ? 'Recalculate Cycle' : 'Generate Payroll'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Gross */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <p className="text-[11px] font-medium text-slate-400">Total Gross Salary</p>
          <p className="text-base sm:text-lg font-black font-mono text-white">
            ₹{payrollSummary.totalGross.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500">{payrollSummary.totalEmployees} Active Staff</p>
        </div>

        {/* Total Net Payable */}
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 space-y-1">
          <p className="text-[11px] font-medium text-emerald-300">Net Payable</p>
          <p className="text-base sm:text-lg font-black font-mono text-emerald-300">
            ₹{payrollSummary.totalNet.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-emerald-400/70">After all deductions</p>
        </div>

        {/* LOP Deductions */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <p className="text-[11px] font-medium text-rose-400">LOP Deductions</p>
          <p className="text-base sm:text-lg font-black font-mono text-rose-300">
            -₹{payrollSummary.totalLopDeductions.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500">Unpaid / Absent days</p>
        </div>

        {/* Late Deductions */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <p className="text-[11px] font-medium text-amber-400">Late Deductions</p>
          <p className="text-base sm:text-lg font-black font-mono text-amber-300">
            -₹{payrollSummary.totalLatePenalties.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500">Tiered late penalties</p>
        </div>

        {/* Advance Recoveries */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <p className="text-[11px] font-medium text-indigo-400">Advance Recoveries</p>
          <p className="text-base sm:text-lg font-black font-mono text-indigo-300">
            ₹{payrollSummary.totalAdvanceRecoveries.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500">Settled this cycle</p>
        </div>

        {/* Disbursement Status */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <p className="text-[11px] font-medium text-sky-400">Disbursed Amount</p>
          <p className="text-base sm:text-lg font-black font-mono text-sky-300">
            ₹{payrollSummary.totalPaid.toLocaleString('en-IN')}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <span className="text-emerald-400">{payrollSummary.countLocked} Locked</span>
            <span>•</span>
            <span className="text-amber-400">{payrollSummary.countDraft} Draft</span>
          </div>
        </div>
      </div>

      {/* Main Payroll Records Grid / Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              Payroll Register — {selectedMonth}
            </h3>
            <span className="text-xs text-slate-400 font-normal">
              ({activePropertyName})
            </span>
          </div>

          <div className="text-xs text-slate-400">
            Dynamic Calendar Divisor: <span className="font-mono text-slate-200 font-bold">{records[0]?.calendarDays || 30} days</span>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="p-10 text-center rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
            <Calculator className="w-10 h-10 text-slate-600 mx-auto" />
            <div>
              <p className="font-medium text-slate-200 text-sm">No Payroll Records Generated for {selectedMonth}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Click &quot;Generate Payroll&quot; above to automatically process attendance records, calculate LOP deductions, evaluate tiered late penalties, and offset active salary advances.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generate Cycle Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-2">Base / Daily Rate</th>
                  <th className="py-3 px-2">Days Summary</th>
                  <th className="py-3 px-2">Attendance Deductions</th>
                  <th className="py-3 px-2">Advance &amp; Adjustments</th>
                  <th className="py-3 px-2 text-right">Net Payable</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {records.map((rec) => {
                  const isLocked = rec.status === 'locked' || rec.status === 'paid';
                  const isPaid = rec.paymentStatus === 'paid';
                  const isLoadingThis = actionLoadingId === rec.id;

                  return (
                    <tr
                      key={rec.id}
                      id={`payroll-row-${rec.userId}`}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Employee Name & Role */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white text-sm">
                          {rec.employeeName || 'Staff Member'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{rec.employeeRole}</span>
                          {rec.employeeStaffType && (
                            <>
                              <span>•</span>
                              <span>{rec.employeeStaffType}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Base Salary & Daily Rate */}
                      <td className="py-3.5 px-2 font-mono">
                        <div className="font-bold text-slate-100 text-sm">
                          ₹{rec.monthlySalary.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ₹{rec.dailyRate.toFixed(2)}/day ({rec.calendarDays}d)
                        </div>
                      </td>

                      {/* Days Summary Breakdown */}
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="text-emerald-400 font-mono font-bold">
                            {rec.payableDays}d
                          </span>
                          <span className="text-slate-500">payable</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-2 mt-0.5 font-mono">
                          <span title="Present">{rec.presentDays}P</span>
                          {rec.halfDays > 0 && <span title="Half Days" className="text-amber-400">{rec.halfDays}HD</span>}
                          <span title="Week-offs">{rec.weekOffs}WO</span>
                          {rec.paidLeaves > 0 && <span title="Paid Leaves" className="text-indigo-400">{rec.paidLeaves}PL</span>}
                          {rec.totalLopDays > 0 && (
                            <span title="Loss of Pay Days" className="text-rose-400 font-bold">
                              {rec.totalLopDays} LOP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Deductions: LOP + Late */}
                      <td className="py-3.5 px-2 font-mono">
                        {rec.lopDeduction > 0 && (
                          <div className="text-rose-400 font-medium">
                            -₹{rec.lopDeduction.toLocaleString('en-IN')} (LOP)
                          </div>
                        )}
                        {rec.latePenaltyDeduction > 0 && (
                          <div className="text-amber-400 text-[11px]">
                            -₹{rec.latePenaltyDeduction.toLocaleString('en-IN')} (Late)
                          </div>
                        )}
                        {rec.lopDeduction === 0 && rec.latePenaltyDeduction === 0 && (
                          <span className="text-slate-500">₹0</span>
                        )}
                      </td>

                      {/* Advance & Line Item Adjustments */}
                      <td className="py-3.5 px-2 font-mono">
                        {rec.advanceRecovery > 0 && (
                          <div className="text-indigo-400 text-[11px]">
                            -₹{rec.advanceRecovery.toLocaleString('en-IN')} (Adv Rec)
                          </div>
                        )}
                        {rec.otherAdditions > 0 && (
                          <div className="text-emerald-400 text-[11px]">
                            +₹{rec.otherAdditions.toLocaleString('en-IN')} (Bonus)
                          </div>
                        )}
                        {rec.otherDeductions > 0 && (
                          <div className="text-rose-400 text-[11px]">
                            -₹{rec.otherDeductions.toLocaleString('en-IN')} (Adj)
                          </div>
                        )}
                        {rec.advanceRecovery === 0 && rec.otherAdditions === 0 && rec.otherDeductions === 0 && (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>

                      {/* Net Salary Payable */}
                      <td className="py-3.5 px-2 text-right font-mono">
                        <div className="font-black text-sm text-emerald-300">
                          ₹{rec.netSalary.toLocaleString('en-IN')}
                        </div>
                        {rec.excessUnrecoveredDeduction > 0 && (
                          <div className="text-[10px] text-amber-400" title="Deductions exceeded earnings">
                            Unrecovered: ₹{rec.excessUnrecoveredDeduction}
                          </div>
                        )}
                        {isPaid && (
                          <span className="text-[10px] text-sky-400 font-semibold uppercase">
                            Paid ✓
                          </span>
                        )}
                      </td>

                      {/* Lifecycle Status */}
                      <td className="py-3.5 px-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rec.status === 'locked' || rec.status === 'paid'
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : rec.status === 'approved'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {rec.status === 'locked' ? (
                            <Lock className="w-2.5 h-2.5" />
                          ) : (
                            <CheckCircle className="w-2.5 h-2.5" />
                          )}
                          {rec.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Adjustments button (only if not locked) */}
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => setAdjustmentModalRecord(rec)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                              title="Add / Edit Adjustments (Bonus, Damage, Deduction)"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Approval / Lock toggles */}
                          {rec.status === 'draft' || rec.status === 'calculated' ? (
                            <button
                              type="button"
                              disabled={isLoadingThis}
                              onClick={() => handleStatusChange(rec.id, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 text-[11px] font-semibold transition cursor-pointer"
                            >
                              Approve
                            </button>
                          ) : rec.status === 'approved' ? (
                            <button
                              type="button"
                              disabled={isLoadingThis}
                              onClick={() => handleStatusChange(rec.id, 'locked')}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Lock payroll to prevent edits before disbursement"
                            >
                              <Lock className="w-3 h-3 text-amber-400" />
                              Lock
                            </button>
                          ) : null}

                          {/* Record Payout */}
                          {isLocked && !isPaid && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(rec)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              Disburse
                            </button>
                          )}

                          {/* View Payslip Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedRecordForDetail(rec)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="View Full Itemized Payslip"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Advance Ledger Section */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-base">Active Salary Advances</h3>
          </div>
          <button
            type="button"
            onClick={() => setAdvanceModalOpen(true)}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Advance
          </button>
        </div>

        {advances.filter((a) => a.status === 'active').length === 0 ? (
          <p className="text-xs text-slate-500 py-2">No active salary advances outstanding.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {advances
              .filter((a) => a.status === 'active')
              .map((adv) => {
                const emp = staffList.find((s) => s.id === adv.userId);
                return (
                  <div
                    key={adv.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{emp?.name || 'Staff'}</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        ₹{adv.outstandingAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] line-clamp-1">{adv.reason}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
                      <span>Disbursed: {adv.date}</span>
                      <span>Recovered: ₹{adv.recoveredAmount}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* MODAL 1: Itemized Payslip & Printable View */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Monthly Salary Payslip</h3>
                  <p className="text-xs text-slate-400">
                    Cycle: {selectedRecordForDetail.payrollMonth} • {activePropertyName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Payslip Card */}
            <div id="printable-payslip" className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-base">{activePropertyName}</h4>
                  <p className="text-slate-400 text-[11px]">HostelOps Automated Payroll</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold uppercase">
                    {selectedRecordForDetail.paymentStatus === 'paid' ? 'PAID' : selectedRecordForDetail.status}
                  </span>
                </div>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Employee: </span>
                  <strong className="text-white">{selectedRecordForDetail.employeeName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Role: </span>
                  <span className="capitalize">{selectedRecordForDetail.employeeRole}</span>
                </div>
                <div>
                  <span className="text-slate-500">Monthly Base: </span>
                  <span className="font-mono text-slate-200">₹{selectedRecordForDetail.monthlySalary.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-500">Daily Rate: </span>
                  <span className="font-mono text-slate-200">₹{selectedRecordForDetail.dailyRate.toFixed(2)} ({selectedRecordForDetail.calendarDays} days)</span>
                </div>
              </div>

              {/* Attendance Matrix */}
              <div className="bg-slate-900/80 rounded-lg p-3 space-y-1">
                <p className="font-bold text-slate-200 text-[11px] uppercase tracking-wider mb-2">Attendance Summary</p>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div>Present: <span className="text-white font-bold">{selectedRecordForDetail.presentDays}d</span></div>
                  <div>Half Days: <span className="text-amber-400 font-bold">{selectedRecordForDetail.halfDays}d</span></div>
                  <div>Week-Offs: <span className="text-white font-bold">{selectedRecordForDetail.weekOffs}d</span></div>
                  <div>Paid Leaves: <span className="text-indigo-400 font-bold">{selectedRecordForDetail.paidLeaves}d</span></div>
                  <div>Absences: <span className="text-rose-400 font-bold">{selectedRecordForDetail.absentDays}d</span></div>
                  <div>Total LOP: <span className="text-rose-400 font-bold">{selectedRecordForDetail.totalLopDays}d</span></div>
                </div>
              </div>

              {/* Earnings vs Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Earnings */}
                <div className="space-y-2">
                  <p className="font-bold text-emerald-400 text-xs border-b border-slate-800 pb-1">Earnings</p>
                  <div className="flex justify-between text-slate-300">
                    <span>Gross Base Pay:</span>
                    <span className="font-mono">₹{selectedRecordForDetail.grossSalary.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedRecordForDetail.otherAdditions > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Other Additions:</span>
                      <span className="font-mono">+₹{selectedRecordForDetail.otherAdditions.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <p className="font-bold text-rose-400 text-xs border-b border-slate-800 pb-1">Deductions</p>
                  {selectedRecordForDetail.lopDeduction > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>LOP ({selectedRecordForDetail.totalLopDays}d):</span>
                      <span className="font-mono">-₹{selectedRecordForDetail.lopDeduction.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedRecordForDetail.latePenaltyDeduction > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Late Penalty:</span>
                      <span className="font-mono">-₹{selectedRecordForDetail.latePenaltyDeduction.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedRecordForDetail.advanceRecovery > 0 && (
                    <div className="flex justify-between text-indigo-400">
                      <span>Advance Recovery:</span>
                      <span className="font-mono">-₹{selectedRecordForDetail.advanceRecovery.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedRecordForDetail.otherDeductions > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Other Deductions:</span>
                      <span className="font-mono">-₹{selectedRecordForDetail.otherDeductions.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Net Payout Summary */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Net Take-Home Salary</p>
                  <p className="text-xl font-black font-mono text-emerald-300">
                    ₹{selectedRecordForDetail.netSalary.toLocaleString('en-IN')}
                  </p>
                </div>
                {selectedRecordForDetail.paymentDate && (
                  <div className="text-right text-[11px] text-slate-400">
                    <p>Paid on: {selectedRecordForDetail.paymentDate}</p>
                    <p className="capitalize">Mode: {selectedRecordForDetail.paymentMode}</p>
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
                Print Payslip
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Payment Disbursement */}
      {paymentModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Record Salary Disbursement</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-400">Employee</p>
                  <p className="font-bold text-white text-sm">{paymentModalRecord.employeeName}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Payable Net</p>
                  <p className="font-mono font-black text-emerald-300 text-base">
                    ₹{paymentModalRecord.netSalary.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PayrollPaymentMode)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Direct Bank Transfer (NEFT / IMPS)</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono font-bold text-emerald-300 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    Disbursement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Transaction Reference / UTR No.
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI-202608311234 / NEFT5543"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Payment Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Month end payroll settled"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition shadow cursor-pointer flex items-center gap-1.5"
                >
                  {recordingPayment ? 'Recording...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Disburse Salary Advance */}
      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Disburse Salary Advance</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdvanceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdvance} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Select Employee *
                </label>
                <select
                  required
                  value={advanceUserId}
                  onChange={(e) => setAdvanceUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} - {s.staffType || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    Advance Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    required
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono font-bold text-amber-300 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    Date Disbursed *
                  </label>
                  <input
                    type="date"
                    required
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Reason for Advance *
                </label>
                <input
                  type="text"
                  required
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="e.g. Medical emergency, family festival"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-[11px] text-amber-300/90 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>This amount will be automatically suggested for recovery during the next monthly payroll calculation cycle.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdvanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdvance}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition shadow cursor-pointer flex items-center gap-1.5"
                >
                  {submittingAdvance ? 'Recording...' : 'Disburse Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Manual Adjustment (Bonus / Deduction) */}
      {adjustmentModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Custom Payroll Adjustment</h3>
                  <p className="text-xs text-slate-400">{adjustmentModalRecord.employeeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustmentModalRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List existing adjustments */}
            {(adjustmentModalRecord.adjustments || []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Adjustments</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(adjustmentModalRecord.adjustments || []).map((adj) => (
                    <div
                      key={adj.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span
                          className={`font-mono font-bold ${
                            adj.type === 'addition' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {adj.type === 'addition' ? '+' : '-'}₹{adj.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-slate-400 ml-2">{adj.reason}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAdjustment(adj.id)}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        title="Delete adjustment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new adjustment */}
            <form onSubmit={handleSubmitAdjustment} className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Add Line Item</p>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Adjustment Type *
                </label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as 'addition' | 'deduction')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="addition">Addition (Bonus / Overtime / Reimbursement)</option>
                  <option value="deduction">Deduction (Uniform / Damages / Tax / Fine)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="100"
                  min="50"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 font-mono font-bold text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Reason / Memo *
                </label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Diwali Bonus / Key replacement fee"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingAdjustment}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow cursor-pointer"
                >
                  {submittingAdjustment ? 'Applying...' : 'Apply Line Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
