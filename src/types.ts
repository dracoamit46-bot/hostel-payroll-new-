export type UserRole = 'owner' | 'manager' | 'inventory_manager' | 'staff';

// 1. Pure Attendance Outcome / Status
export type AttendanceStatus =
  | 'present'
  | 'half_day'
  | 'week_off'
  | 'on_leave'
  | 'absent'
  | 'holiday';

// 2. Separate Shift / Punch Lifecycle State
export type ShiftPunchStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'missing_punch';

// 3. Late Penalty Tracking Status
export type LatePenaltyStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected';

export type TaskStatus = 'created' | 'pending_approval' | 'approved' | 'completed' | 'rejected';
export type PaymentType = 'no_payment' | 'petty_cash' | 'head_office';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Property {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusM: number | null;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  propertyId: string | null;
  staffType: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  monthlySalary?: number | null;
  joiningDate?: string | null;
  isActive?: boolean;
}

export interface SalaryHistoryRecord {
  id: string;
  userId: string;
  monthlySalary: number;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null; // YYYY-MM-DD or null if active
  isActive: boolean;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string;
}

export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'locked' | 'paid';
export type PayrollPaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PayrollPaymentMode = 'upi' | 'cash' | 'bank_transfer' | 'cheque';

export interface PayrollAdjustment {
  id: string;
  payrollRecordId: string;
  type: 'addition' | 'deduction';
  amount: number;
  reason: string;
  createdBy?: string | null;
  createdAt?: string;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  propertyId: string;
  payrollMonth: string; // e.g. '2026-08'
  
  // Snapshot Data
  employeeName?: string;
  employeeRole?: string;
  employeeStaffType?: string;
  monthlySalary: number;
  calendarDays: number;
  dailyRate: number;

  // Attendance & Leave Metrics Snapshot
  presentDays: number;
  halfDays: number;
  weekOffs: number;
  carryForwardWeekOffs: number;
  paidLeaves: number;
  absentDays: number;
  lopLeaves: number;
  excessWeekOffs: number;

  // Day Totals
  payableDays: number;
  totalLopDays: number;

  // Financial Snapshots
  lopDeduction: number;
  latePenaltyDeduction: number;
  advanceRecovery: number;
  otherAdditions: number;
  otherDeductions: number;
  grossSalary: number;
  netSalary: number;
  excessUnrecoveredDeduction: number;

  // Lifecycle
  status: PayrollStatus;

  // Payment Tracking
  paymentStatus: PayrollPaymentStatus;
  paymentDate?: string | null;
  paymentMode?: PayrollPaymentMode | null;
  transactionRef?: string | null;
  paymentNotes?: string | null;
  paidAmount?: number;

  // Audit Trail
  generatedBy?: string | null;
  generatedAt?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  lockedBy?: string | null;
  lockedAt?: string | null;
  paidBy?: string | null;
  paidAt?: string | null;

  // Line item adjustments
  adjustments?: PayrollAdjustment[];
}

export interface SalaryAdvance {
  id: string;
  userId: string;
  amount: number;
  date: string;
  reason: string;
  recoveredAmount: number;
  outstandingAmount: number;
  status: 'active' | 'fully_recovered' | 'cancelled';
  createdBy?: string | null;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  
  // Separation of Concerns: Outcome vs. Shift state
  status: AttendanceStatus;
  shiftStatus: ShiftPunchStatus;

  // Punch Timestamps & Media
  clockInTime: string | null;
  clockInSelfieUrl: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutTime: string | null;
  clockOutSelfieUrl: string | null;
  
  // Worked duration & Schedule
  scheduledShiftStart?: string | null;
  scheduledShiftEnd?: string | null;
  workedMinutes?: number;
  totalHours?: number;

  // Late & Manager-approved Penalty Separation
  lateMinutes?: number;
  latePenaltyEligible?: boolean;
  latePenaltyStatus?: LatePenaltyStatus;
  latePenaltyAmount?: number;
  latePenaltyReviewedBy?: string | null;
  latePenaltyReviewedAt?: string | null;

  // Manual Adjustments
  halfDayReason?: string | null;
  managerAdjusted?: boolean;
  adjustmentReason?: string | null;
  markedBy: string | null;
}

export interface WeekOffRequest {
  id: string;
  userId: string;
  requestedDates: string[];
  reason: string | null;
  status: RequestStatus;
  reviewedBy: string | null;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: 'casual' | 'sick';
  reason: string;
  status: RequestStatus;
  reviewedBy: string | null;
}

export interface AttendanceCorrectionRequest {
  id: string;
  userId: string;
  date: string;
  note: string | null;
  status: RequestStatus;
  reviewedBy: string | null;
}

export interface TaskCategory {
  id: string;
  propertyId: string;
  name: string;
}

export interface Task {
  id: string;
  propertyId: string;
  createdBy: string;
  categoryId: string;
  description: string;
  photoUrl: string | null;
  status: TaskStatus;
  lastActionBy: string | null;
  lastActionNote: string | null;
}

export interface Voucher {
  id: string;
  taskId: string;
  paymentType: PaymentType;
  amount: number | null;
  createdBy: string;
}
