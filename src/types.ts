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
