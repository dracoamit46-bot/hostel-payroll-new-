import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getProperties,
  getUsers,
  getAttendanceByDate,
  getTasks,
  getVouchers,
  getLeaveRequests,
  getWeekOffRequests,
  getAttendanceCorrectionRequests,
  getSalaryAdvances,
  getPayrollRecords,
  getEmployeeMonthlySalary,
} from '../services/dataService';
import {
  Property,
  User,
  AttendanceRecord,
  Task,
  Voucher,
  LeaveRequest,
  WeekOffRequest,
  AttendanceCorrectionRequest,
  SalaryAdvance,
  PayrollRecord,
} from '../types';
import {
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  Receipt,
  Users,
  CalendarCheck,
  Palmtree,
  ClipboardList,
  IndianRupee,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface ReportsDashboardProps {
  onNavigate: (tab: 'overview' | 'tasks' | 'leave' | 'payroll' | 'attendance' | 'properties' | 'staff' | 'weekoff_approval' | 'geolocation' | 'clock_in_out') => void;
  onSelectProperty?: (propertyId: string | null) => void;
}

export default function ReportsDashboard({ onNavigate }: ReportsDashboardProps) {
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';
  const isManager = currentUser?.role === 'manager';

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | 'all'>(
    isOwner ? 'all' : currentUser?.propertyId || 'all'
  );

  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [weekOffRequests, setWeekOffRequests] = useState<WeekOffRequest[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        propsData,
        usersData,
        attData,
        tasksData,
        vouchersData,
        leavesData,
        weekOffsData,
        corrData,
        advData,
        payrollData,
      ] = await Promise.all([
        getProperties(),
        getUsers(),
        getAttendanceByDate(todayIso),
        getTasks(),
        getVouchers(),
        getLeaveRequests(),
        getWeekOffRequests(),
        getAttendanceCorrectionRequests(),
        getSalaryAdvances(),
        getPayrollRecords(null, currentMonthStr),
      ]);

      setProperties(propsData || []);
      setUsers(usersData || []);
      setTodayAttendance(attData || []);
      setTasks(tasksData || []);
      setVouchers(vouchersData || []);
      setLeaveRequests(leavesData || []);
      setWeekOffRequests(weekOffsData || []);
      setCorrections(corrData || []);
      setAdvances(advData || []);
      setPayrollRecords(payrollData || []);
    } catch (err) {
      console.error('Failed to load dashboard report metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayIso, currentMonthStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Filtered dataset based on selected property
  const filteredUsers = useMemo(() => {
    if (selectedPropertyId === 'all') return users;
    return users.filter((u) => u.propertyId === selectedPropertyId);
  }, [users, selectedPropertyId]);

  const filteredStaffMembers = useMemo(() => {
    return filteredUsers.filter((u) => u.role === 'staff' || u.role === 'inventory_manager');
  }, [filteredUsers]);

  const filteredTasks = useMemo(() => {
    if (selectedPropertyId === 'all') return tasks;
    return tasks.filter((t) => t.propertyId === selectedPropertyId);
  }, [tasks, selectedPropertyId]);

  const filteredUserIds = useMemo(() => new Set(filteredUsers.map((u) => u.id)), [filteredUsers]);

  const filteredAttendance = useMemo(() => {
    return todayAttendance.filter((a) => filteredUserIds.has(a.userId));
  }, [todayAttendance, filteredUserIds]);

  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((l) => filteredUserIds.has(l.userId));
  }, [leaveRequests, filteredUserIds]);

  const filteredWeekOffs = useMemo(() => {
    return weekOffRequests.filter((w) => filteredUserIds.has(w.userId));
  }, [weekOffRequests, filteredUserIds]);

  const filteredCorrections = useMemo(() => {
    return corrections.filter((c) => filteredUserIds.has(c.userId));
  }, [corrections, filteredUserIds]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((adv) => filteredUserIds.has(adv.userId));
  }, [advances, filteredUserIds]);

  // =========================================================================
  // 1. ACTION REQUIRED METRICS
  // =========================================================================
  // A. Money Approvals:
  // - Vouchers that are pending manager/owner review or head office approval
  // - Active/Pending salary advances needing review
  const pendingVouchers = useMemo(() => {
    const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));
    return vouchers.filter((v) => {
      const task = taskMap.get(v.taskId);
      if (!task) return false;
      if (selectedPropertyId !== 'all' && task.propertyId !== selectedPropertyId) return false;
      // Pending review states
      return (
        task.status === 'created' ||
        task.status === 'pending_approval' ||
        (task.status === 'completed' && v.paymentType !== 'no_payment')
      );
    });
  }, [vouchers, tasks, selectedPropertyId]);

  const voucherPendingAmount = useMemo(() => {
    return pendingVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
  }, [pendingVouchers]);

  const pendingAdvances = useMemo(() => {
    return filteredAdvances.filter((adv) => adv.status === 'active' && adv.outstandingAmount > 0);
  }, [filteredAdvances]);

  const pendingAdvanceAmount = useMemo(() => {
    return pendingAdvances.reduce((sum, adv) => sum + adv.outstandingAmount, 0);
  }, [pendingAdvances]);

  const totalMoneyApprovalsCount = pendingVouchers.length + (pendingAdvances.length > 0 ? 1 : 0);
  const totalMoneyApprovalsAmount = voucherPendingAmount + pendingAdvanceAmount;

  // B. Task / Issue Approvals:
  const pendingTasks = useMemo(() => {
    return filteredTasks.filter(
      (t) => t.status === 'created' || t.status === 'pending_approval'
    );
  }, [filteredTasks]);

  // C. Attendance & Leave Reviews:
  const pendingAttendanceReviews = useMemo(() => {
    const pendingCorr = filteredCorrections.filter((c) => c.status === 'pending').length;
    const pendingLvs = filteredLeaves.filter((l) => l.status === 'pending').length;
    const pendingWks = filteredWeekOffs.filter((w) => w.status === 'pending').length;
    const pendingLate = filteredAttendance.filter((a) => a.latePenaltyStatus === 'pending').length;
    return pendingCorr + pendingLvs + pendingWks + pendingLate;
  }, [filteredCorrections, filteredLeaves, filteredWeekOffs, filteredAttendance]);

  // =========================================================================
  // 2. TODAY'S ATTENDANCE NUMBERS
  // =========================================================================
  const attendanceMetrics = useMemo(() => {
    const total = filteredStaffMembers.length;
    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let late = 0;

    const markedUserMap = new Map<string, AttendanceRecord>();
    filteredAttendance.forEach((a) => {
      markedUserMap.set(a.userId, a);
    });

    filteredStaffMembers.forEach((staff) => {
      const record = markedUserMap.get(staff.id);
      if (record) {
        if (record.status === 'present') {
          present += 1;
        } else if (record.status === 'half_day') {
          present += 0.5;
        } else if (record.status === 'absent') {
          absent += 1;
        } else if (record.status === 'on_leave' || record.status === 'week_off') {
          onLeave += 1;
        }
        if (record.lateMinutes && record.lateMinutes > 0) {
          late += 1;
        }
      } else {
        // Not punched yet today
        const hasApprovedLeave = filteredLeaves.some(
          (l) => l.userId === staff.id && l.status === 'approved' && todayIso >= l.startDate && todayIso <= l.endDate
        );
        if (hasApprovedLeave) {
          onLeave += 1;
        }
      }
    });

    return {
      total,
      present,
      absent,
      onLeave,
      late,
    };
  }, [filteredStaffMembers, filteredAttendance, filteredLeaves, todayIso]);

  // =========================================================================
  // 3. BRANCH OVERVIEW (for Owner)
  // =========================================================================
  const branchRows = useMemo(() => {
    return properties.map((prop) => {
      const propUsers = users.filter((u) => u.propertyId === prop.id);
      const propStaff = propUsers.filter((u) => u.role === 'staff' || u.role === 'inventory_manager');
      const propUserIds = new Set(propUsers.map((u) => u.id));

      const propAtt = todayAttendance.filter((a) => propUserIds.has(a.userId));
      const propPresent = propAtt.filter((a) => a.status === 'present' || a.status === 'half_day').length;

      const propIssues = tasks.filter(
        (t) => t.propertyId === prop.id && (t.status === 'reported' || t.status === 'assigned' || t.status === 'in_progress')
      ).length;

      const propPendingLeaves = leaveRequests.filter((l) => propUserIds.has(l.userId) && l.status === 'pending').length;
      const propPendingCorr = corrections.filter((c) => propUserIds.has(c.userId) && c.status === 'pending').length;
      const totalPending = propIssues + propPendingLeaves + propPendingCorr;

      return {
        id: prop.id,
        name: prop.name,
        staffCount: propStaff.length,
        presentCount: propPresent,
        issuesCount: propIssues,
        pendingCount: totalPending,
      };
    });
  }, [properties, users, todayAttendance, tasks, leaveRequests, corrections]);

  // =========================================================================
  // 4. FINANCIAL OVERVIEW
  // =========================================================================
  const financialMetrics = useMemo(() => {
    // Calculate total base payroll liability for active users in scope
    let monthlyPayrollEstimate = 0;
    filteredStaffMembers.forEach((staff) => {
      monthlyPayrollEstimate += staff.monthlySalary || 16000;
    });

    // Total outstanding advances
    const activeAdvanceBalance = filteredAdvances
      .filter((adv) => adv.status === 'active')
      .reduce((sum, adv) => sum + (adv.outstandingAmount || 0), 0);

    // Total issue / voucher expenses pending or approved this month
    const issueVoucherTotal = pendingVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);

    return {
      monthlyPayrollEstimate,
      activeAdvanceBalance,
      issueVoucherTotal,
    };
  }, [filteredStaffMembers, filteredAdvances, pendingVouchers]);

  // =========================================================================
  // 5. LIVE ATTENTION / ALERTS FEED
  // =========================================================================
  const alertsList = useMemo(() => {
    const items: Array<{ id: string; type: 'red' | 'yellow' | 'green' | 'blue'; message: string; targetTab?: 'attendance' | 'tasks' | 'leave' | 'payroll' }> = [];

    // Absent staff alert
    if (attendanceMetrics.absent > 0) {
      items.push({
        id: 'absent-alert',
        type: 'red',
        message: `${attendanceMetrics.absent} employee${attendanceMetrics.absent > 1 ? 's are' : ' is'} marked absent today`,
        targetTab: 'attendance',
      });
    }

    // Pending attendance corrections
    const pendingCorrCount = filteredCorrections.filter((c) => c.status === 'pending').length;
    if (pendingCorrCount > 0) {
      items.push({
        id: 'corr-alert',
        type: 'yellow',
        message: `${pendingCorrCount} attendance correction request${pendingCorrCount > 1 ? 's' : ''} pending review`,
        targetTab: 'attendance',
      });
    }

    // Unresolved maintenance issues
    if (pendingTasks.length > 0) {
      items.push({
        id: 'tasks-alert',
        type: 'yellow',
        message: `${pendingTasks.length} operational task${pendingTasks.length > 1 ? 's / issues' : ' / issue'} awaiting completion or review`,
        targetTab: 'tasks',
      });
    }

    // Pending leave requests
    const pendingLeaveCount = filteredLeaves.filter((l) => l.status === 'pending').length;
    if (pendingLeaveCount > 0) {
      items.push({
        id: 'leave-alert',
        type: 'blue',
        message: `${pendingLeaveCount} leave application${pendingLeaveCount > 1 ? 's' : ''} awaiting approval`,
        targetTab: 'leave',
      });
    }

    // Payroll status
    const currentMonthPayrollCount = payrollRecords.length;
    if (currentMonthPayrollCount > 0) {
      items.push({
        id: 'payroll-status-active',
        type: 'green',
        message: `Payroll for ${currentMonthStr} is generated (${currentMonthPayrollCount} records)`,
        targetTab: 'payroll',
      });
    } else {
      items.push({
        id: 'payroll-status-pending',
        type: 'blue',
        message: `Payroll calculation ready for ${currentMonthStr}`,
        targetTab: 'payroll',
      });
    }

    return items;
  }, [
    attendanceMetrics.absent,
    filteredCorrections,
    pendingTasks.length,
    filteredLeaves,
    payrollRecords.length,
    currentMonthStr,
  ]);

  // Time-based dynamic greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. HEADER & BRANCH SELECTOR */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {greeting}, {currentUser?.name || (isOwner ? 'Owner' : 'Manager')}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              {isOwner ? 'Executive Overview' : 'Operations Hub'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2 font-medium">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="text-slate-300">Live Database Sync</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Branch Dropdown for Owner / Multiple Properties */}
          {isOwner && properties.length > 0 && (
            <div className="relative">
              <select
                id="select-branch-filter"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 text-xs sm:text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer shadow-xs"
              >
                <option value="all">All Branches ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Refresh Button */}
          <button
            id="btn-refresh-dashboard"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. ACTION REQUIRED SECTION */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-rose-950/30 to-slate-900 border border-rose-900/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-rose-300">
              ACTION REQUIRED
            </h2>
          </div>
          <span className="text-xs text-rose-400 font-mono font-semibold">
            {totalMoneyApprovalsCount + pendingTasks.length + pendingAttendanceReviews} Pending Total
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Money Approvals */}
          <div
            onClick={() => onNavigate('tasks')}
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {totalMoneyApprovalsCount}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition">
                Money Approvals
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Petty Cash &amp; Advances</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-amber-300">
                {formatCurrency(totalMoneyApprovalsAmount)}
              </span>
              <span className="text-slate-400 group-hover:text-slate-200 flex items-center gap-1 font-medium">
                Review <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          {/* Card 2: Task / Issue Approvals */}
          <div
            onClick={() => onNavigate('tasks')}
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <span className="text-lg font-bold font-mono text-blue-400">
                  {pendingTasks.length}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition">
                Task / Issue Approvals
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Maintenance &amp; Operations</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300">
                {pendingTasks.length} Pending
              </span>
              <span className="text-slate-400 group-hover:text-slate-200 flex items-center gap-1 font-medium">
                Review <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>

          {/* Card 3: Attendance & Other Reviews */}
          <div
            onClick={() => onNavigate('attendance')}
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 transition cursor-pointer flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-lg font-bold font-mono text-purple-400">
                  {pendingAttendanceReviews}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition">
                Attendance &amp; Leaves
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Punches, Corrections &amp; Leaves</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300">
                {pendingAttendanceReviews} Pending
              </span>
              <span className="text-slate-400 group-hover:text-slate-200 flex items-center gap-1 font-medium">
                Review <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            id="btn-review-approvals-all"
            onClick={() => onNavigate('tasks')}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-md shadow-rose-950"
          >
            <span>Review All Approvals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. TODAY'S ATTENDANCE STRIP */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-200">
              TODAY&apos;S ATTENDANCE
            </h2>
          </div>
          <button
            id="btn-view-attendance-tab"
            onClick={() => onNavigate('attendance')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer transition"
          >
            <span>View Attendance Register</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Total Staff
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-white mt-1 block">
              {attendanceMetrics.total}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-center">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">
              Present
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-300 mt-1 block">
              {attendanceMetrics.present}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-center">
            <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider block">
              Absent
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-300 mt-1 block">
              {attendanceMetrics.absent}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-center">
            <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wider block">
              On Leave
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-purple-300 mt-1 block">
              {attendanceMetrics.onLeave}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block">
              Late Check-ins
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-1 block">
              {attendanceMetrics.late}
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. BRANCH OVERVIEW (for Owner) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {isOwner && properties.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-200">
                BRANCH OVERVIEW
              </h2>
            </div>
            <button
              onClick={() => onNavigate('properties')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <span>Manage Properties</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Branch Name</th>
                  <th className="pb-3 font-semibold text-center">Staff</th>
                  <th className="pb-3 font-semibold text-center">Present</th>
                  <th className="pb-3 font-semibold text-center">Open Issues</th>
                  <th className="pb-3 font-semibold text-center">Pending Approvals</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {branchRows.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 font-medium text-slate-100 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span>{b.name}</span>
                    </td>
                    <td className="py-3 text-center font-mono text-slate-300 font-medium">
                      {b.staffCount}
                    </td>
                    <td className="py-3 text-center font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {b.presentCount}
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono">
                      {b.issuesCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          {b.issuesCount}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 text-center font-mono">
                      {b.pendingCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                          {b.pendingCount}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedPropertyId(b.id);
                          onNavigate('attendance');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. FINANCIAL OVERVIEW */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-200">
              FINANCIAL OVERVIEW
            </h2>
          </div>
          <button
            onClick={() => onNavigate('payroll')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition"
          >
            <span>Open Payroll Module</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Estimated Monthly Payroll
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1 block">
              {formatCurrency(financialMetrics.monthlyPayrollEstimate)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {filteredStaffMembers.length} Active Staff Members
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Pending / Active Advances
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-1 block">
              {formatCurrency(financialMetrics.activeAdvanceBalance)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pendingAdvances.length} Unrecovered Advance Records
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Issue &amp; Voucher Expenses
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-blue-400 mt-1 block">
              {formatCurrency(financialMetrics.issueVoucherTotal)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pendingVouchers.length} Operational Vouchers
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. ATTENTION / ALERTS FEED */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-200">
              ATTENTION / ALERTS
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {alertsList.length} Active Signals
          </span>
        </div>

        <div className="space-y-2">
          {alertsList.map((alert) => (
            <div
              key={alert.id}
              onClick={() => alert.targetTab && onNavigate(alert.targetTab)}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition cursor-pointer ${
                alert.type === 'red'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200 hover:bg-rose-950/60'
                  : alert.type === 'yellow'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200 hover:bg-amber-950/60'
                  : alert.type === 'green'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200 hover:bg-emerald-950/60'
                  : 'bg-blue-950/40 border-blue-800/60 text-blue-200 hover:bg-blue-950/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  {alert.type === 'red' && '🔴'}
                  {alert.type === 'yellow' && '🟡'}
                  {alert.type === 'green' && '🟢'}
                  {alert.type === 'blue' && '🔵'}
                </span>
                <span className="font-medium">{alert.message}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
