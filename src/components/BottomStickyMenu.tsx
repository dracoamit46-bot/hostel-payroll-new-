import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  Calculator,
  Building2,
  Users,
  Clock,
  Palmtree,
  Receipt,
  Compass,
  BarChart3,
} from 'lucide-react';
import { UserRole } from '../types';

interface BottomStickyMenuProps {
  role: UserRole;
  activeTab: string;
  onSelectTab: (tab: any) => void;
  pendingApprovalsCount?: number;
  pendingAttendanceCount?: number;
}

export default function BottomStickyMenu({
  role,
  activeTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  pendingAttendanceCount = 0,
}: BottomStickyMenuProps) {
  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const isStaffOrInvMgr = role === 'staff' || role === 'inventory_manager';

  if (isOwner) {
    return (
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl py-1.5 px-2 transition-all"
      >
        <div className="max-w-xl mx-auto flex items-center justify-around">
          {/* Reports */}
          <button
            id="bottom-nav-reports"
            onClick={() => onSelectTab('overview')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'overview'
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Reports</span>
          </button>

          {/* Approvals */}
          <button
            id="bottom-nav-tasks"
            onClick={() => onSelectTab('tasks')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'tasks'
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center font-mono ring-2 ring-slate-900 animate-pulse">
                {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
              </span>
            )}
            <span className="text-[10px] font-semibold tracking-tight">Approvals</span>
          </button>

          {/* Attendance & Staff */}
          <button
            id="bottom-nav-attendance"
            onClick={() => onSelectTab('attendance')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'attendance' || activeTab === 'staff'
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-5 h-5 mb-0.5" />
            {pendingAttendanceCount > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono ring-2 ring-slate-900">
                {pendingAttendanceCount}
              </span>
            )}
            <span className="text-[10px] font-semibold tracking-tight">Attendance</span>
          </button>

          {/* Payroll */}
          <button
            id="bottom-nav-payroll"
            onClick={() => onSelectTab('payroll')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'payroll'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Payroll</span>
          </button>

          {/* Properties */}
          <button
            id="bottom-nav-properties"
            onClick={() => onSelectTab('properties')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'properties'
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Branches</span>
          </button>
        </div>
      </nav>
    );
  }

  if (isManager) {
    return (
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl py-1.5 px-2 transition-all"
      >
        <div className="max-w-xl mx-auto flex items-center justify-around">
          {/* Reports */}
          <button
            id="bottom-nav-mgr-reports"
            onClick={() => onSelectTab('overview')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'overview'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Reports</span>
          </button>

          {/* Tasks & Approvals */}
          <button
            id="bottom-nav-mgr-tasks"
            onClick={() => onSelectTab('tasks')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'tasks'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center font-mono ring-2 ring-slate-900 animate-pulse">
                {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
              </span>
            )}
            <span className="text-[10px] font-semibold tracking-tight">Approvals</span>
          </button>

          {/* Attendance Review */}
          <button
            id="bottom-nav-mgr-attendance"
            onClick={() => onSelectTab('attendance')}
            className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'attendance'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-5 h-5 mb-0.5" />
            {pendingAttendanceCount > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono ring-2 ring-slate-900">
                {pendingAttendanceCount}
              </span>
            )}
            <span className="text-[10px] font-semibold tracking-tight">Attendance</span>
          </button>

          {/* Payroll */}
          <button
            id="bottom-nav-mgr-payroll"
            onClick={() => onSelectTab('payroll')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'payroll'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Payroll</span>
          </button>

          {/* Staff Roster */}
          <button
            id="bottom-nav-mgr-staff"
            onClick={() => onSelectTab('staff')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'staff'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Staff</span>
          </button>
        </div>
      </nav>
    );
  }

  if (isStaffOrInvMgr) {
    return (
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl py-1.5 px-2 transition-all"
      >
        <div className="max-w-xl mx-auto flex items-center justify-around">
          {/* Clock In/Out */}
          <button
            id="bottom-nav-staff-clock"
            onClick={() => onSelectTab('overview')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'overview' || activeTab === 'clock_in_out'
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Clock In</span>
          </button>

          {/* Tasks & Issues */}
          <button
            id="bottom-nav-staff-tasks"
            onClick={() => onSelectTab('tasks')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'tasks'
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Tasks</span>
          </button>

          {/* Leaves */}
          <button
            id="bottom-nav-staff-leave"
            onClick={() => onSelectTab('leave')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'leave'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palmtree className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Leaves</span>
          </button>

          {/* Week-Offs */}
          <button
            id="bottom-nav-staff-weekoff"
            onClick={() => onSelectTab('week_off')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'week_off'
                ? 'text-sky-400 bg-sky-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Week-Off</span>
          </button>

          {/* My Payslips */}
          <button
            id="bottom-nav-staff-payroll"
            onClick={() => onSelectTab('payroll')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
              activeTab === 'payroll'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold tracking-tight">Payslips</span>
          </button>
        </div>
      </nav>
    );
  }

  return null;
}
