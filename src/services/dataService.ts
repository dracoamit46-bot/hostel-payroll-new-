import {
  Property,
  User,
  AttendanceRecord,
  AttendanceStatus,
  ShiftPunchStatus,
  LatePenaltyStatus,
  WeekOffRequest,
  LeaveRequest,
  AttendanceCorrectionRequest,
  TaskCategory,
  Task,
  Voucher,
  UserRole,
  RequestStatus,
  TaskStatus,
  SalaryHistoryRecord,
  PayrollRecord,
  PayrollAdjustment,
  SalaryAdvance,
  PayrollStatus,
  PayrollPaymentStatus,
  PayrollPaymentMode,
} from '../types';
import { supabase } from '../supabaseClient';

// Database Row Types (snake_case)
interface DbProperty {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
}

interface DbUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  property_id: string | null;
  staff_type: string | null;
  shift_start: string | null;
  shift_end: string | null;
  shift_1_start?: string | null;
  shift_1_end?: string | null;
  shift_2_start?: string | null;
  shift_2_end?: string | null;
  monthly_salary?: number | null;
  joining_date?: string | null;
  is_active?: boolean | null;
}

interface DbSalaryHistory {
  id: string;
  user_id: string;
  monthly_salary: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
}

interface DbSalaryAdvance {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  reason: string;
  recovered_amount: number;
  outstanding_amount: number;
  status: 'active' | 'fully_recovered' | 'cancelled';
  created_by?: string | null;
  created_at?: string;
}

interface DbPayrollAdjustment {
  id: string;
  payroll_record_id: string;
  type: 'addition' | 'deduction';
  amount: number;
  reason: string;
  created_by?: string | null;
  created_at?: string;
}

interface DbPayrollRecord {
  id: string;
  user_id: string;
  property_id: string;
  payroll_month: string;
  monthly_salary: number;
  calendar_days: number;
  daily_rate: number;
  present_days: number;
  half_days: number;
  week_offs: number;
  carry_forward_week_offs: number;
  paid_leaves: number;
  absent_days: number;
  lop_leaves: number;
  excess_week_offs: number;
  payable_days: number;
  total_lop_days: number;
  lop_deduction: number;
  late_penalty_deduction: number;
  advance_recovery: number;
  other_additions: number;
  other_deductions: number;
  gross_salary: number;
  net_salary: number;
  excess_unrecovered_deduction: number;
  status: PayrollStatus;
  payment_status: PayrollPaymentStatus;
  payment_date?: string | null;
  payment_mode?: PayrollPaymentMode | null;
  transaction_ref?: string | null;
  payment_notes?: string | null;
  paid_amount?: number;
  generated_by?: string | null;
  generated_at?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  paid_by?: string | null;
  paid_at?: string | null;
}

interface DbAttendance {
  id: string;
  user_id: string;
  date: string;
  clock_in_time: string | null;
  clock_in_selfie_url: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_accuracy?: number | null;
  clock_in_address?: string | null;
  clock_out_time: string | null;
  clock_out_selfie_url: string | null;
  clock_out_lat?: number | null;
  clock_out_lng?: number | null;
  clock_out_accuracy?: number | null;
  clock_out_address?: string | null;
  status: any;
  shift_status?: any;
  scheduled_shift_start?: string | null;
  scheduled_shift_end?: string | null;
  shift_1_start?: string | null;
  shift_1_end?: string | null;
  shift_2_start?: string | null;
  shift_2_end?: string | null;
  worked_minutes?: number | null;
  total_hours?: number | null;
  late_minutes?: number | null;
  late_penalty_eligible?: boolean | null;
  late_penalty_status?: any;
  late_penalty_amount?: number | null;
  late_penalty_reviewed_by?: string | null;
  late_penalty_reviewed_at?: string | null;
  half_day_reason?: string | null;
  manager_adjusted?: boolean | null;
  adjustment_reason?: string | null;
  marked_by: string | null;

  // Split Shift 1 DB columns
  shift_1_clock_in_time?: string | null;
  shift_1_clock_in_selfie_url?: string | null;
  shift_1_clock_in_lat?: number | null;
  shift_1_clock_in_lng?: number | null;
  shift_1_clock_in_accuracy?: number | null;
  shift_1_clock_in_address?: string | null;
  shift_1_clock_out_time?: string | null;
  shift_1_clock_out_selfie_url?: string | null;
  shift_1_clock_out_lat?: number | null;
  shift_1_clock_out_lng?: number | null;
  shift_1_clock_out_accuracy?: number | null;
  shift_1_clock_out_address?: string | null;
  shift_1_worked_minutes?: number | null;
  shift_1_late_minutes?: number | null;
  shift_1_status?: any;

  // Split Shift 2 DB columns
  shift_2_clock_in_time?: string | null;
  shift_2_clock_in_selfie_url?: string | null;
  shift_2_clock_in_lat?: number | null;
  shift_2_clock_in_lng?: number | null;
  shift_2_clock_in_accuracy?: number | null;
  shift_2_clock_in_address?: string | null;
  shift_2_clock_out_time?: string | null;
  shift_2_clock_out_selfie_url?: string | null;
  shift_2_clock_out_lat?: number | null;
  shift_2_clock_out_lng?: number | null;
  shift_2_clock_out_accuracy?: number | null;
  shift_2_clock_out_address?: string | null;
  shift_2_worked_minutes?: number | null;
  shift_2_late_minutes?: number | null;
  shift_2_status?: any;
}

interface DbTask {
  id: string;
  property_id: string;
  created_by: string;
  category_id: string;
  description: string;
  photo_url: string | null;
  status: TaskStatus;
  last_action_by: string | null;
  last_action_note: string | null;
}

interface DbTaskCategory {
  id: string;
  property_id: string;
  name: string;
}

interface DbVoucher {
  id: string;
  task_id: string;
  payment_type: any;
  amount: number | null;
  created_by: string;
}

interface DbWeekOffRequest {
  id: string;
  user_id: string;
  requested_dates: string[];
  reason: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
}

interface DbLeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: 'casual' | 'sick';
  reason: string;
  status: RequestStatus;
  reviewed_by: string | null;
}

interface DbAttendanceCorrectionRequest {
  id: string;
  user_id: string;
  date: string;
  punch_missed?: string | null;
  note: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
}

// Converters
const mapProperty = (db: DbProperty): Property => ({
  id: db.id,
  name: db.name,
  address: db.address,
  latitude: db.latitude,
  longitude: db.longitude,
  geofenceRadiusM: db.geofence_radius_m,
});

const mapUser = (db: DbUser): User => {
  const s1Start = db.shift_1_start || db.shift_start || '08:00';
  const s1End = db.shift_1_end || (db.shift_2_start ? '14:00' : db.shift_end || '16:00');
  const s2Start = db.shift_2_start !== undefined && db.shift_2_start !== null ? db.shift_2_start : null;
  const s2End = db.shift_2_end !== undefined && db.shift_2_end !== null ? db.shift_2_end : null;

  const monthlySalary = db.monthly_salary ? Number(db.monthly_salary) : null;
  const joiningDate = db.joining_date || null;
  const isActive = db.is_active !== undefined && db.is_active !== null ? db.is_active !== false : true;

  return {
    id: db.id,
    name: db.name,
    phone: db.phone,
    role: db.role,
    propertyId: db.property_id,
    staffType: db.staff_type,
    shiftStart: s1Start,
    shiftEnd: s2End || s1End,
    shift1Start: s1Start,
    shift1End: s1End,
    shift2Start: s2Start,
    shift2End: s2End,
    monthlySalary,
    joiningDate,
    isActive,
  };
};

const mapSalaryHistory = (db: DbSalaryHistory): SalaryHistoryRecord => ({
  id: db.id,
  userId: db.user_id,
  monthlySalary: Number(db.monthly_salary),
  effectiveFrom: db.effective_from,
  effectiveTo: db.effective_to,
  isActive: db.is_active,
  notes: db.notes,
  createdBy: db.created_by,
  createdAt: db.created_at,
});

const mapSalaryAdvance = (db: DbSalaryAdvance): SalaryAdvance => ({
  id: db.id,
  userId: db.user_id,
  amount: Number(db.amount),
  date: db.date,
  reason: db.reason,
  recoveredAmount: Number(db.recovered_amount || 0),
  outstandingAmount: Number(db.outstanding_amount || 0),
  status: db.status,
  createdBy: db.created_by,
  createdAt: db.created_at,
});

const mapPayrollAdjustment = (db: DbPayrollAdjustment): PayrollAdjustment => ({
  id: db.id,
  payrollRecordId: db.payroll_record_id,
  type: db.type,
  amount: Number(db.amount),
  reason: db.reason,
  createdBy: db.created_by,
  createdAt: db.created_at,
});

const mapPayrollRecord = (db: DbPayrollRecord, adjustments: PayrollAdjustment[] = []): PayrollRecord => ({
  id: db.id,
  userId: db.user_id,
  propertyId: db.property_id,
  payrollMonth: db.payroll_month,
  monthlySalary: Number(db.monthly_salary),
  calendarDays: Number(db.calendar_days),
  dailyRate: Number(db.daily_rate),
  presentDays: Number(db.present_days || 0),
  halfDays: Number(db.half_days || 0),
  weekOffs: Number(db.week_offs || 0),
  carryForwardWeekOffs: Number(db.carry_forward_week_offs || 0),
  paidLeaves: Number(db.paid_leaves || 0),
  absentDays: Number(db.absent_days || 0),
  lopLeaves: Number(db.lop_leaves || 0),
  excessWeekOffs: Number(db.excess_week_offs || 0),
  payableDays: Number(db.payable_days || 0),
  totalLopDays: Number(db.total_lop_days || 0),
  lopDeduction: Number(db.lop_deduction || 0),
  latePenaltyDeduction: Number(db.late_penalty_deduction || 0),
  advanceRecovery: Number(db.advance_recovery || 0),
  otherAdditions: Number(db.other_additions || 0),
  otherDeductions: Number(db.other_deductions || 0),
  grossSalary: Number(db.gross_salary || 0),
  netSalary: Number(db.net_salary || 0),
  excessUnrecoveredDeduction: Number(db.excess_unrecovered_deduction || 0),
  status: db.status || 'calculated',
  paymentStatus: db.payment_status || 'unpaid',
  paymentDate: db.payment_date || null,
  paymentMode: db.payment_mode || null,
  transactionRef: db.transaction_ref || null,
  paymentNotes: db.payment_notes || null,
  paidAmount: Number(db.paid_amount || 0),
  generatedBy: db.generated_by || null,
  generatedAt: db.generated_at,
  approvedBy: db.approved_by || null,
  approvedAt: db.approved_at || null,
  lockedBy: db.locked_by || null,
  lockedAt: db.locked_at || null,
  paidBy: db.paid_by || null,
  paidAt: db.paid_at || null,
  adjustments,
});

const mapAttendance = (db: DbAttendance): AttendanceRecord => {
  // Normalize status for backward compatibility:
  let resolvedStatus: AttendanceStatus = 'present';
  let resolvedShiftStatus: ShiftPunchStatus = 'not_started';

  if (db.status === 'shift_completed') {
    resolvedStatus = 'present';
    resolvedShiftStatus = 'completed';
  } else if (db.status === 'late') {
    resolvedStatus = 'present';
    resolvedShiftStatus = db.clock_out_time ? 'completed' : 'in_progress';
  } else if (
    db.status === 'present' ||
    db.status === 'half_day' ||
    db.status === 'week_off' ||
    db.status === 'on_leave' ||
    db.status === 'absent' ||
    db.status === 'holiday'
  ) {
    resolvedStatus = db.status;
  }

  // Determine shift punch state
  if (db.shift_status) {
    resolvedShiftStatus = db.shift_status as ShiftPunchStatus;
  } else {
    if (db.clock_out_time) {
      resolvedShiftStatus = 'completed';
    } else if (db.clock_in_time) {
      resolvedShiftStatus = 'in_progress';
    } else if (resolvedStatus === 'absent' || resolvedStatus === 'week_off' || resolvedStatus === 'on_leave') {
      resolvedShiftStatus = 'not_started';
    }
  }

  const s1In = db.shift_1_clock_in_time || db.clock_in_time;
  const s1InSelfie = db.shift_1_clock_in_selfie_url || db.clock_in_selfie_url;
  const s1InLat = db.shift_1_clock_in_lat ?? db.clock_in_lat;
  const s1InLng = db.shift_1_clock_in_lng ?? db.clock_in_lng;
  const s1InAcc = db.shift_1_clock_in_accuracy ?? db.clock_in_accuracy;
  const s1InAddr = db.shift_1_clock_in_address || db.clock_in_address;

  const s1Out = db.shift_1_clock_out_time;
  const s1OutSelfie = db.shift_1_clock_out_selfie_url;
  const s1OutLat = db.shift_1_clock_out_lat;
  const s1OutLng = db.shift_1_clock_out_lng;
  const s1OutAcc = db.shift_1_clock_out_accuracy;
  const s1OutAddr = db.shift_1_clock_out_address;
  const s1Worked = db.shift_1_worked_minutes ?? 0;
  const s1Late = db.shift_1_late_minutes ?? 0;
  const s1Status = db.shift_1_status || (s1Out ? 'completed' : s1In ? 'in_progress' : 'not_started');

  const s2In = db.shift_2_clock_in_time;
  const s2InSelfie = db.shift_2_clock_in_selfie_url;
  const s2InLat = db.shift_2_clock_in_lat;
  const s2InLng = db.shift_2_clock_in_lng;
  const s2InAcc = db.shift_2_clock_in_accuracy;
  const s2InAddr = db.shift_2_clock_in_address;

  const s2Out = db.shift_2_clock_out_time;
  const s2OutSelfie = db.shift_2_clock_out_selfie_url;
  const s2OutLat = db.shift_2_clock_out_lat;
  const s2OutLng = db.shift_2_clock_out_lng;
  const s2OutAcc = db.shift_2_clock_out_accuracy;
  const s2OutAddr = db.shift_2_clock_out_address;
  const s2Worked = db.shift_2_worked_minutes ?? 0;
  const s2Late = db.shift_2_late_minutes ?? 0;
  const s2Status = db.shift_2_status || (s2Out ? 'completed' : s2In ? 'in_progress' : 'not_started');

  // Calculate worked minutes & total hours
  let workedMinutes = db.worked_minutes ?? 0;
  if ((s1Worked > 0 || s2Worked > 0) && (!workedMinutes || workedMinutes === 0)) {
    workedMinutes = s1Worked + s2Worked;
  } else if ((!workedMinutes || workedMinutes === 0) && db.clock_in_time && db.clock_out_time) {
    try {
      const [inH, inM] = db.clock_in_time.split(':').map(Number);
      const [outH, outM] = db.clock_out_time.split(':').map(Number);
      if (!isNaN(inH) && !isNaN(outH)) {
        let diff = outH * 60 + outM - (inH * 60 + inM);
        if (diff < 0) diff += 24 * 60; // overnight shift
        workedMinutes = diff;
      }
    } catch {
      // ignore
    }
  }
  const totalHours = db.total_hours ?? (workedMinutes > 0 ? Number((workedMinutes / 60).toFixed(2)) : undefined);

  // Late calculation & penalty normalization
  const lateMinutes = db.late_minutes ?? (db.status === 'late' ? 20 : 0);
  const latePenaltyEligible = db.late_penalty_eligible ?? (lateMinutes > 15);
  const latePenaltyStatus: LatePenaltyStatus =
    db.late_penalty_status && ['none', 'pending', 'approved', 'rejected'].includes(db.late_penalty_status)
      ? (db.late_penalty_status as LatePenaltyStatus)
      : latePenaltyEligible
      ? 'pending'
      : 'none';

  return {
    id: db.id,
    userId: db.user_id,
    date: db.date,
    status: resolvedStatus,
    shiftStatus: resolvedShiftStatus,
    clockInTime: db.clock_in_time || s1In,
    clockInSelfieUrl: db.clock_in_selfie_url || s1InSelfie,
    clockInLat: db.clock_in_lat ?? s1InLat,
    clockInLng: db.clock_in_lng ?? s1InLng,
    clockInAccuracy: db.clock_in_accuracy ?? s1InAcc,
    clockInAddress: db.clock_in_address || s1InAddr,
    clockOutTime: db.clock_out_time || s2Out || s1Out,
    clockOutSelfieUrl: db.clock_out_selfie_url || s2OutSelfie || s1OutSelfie,
    clockOutLat: db.clock_out_lat ?? s2OutLat ?? s1OutLat,
    clockOutLng: db.clock_out_lng ?? s2OutLng ?? s1OutLng,
    clockOutAccuracy: db.clock_out_accuracy ?? s2OutAcc ?? s1OutAcc,
    clockOutAddress: db.clock_out_address || s2OutAddr || s1OutAddr,

    // Shift 1
    shift1ClockInTime: s1In,
    shift1ClockInSelfieUrl: s1InSelfie,
    shift1ClockInLat: s1InLat,
    shift1ClockInLng: s1InLng,
    shift1ClockInAccuracy: s1InAcc,
    shift1ClockInAddress: s1InAddr,
    shift1ClockOutTime: s1Out,
    shift1ClockOutSelfieUrl: s1OutSelfie,
    shift1ClockOutLat: s1OutLat,
    shift1ClockOutLng: s1OutLng,
    shift1ClockOutAccuracy: s1OutAcc,
    shift1ClockOutAddress: s1OutAddr,
    shift1WorkedMinutes: s1Worked,
    shift1LateMinutes: s1Late,
    shift1Status: s1Status,

    // Compatibility aliases
    shift1InTime: s1In,
    shift1InSelfieUrl: s1InSelfie,
    shift1InLat: s1InLat,
    shift1InLng: s1InLng,
    shift1OutTime: s1Out,
    shift1OutSelfieUrl: s1OutSelfie,

    // Shift 2
    shift2ClockInTime: s2In,
    shift2ClockInSelfieUrl: s2InSelfie,
    shift2ClockInLat: s2InLat,
    shift2ClockInLng: s2InLng,
    shift2ClockInAccuracy: s2InAcc,
    shift2ClockInAddress: s2InAddr,
    shift2ClockOutTime: s2Out,
    shift2ClockOutSelfieUrl: s2OutSelfie,
    shift2ClockOutLat: s2OutLat,
    shift2ClockOutLng: s2OutLng,
    shift2ClockOutAccuracy: s2OutAcc,
    shift2ClockOutAddress: s2OutAddr,
    shift2WorkedMinutes: s2Worked,
    shift2LateMinutes: s2Late,
    shift2Status: s2Status,

    // Compatibility aliases
    shift2InTime: s2In,
    shift2InSelfieUrl: s2InSelfie,
    shift2InLat: s2InLat,
    shift2InLng: s2InLng,
    shift2OutTime: s2Out,
    shift2OutSelfieUrl: s2OutSelfie,

    scheduledShiftStart: db.scheduled_shift_start,
    scheduledShiftEnd: db.scheduled_shift_end,
    shift1Start: db.shift_1_start,
    shift1End: db.shift_1_end,
    shift2Start: db.shift_2_start,
    shift2End: db.shift_2_end,
    workedMinutes,
    totalHours,
    lateMinutes,
    latePenaltyEligible,
    latePenaltyStatus,
    latePenaltyAmount: db.late_penalty_amount ?? 0,
    latePenaltyReviewedBy: db.late_penalty_reviewed_by,
    latePenaltyReviewedAt: db.late_penalty_reviewed_at,
    halfDayReason: db.half_day_reason,
    managerAdjusted: db.manager_adjusted ?? false,
    adjustmentReason: db.adjustment_reason,
    markedBy: db.marked_by,
  };
};

const mapTask = (db: DbTask): Task => ({
  id: db.id,
  propertyId: db.property_id,
  createdBy: db.created_by,
  categoryId: db.category_id,
  description: db.description,
  photoUrl: db.photo_url,
  status: db.status,
  lastActionBy: db.last_action_by,
  lastActionNote: db.last_action_note,
});

const mapTaskCategory = (db: DbTaskCategory): TaskCategory => ({
  id: db.id,
  propertyId: db.property_id,
  name: db.name,
});

const mapVoucher = (db: DbVoucher): Voucher => ({
  id: db.id,
  taskId: db.task_id,
  paymentType: db.payment_type,
  amount: db.amount,
  createdBy: db.created_by,
});

const mapWeekOffRequest = (db: DbWeekOffRequest): WeekOffRequest => ({
  id: db.id,
  userId: db.user_id,
  requestedDates: db.requested_dates || [],
  reason: db.reason,
  status: db.status,
  reviewedBy: db.reviewed_by,
});

const mapLeaveRequest = (db: DbLeaveRequest): LeaveRequest => ({
  id: db.id,
  userId: db.user_id,
  startDate: db.start_date,
  endDate: db.end_date,
  leaveType: db.leave_type,
  reason: db.reason,
  status: db.status,
  reviewedBy: db.reviewed_by,
});

const mapAttendanceCorrectionRequest = (
  db: DbAttendanceCorrectionRequest
): AttendanceCorrectionRequest => ({
  id: db.id,
  userId: db.user_id,
  date: db.date,
  punchMissed: db.punch_missed,
  note: db.note,
  status: db.status,
  reviewedBy: db.reviewed_by,
});

// Schema state tracking & detection
let isSchemaPending = false;
const schemaListeners: Array<(pending: boolean) => void> = [];

export function isSchemaMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === 'PGRST116' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  );
}

export function getIsSchemaPending(): boolean {
  return isSchemaPending;
}

export function subscribeSchemaPending(listener: (pending: boolean) => void): () => void {
  schemaListeners.push(listener);
  listener(isSchemaPending);
  return () => {
    const idx = schemaListeners.indexOf(listener);
    if (idx !== -1) schemaListeners.splice(idx, 1);
  };
}

function notifySchemaMissing(_table: string, _err: any) {
  if (!isSchemaPending) {
    isSchemaPending = true;
    schemaListeners.forEach((fn) => fn(true));
  }
}

export const DEFAULT_TASK_CATEGORIES = [
  'Housekeeping & Cleaning',
  'Plumbing & Washrooms',
  'Electrical & Lighting',
  'Carpentry & Furniture',
  'AC, Geyser & Appliances',
  'Locks, Doors & Security',
  'Inventory & Linen Refill',
  'WiFi & Networking',
  'Guest Request / Complaint',
  'General Maintenance',
];

export const dataService = {
  // ==========================================
  // 1. PROPERTIES
  // ==========================================
  async getProperties(): Promise<Property[]> {
    const { data, error } = await supabase.from('properties').select('*').order('name');
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('properties', error);
      console.error('Properties query error:', error.message);
      throw new Error(error.message || 'Failed to fetch properties from database');
    }
    return (data || []).map(mapProperty);
  },

  async getPropertyById(id: string): Promise<Property | null> {
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('properties', error);
      throw new Error(error.message || 'Failed to fetch property from database');
    }
    return data ? mapProperty(data) : null;
  },

  async createProperty(property: Omit<Property, 'id'>): Promise<Property> {
    // Pre-flight sync: ensure current authenticated user has an owner record in public.users
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (authUser) {
        await supabase.from('users').upsert({
          id: authUser.id,
          name: authUser.user_metadata?.name || 'Amit',
          phone: authUser.user_metadata?.phone || authUser.phone || '+91 98765 43210',
          role: 'owner',
        }, { onConflict: 'id' });
      }
    } catch (preErr) {
      console.warn('Pre-flight user sync notice:', preErr);
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        name: property.name,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        geofence_radius_m: property.geofenceRadiusM,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase property insert error:', error);
      throw new Error(error.message || 'Failed to create property in database');
    }

    const createdProp = mapProperty(data);

    // Auto-seed default task categories for the newly created property
    try {
      const categoryRows = DEFAULT_TASK_CATEGORIES.map((name) => ({
        property_id: createdProp.id,
        name,
      }));
      await supabase.from('task_categories').insert(categoryRows);
    } catch (catErr) {
      console.warn('Failed to auto-seed task categories for new property:', catErr);
    }

    return createdProp;
  },

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    const payload: Partial<DbProperty> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.latitude !== undefined) payload.latitude = updates.latitude;
    if (updates.longitude !== undefined) payload.longitude = updates.longitude;
    if (updates.geofenceRadiusM !== undefined) payload.geofence_radius_m = updates.geofenceRadiusM;

    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      notifySchemaMissing('properties', error);
      throw new Error(error.message || 'Failed to update property in database');
    }
    return data ? mapProperty(data) : null;
  },

  async deleteProperty(propertyId: string): Promise<boolean> {
    try {
      // 1. Clean up task dependents for tasks in this property
      try {
        const { data: propTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('property_id', propertyId);
        if (propTasks && propTasks.length > 0) {
          const taskIds = propTasks.map((t) => t.id);
          await supabase.from('task_comments').delete().in('task_id', taskIds);
          await supabase.from('vouchers').delete().in('task_id', taskIds);
        }
      } catch (tErr) {
        console.warn('Task dependents cleanup notice:', tErr);
      }

      // 2. Delete tasks and categories for this property
      try {
        await supabase.from('tasks').delete().eq('property_id', propertyId);
      } catch (tErr) {
        console.warn('Tasks delete notice:', tErr);
      }
      try {
        await supabase.from('task_categories').delete().eq('property_id', propertyId);
      } catch (catErr) {
        console.warn('Task categories delete notice:', catErr);
      }

      // 3. Delete inventory logs & items for this property
      try {
        await supabase.from('inventory_logs').delete().eq('property_id', propertyId);
      } catch (invLogErr) {
        console.warn('Inventory logs delete notice:', invLogErr);
      }
      try {
        await supabase.from('inventory_items').delete().eq('property_id', propertyId);
      } catch (invItemErr) {
        console.warn('Inventory items delete notice:', invItemErr);
      }

      // 4. Delete property records & activity logs
      try {
        await supabase.from('shifts').delete().eq('property_id', propertyId);
        await supabase.from('staff_performance').delete().eq('property_id', propertyId);
        await supabase.from('leaves').delete().eq('property_id', propertyId);
        await supabase.from('payroll_records').delete().eq('property_id', propertyId);
        await supabase.from('geofence_logs').delete().eq('property_id', propertyId);
        await supabase.from('property_locations').delete().eq('property_id', propertyId);
        await supabase.from('notifications').delete().eq('property_id', propertyId);
      } catch (logErr) {
        console.warn('Property sub-records delete notice:', logErr);
      }

      // 5. Unassign users from this property
      try {
        await supabase.from('users').update({ property_id: null }).eq('property_id', propertyId);
      } catch (uErr) {
        console.warn('User unassign notice:', uErr);
      }

      // 6. Delete property itself
      const { error } = await supabase.from('properties').delete().eq('id', propertyId);
      if (error) {
        notifySchemaMissing('properties', error);
        throw new Error(error.message || 'Failed to delete property from database');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('property-updated', { detail: { deletedPropertyId: propertyId } }));
      }

      return true;
    } catch (err) {
      console.error('Failed to delete property:', err);
      throw err;
    }
  },

  async clearAllNonOwnerStaff(): Promise<boolean> {
    try {
      // 1. Fetch all non-owner users
      const { data: usersData, error: userFetchErr } = await supabase.from('users').select('id, role, name');
      if (userFetchErr) {
        console.error('Error fetching users for staff clearing:', userFetchErr);
      }
      const staffToDelete = (usersData || []).filter((u) => u.role !== 'owner');
      const staffIds = staffToDelete.map((u) => u.id);

      if (staffIds.length === 0) {
        return true;
      }

      // 2. Clear FK references pointing to staff in relational tables
      try { await supabase.from('attendance_records').update({ marked_by: null }).in('marked_by', staffIds); } catch (_) {}
      try { await supabase.from('leave_requests').update({ reviewed_by: null }).in('reviewed_by', staffIds); } catch (_) {}
      try { await supabase.from('week_off_requests').update({ reviewed_by: null }).in('reviewed_by', staffIds); } catch (_) {}
      try { await supabase.from('attendance_correction_requests').update({ reviewed_by: null }).in('reviewed_by', staffIds); } catch (_) {}
      try { await supabase.from('tasks').update({ last_action_by: null }).in('last_action_by', staffIds); } catch (_) {}
      try { await supabase.from('tasks').update({ assigned_to: null }).in('assigned_to', staffIds); } catch (_) {}
      try { await supabase.from('vouchers').update({ approved_by: null }).in('approved_by', staffIds); } catch (_) {}
      try { await supabase.from('salary_advances').update({ created_by: null }).in('created_by', staffIds); } catch (_) {}
      try { await supabase.from('salary_history').update({ created_by: null }).in('created_by', staffIds); } catch (_) {}
      try { await supabase.from('payroll_adjustments').update({ created_by: null }).in('created_by', staffIds); } catch (_) {}
      try { await supabase.from('payroll_records').update({ generated_by: null, approved_by: null, locked_by: null, paid_by: null }).in('generated_by', staffIds); } catch (_) {}
      try { await supabase.from('payroll_records').update({ approved_by: null }).in('approved_by', staffIds); } catch (_) {}
      try { await supabase.from('payroll_records').update({ locked_by: null }).in('locked_by', staffIds); } catch (_) {}
      try { await supabase.from('payroll_records').update({ paid_by: null }).in('paid_by', staffIds); } catch (_) {}

      // 3. Delete tasks created by staff (plus their comments & vouchers)
      try {
        const { data: staffTasks } = await supabase.from('tasks').select('id').in('created_by', staffIds);
        if (staffTasks && staffTasks.length > 0) {
          const taskIds = staffTasks.map((t) => t.id);
          try { await supabase.from('task_comments').delete().in('task_id', taskIds); } catch (_) {}
          try { await supabase.from('vouchers').delete().in('task_id', taskIds); } catch (_) {}
          try { await supabase.from('tasks').delete().in('id', taskIds); } catch (_) {}
        }
      } catch (_) {}

      // 4. Delete payroll adjustments associated with staff payroll records
      try {
        const { data: staffPayrolls } = await supabase.from('payroll_records').select('id').in('user_id', staffIds);
        if (staffPayrolls && staffPayrolls.length > 0) {
          const pIds = staffPayrolls.map((p) => p.id);
          try { await supabase.from('payroll_adjustments').delete().in('payroll_record_id', pIds); } catch (_) {}
        }
      } catch (_) {}

      // 5. Delete all user-specific child records & logs
      try { await supabase.from('payroll_adjustments').delete().in('created_by', staffIds); } catch (_) {}
      try { await supabase.from('payroll_records').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('salary_advances').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('salary_history').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('task_comments').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('vouchers').delete().in('created_by', staffIds); } catch (_) {}
      try { await supabase.from('attendance_records').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('leave_requests').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('week_off_requests').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('attendance_correction_requests').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('shifts').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('staff_performance').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('leaves').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('geofence_logs').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('notifications').delete().in('user_id', staffIds); } catch (_) {}
      try { await supabase.from('inventory_logs').delete().in('created_by', staffIds); } catch (_) {}

      // 6. Delete each staff user individually
      for (const staffId of staffIds) {
        try {
          await supabase.from('users').delete().eq('id', staffId);
        } catch (delErr) {
          console.warn(`User ${staffId} individual delete error:`, delErr);
        }
      }

      // 7. Bulk delete non-owner rows
      const { error: bulkErr } = await supabase.from('users').delete().neq('role', 'owner');
      if (bulkErr) {
        console.warn('Bulk users delete notice:', bulkErr);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff-updated', { detail: { cleared: true } }));
      }

      return true;
    } catch (err) {
      console.error('Failed to clear staff members:', err);
      throw err;
    }
  },

  async clearAllPropertiesAndStaff(keepOwner: boolean = true): Promise<boolean> {
    try {
      // 1. Clear all non-owner staff & related staff logs first
      await dataService.clearAllNonOwnerStaff();

      // 2. Clear all operational tables completely
      const deleteTableSafely = async (tableName: string) => {
        try {
          const { data: rows } = await supabase.from(tableName).select('id');
          if (rows && rows.length > 0) {
            const ids = rows.map((r: any) => r.id);
            await supabase.from(tableName).delete().in('id', ids);
          }
        } catch (tableErr) {
          console.warn(`Table cleanup notice for ${tableName}:`, tableErr);
        }
      };

      await deleteTableSafely('task_comments');
      await deleteTableSafely('vouchers');
      await deleteTableSafely('tasks');
      await deleteTableSafely('task_categories');
      await deleteTableSafely('attendance_records');
      await deleteTableSafely('attendance_correction_requests');
      await deleteTableSafely('week_off_requests');
      await deleteTableSafely('leave_requests');
      await deleteTableSafely('leaves');
      await deleteTableSafely('shifts');
      await deleteTableSafely('staff_performance');
      await deleteTableSafely('salary_history');
      await deleteTableSafely('payroll_records');
      await deleteTableSafely('geofence_logs');
      await deleteTableSafely('inventory_logs');
      await deleteTableSafely('inventory_items');
      await deleteTableSafely('property_locations');
      await deleteTableSafely('notifications');

      // 3. Clear property_id for remaining owner
      try {
        await supabase.from('users').update({ property_id: null }).eq('role', 'owner');
      } catch (ownerUpdateErr) {
        console.warn('Owner update notice:', ownerUpdateErr);
      }

      // 4. Delete all properties
      const { data: allProps } = await supabase.from('properties').select('id');
      if (allProps && allProps.length > 0) {
        const propIds = allProps.map((p) => p.id);
        for (const pId of propIds) {
          try {
            await supabase.from('properties').delete().eq('id', pId);
          } catch (propErr) {
            console.warn(`Property ${pId} delete notice:`, propErr);
          }
        }
        await supabase.from('properties').delete().in('id', propIds);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('property-updated', { detail: { cleared: true } }));
        window.dispatchEvent(new CustomEvent('staff-updated', { detail: { cleared: true } }));
      }

      return true;
    } catch (err) {
      console.error('Failed to clear database data:', err);
      throw err;
    }
  },

  // ==========================================
  // 2. USERS
  // ==========================================
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').neq('is_active', false).order('name');
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('users', error);
      console.error('Users query error:', error.message);
      throw new Error(error.message || 'Failed to fetch users from database');
    }
    return (data || []).map(mapUser);
  },

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('users', error);
      throw new Error(error.message || 'Failed to fetch user from database');
    }
    return data ? mapUser(data) : null;
  },

  async getUsersByProperty(propertyId: string): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').eq('property_id', propertyId).neq('is_active', false);
    if (error) {
      throw new Error(error.message || 'Failed to fetch users for property');
    }
    return (data || []).map(mapUser);
  },

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').eq('role', role).neq('is_active', false);
    if (error) {
      throw new Error(error.message || 'Failed to fetch users by role');
    }
    return (data || []).map(mapUser);
  },

  async createUser(user: Omit<User, 'id'> & { id?: string }): Promise<User> {
    const userId = user.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
    
    // Determine effective monthly salary
    const fallbackSalary = await dataService.getEmployeeMonthlySalary(user as User);
    const initialSalary = user.monthlySalary && user.monthlySalary > 0 ? user.monthlySalary : fallbackSalary;

    const shift1StartVal = user.shift1Start || user.shiftStart || null;
    const shift1EndVal = user.shift1End || user.shiftEnd || null;
    const shift2StartVal = user.shift2Start || null;
    const shift2EndVal = user.shift2End || null;

    let createdDbUser: DbUser | null = null;

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...(userId ? { id: userId } : {}),
          name: user.name,
          phone: user.phone,
          role: user.role,
          property_id: user.propertyId,
          staff_type: user.staffType,
          shift_start: user.shiftStart || shift1StartVal,
          shift_end: user.shiftEnd || shift1EndVal,
          shift_1_start: shift1StartVal,
          shift_1_end: shift1EndVal,
          shift_2_start: shift2StartVal,
          shift_2_end: shift2EndVal,
          monthly_salary: initialSalary,
          joining_date: user.joiningDate || new Date().toISOString().split('T')[0],
          is_active: user.isActive !== false,
        })
        .select()
        .single();

      if (error) {
        // Fallback: If is_active, monthly_salary, shift_1_*, or joining_date columns don't exist yet on users table, retry with standard core columns
        const isColumnMissing =
          error.code === '42703' ||
          error.code === 'PGRST204' ||
          error.message?.includes('is_active') ||
          error.message?.includes('monthly_salary') ||
          error.message?.includes('joining_date') ||
          error.message?.includes('shift_1') ||
          error.message?.includes('shift_2') ||
          error.message?.toLowerCase().includes('schema cache') ||
          error.message?.toLowerCase().includes('could not find the');

        if (isColumnMissing) {
          const { data: retryData, error: retryErr } = await supabase
            .from('users')
            .insert({
              ...(userId ? { id: userId } : {}),
              name: user.name,
              phone: user.phone,
              role: user.role,
              property_id: user.propertyId,
              staff_type: user.staffType,
              shift_start: user.shiftStart || shift1StartVal,
              shift_end: user.shiftEnd || (shift2EndVal || shift1EndVal),
            })
            .select()
            .single();
          if (retryErr) throw retryErr;
          createdDbUser = {
            ...retryData,
            shift_1_start: shift1StartVal,
            shift_1_end: shift1EndVal,
            shift_2_start: shift2StartVal,
            shift_2_end: shift2EndVal,
            monthly_salary: initialSalary,
            is_active: user.isActive !== false,
            joining_date: user.joiningDate,
          };
        } else {
          throw error;
        }
      } else {
        createdDbUser = data;
      }
    } catch (error: any) {
      notifySchemaMissing('users', error);
      if (
        error.code === '23505' ||
        error.message?.includes('users_phone_key') ||
        error.message?.toLowerCase().includes('duplicate key')
      ) {
        throw new Error(
          `Another account already exists with the phone number "${user.phone}". Please use a different phone number.`
        );
      }
      throw new Error(error.message || 'Failed to create user in database');
    }

    const createdUser = mapUser(createdDbUser!);

    // Record initial salary in salary_history table
    try {
      await supabase.from('salary_history').insert({
        user_id: createdUser.id,
        monthly_salary: initialSalary,
        effective_from: user.joiningDate || new Date().toISOString().split('T')[0],
        effective_to: null,
        is_active: true,
        notes: 'Initial salary on onboarding',
      });
    } catch (salErr) {
      console.warn('Salary history creation notice:', salErr);
    }

    return createdUser;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const payload: Partial<DbUser> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.propertyId !== undefined) payload.property_id = updates.propertyId;
    if (updates.staffType !== undefined) payload.staff_type = updates.staffType;
    if (updates.shiftStart !== undefined) payload.shift_start = updates.shiftStart;
    if (updates.shiftEnd !== undefined) payload.shift_end = updates.shiftEnd;
    if (updates.shift1Start !== undefined) {
      payload.shift_1_start = updates.shift1Start;
      if (updates.shiftStart === undefined) payload.shift_start = updates.shift1Start;
    }
    if (updates.shift1End !== undefined) {
      payload.shift_1_end = updates.shift1End;
      if (updates.shiftEnd === undefined && updates.shift2End === undefined) payload.shift_end = updates.shift1End;
    }
    if (updates.shift2Start !== undefined) payload.shift_2_start = updates.shift2Start;
    if (updates.shift2End !== undefined) {
      payload.shift_2_end = updates.shift2End;
      if (updates.shiftEnd === undefined && updates.shift2End) payload.shift_end = updates.shift2End;
    }
    if (updates.monthlySalary !== undefined) payload.monthly_salary = updates.monthlySalary;
    if (updates.joiningDate !== undefined) payload.joining_date = updates.joiningDate;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    let data: any = null;
    try {
      const res = await supabase
        .from('users')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (res.error) {
        const isColumnMissing =
          res.error.code === '42703' ||
          res.error.code === 'PGRST204' ||
          res.error.message?.includes('is_active') ||
          res.error.message?.includes('monthly_salary') ||
          res.error.message?.includes('joining_date') ||
          res.error.message?.includes('shift_1') ||
          res.error.message?.includes('shift_2') ||
          res.error.message?.toLowerCase().includes('schema cache') ||
          res.error.message?.toLowerCase().includes('could not find the');

        if (isColumnMissing) {
          // Remove new columns if not yet migrated in Supabase
          delete payload.monthly_salary;
          delete payload.joining_date;
          delete payload.is_active;
          delete payload.shift_1_start;
          delete payload.shift_1_end;
          delete payload.shift_2_start;
          delete payload.shift_2_end;
          const retryRes = await supabase
            .from('users')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
          if (retryRes.error) throw retryRes.error;
          data = {
            ...retryRes.data,
            shift_1_start: updates.shift1Start ?? (retryRes.data as any)?.shift_1_start,
            shift_1_end: updates.shift1End ?? (retryRes.data as any)?.shift_1_end,
            shift_2_start: updates.shift2Start ?? (retryRes.data as any)?.shift_2_start,
            shift_2_end: updates.shift2End ?? (retryRes.data as any)?.shift_2_end,
            monthly_salary: updates.monthlySalary,
            is_active: updates.isActive,
            joining_date: updates.joiningDate,
          };
        } else {
          throw res.error;
        }
      } else {
        data = res.data;
      }
    } catch (error: any) {
      notifySchemaMissing('users', error);
      if (
        error.code === '23505' ||
        error.message?.includes('users_phone_key') ||
        error.message?.toLowerCase().includes('duplicate key')
      ) {
        throw new Error(
          `Another account already exists with this phone number. Please use a unique phone number.`
        );
      }
      throw new Error(error.message || 'Failed to update user in database');
    }

    return data ? mapUser(data) : null;
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      // 1. Check if user is an owner
      const { data: userCheck } = await supabase.from('users').select('role, phone').eq('id', id).maybeSingle();
      if (userCheck?.role === 'owner') {
        throw new Error('Cannot delete an Owner account.');
      }

      // 2. Step-by-step relational cleanup to prevent foreign key constraint violations
      // A. Nullify nullable reviewer/updater references where this user acted
      try { await supabase.from('attendance_records').update({ marked_by: null }).eq('marked_by', id); } catch (_) {}
      try { await supabase.from('leave_requests').update({ reviewed_by: null }).eq('reviewed_by', id); } catch (_) {}
      try { await supabase.from('week_off_requests').update({ reviewed_by: null }).eq('reviewed_by', id); } catch (_) {}
      try { await supabase.from('attendance_correction_requests').update({ reviewed_by: null }).eq('reviewed_by', id); } catch (_) {}
      try { await supabase.from('tasks').update({ last_action_by: null }).eq('last_action_by', id); } catch (_) {}
      try { await supabase.from('vouchers').update({ approved_by: null }).eq('approved_by', id); } catch (_) {}
      try { await supabase.from('salary_advances').update({ created_by: null }).eq('created_by', id); } catch (_) {}
      try { await supabase.from('salary_history').update({ created_by: null }).eq('created_by', id); } catch (_) {}
      try { await supabase.from('payroll_adjustments').update({ created_by: null }).eq('created_by', id); } catch (_) {}
      try { await supabase.from('payroll_records').update({ generated_by: null }).eq('generated_by', id); } catch (_) {}
      try { await supabase.from('payroll_records').update({ approved_by: null }).eq('approved_by', id); } catch (_) {}
      try { await supabase.from('payroll_records').update({ locked_by: null }).eq('locked_by', id); } catch (_) {}
      try { await supabase.from('payroll_records').update({ paid_by: null }).eq('paid_by', id); } catch (_) {}

      // B. Delete vouchers and comments attached to any tasks created by this user
      try {
        const { data: userTasks } = await supabase.from('tasks').select('id').eq('created_by', id);
        if (userTasks && userTasks.length > 0) {
          const taskIds = userTasks.map((t) => t.id);
          try { await supabase.from('task_comments').delete().in('task_id', taskIds); } catch (_) {}
          try { await supabase.from('vouchers').delete().in('task_id', taskIds); } catch (_) {}
          try { await supabase.from('tasks').delete().in('id', taskIds); } catch (_) {}
        }
      } catch (tErr) {
        console.warn('Voucher cleanup for user tasks notice:', tErr);
      }

      // C. Delete payroll adjustments for user's payroll records before deleting payroll records
      try {
        const { data: userPayrolls } = await supabase.from('payroll_records').select('id').eq('user_id', id);
        if (userPayrolls && userPayrolls.length > 0) {
          const pIds = userPayrolls.map((p) => p.id);
          try { await supabase.from('payroll_adjustments').delete().in('payroll_record_id', pIds); } catch (_) {}
        }
      } catch (pErr) {
        console.warn('Payroll adjustments cleanup notice:', pErr);
      }

      // D. Delete records & logs explicitly created for/by this user (especially RESTRICT ones)
      try { await supabase.from('payroll_adjustments').delete().eq('created_by', id); } catch (_) {}
      try { await supabase.from('payroll_records').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('salary_advances').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('salary_history').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('task_comments').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('vouchers').delete().eq('created_by', id); } catch (_) {}
      try { await supabase.from('attendance_records').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('leave_requests').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('week_off_requests').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('attendance_correction_requests').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('shifts').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('staff_performance').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('leaves').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('geofence_logs').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('notifications').delete().eq('user_id', id); } catch (_) {}
      try { await supabase.from('inventory_logs').delete().eq('created_by', id); } catch (_) {}

      // 3. Delete the user row from public.users (Hard Delete)
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        throw new Error(error.message || 'Failed to hard delete user from database');
      }

      // 3. Clear any cached dev session if it belonged to this deleted user
      if (typeof window !== 'undefined') {
        try {
          const devUserStr = localStorage.getItem('hostelops_dev_auth_user');
          if (devUserStr) {
            const devUser = JSON.parse(devUserStr);
            if (devUser?.id === id) {
              localStorage.removeItem('hostelops_dev_auth_user');
            }
          }
        } catch {
          // ignore
        }
        window.dispatchEvent(new CustomEvent('staff-updated', { detail: { deletedUserId: id } }));
      }

      return true;
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  },

  // ==========================================
  // 3. ATTENDANCE
  // ==========================================
  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase.from('attendance_records').select('*');
      if (error) {
        notifySchemaMissing('attendance_records', error);
        return [];
      }
      return (data || []).map(mapAttendance);
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return [];
    }
  },

  async getAttendanceByUser(userId: string): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('attendance_records', error);
        return [];
      }
      return (data || []).map(mapAttendance);
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return [];
    }
  },

  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', date);
      if (error) {
        notifySchemaMissing('attendance_records', error);
        return [];
      }
      return (data || []).map(mapAttendance);
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return [];
    }
  },

  async getAttendanceByUserAndDate(userId: string, date: string): Promise<AttendanceRecord | null> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('attendance_records', error);
        return null;
      }
      return data ? mapAttendance(data) : null;
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return null;
    }
  },

  async markAttendance(
    record: Omit<AttendanceRecord, 'id'> & { id?: string }
  ): Promise<AttendanceRecord> {
    try {
      let markedBy = record.markedBy || null;
      if (markedBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', markedBy)
            .maybeSingle();
          if (!userExists) {
            markedBy = null;
          }
        } catch {
          // continue with provided
        }
      }

      // Fetch user shift details if scheduled shifts not provided
      let shiftStart = record.scheduledShiftStart || null;
      let shiftEnd = record.scheduledShiftEnd || null;
      let shift1Start = record.shift1Start || null;
      let shift1End = record.shift1End || null;
      let shift2Start = record.shift2Start || null;
      let shift2End = record.shift2End || null;

      if ((!shiftStart || !shift1Start) && record.userId) {
        try {
          const { data: u } = await supabase
            .from('users')
            .select('shift_start, shift_end, shift_1_start, shift_1_end, shift_2_start, shift_2_end')
            .eq('id', record.userId)
            .maybeSingle();
          if (u) {
            shiftStart = shiftStart || u.shift_start;
            shiftEnd = shiftEnd || u.shift_end;
            shift1Start = shift1Start || u.shift_1_start || u.shift_start;
            shift1End = shift1End || u.shift_1_end || u.shift_end;
            shift2Start = shift2Start || u.shift_2_start;
            shift2End = shift2End || u.shift_2_end;
          }
        } catch {
          // ignore
        }
      }

      // Calculate Shift 1 worked minutes
      let s1Worked = record.shift1WorkedMinutes ?? 0;
      const s1In = record.shift1ClockInTime || record.shift1InTime || record.clockInTime;
      const s1Out = record.shift1ClockOutTime || record.shift1OutTime;
      if ((!s1Worked || s1Worked === 0) && s1In && s1Out) {
        try {
          const [inH, inM] = s1In.split(':').map(Number);
          const [outH, outM] = s1Out.split(':').map(Number);
          if (!isNaN(inH) && !isNaN(outH)) {
            let diff = outH * 60 + outM - (inH * 60 + inM);
            if (diff < 0) diff += 24 * 60;
            s1Worked = diff;
          }
        } catch {}
      }

      // Calculate Shift 2 worked minutes
      let s2Worked = record.shift2WorkedMinutes ?? 0;
      const s2In = record.shift2ClockInTime || record.shift2InTime;
      const s2Out = record.shift2ClockOutTime || record.shift2OutTime;
      if ((!s2Worked || s2Worked === 0) && s2In && s2Out) {
        try {
          const [inH, inM] = s2In.split(':').map(Number);
          const [outH, outM] = s2Out.split(':').map(Number);
          if (!isNaN(inH) && !isNaN(outH)) {
            let diff = outH * 60 + outM - (inH * 60 + inM);
            if (diff < 0) diff += 24 * 60;
            s2Worked = diff;
          }
        } catch {}
      }

      // Calculate total worked minutes & total hours
      let workedMinutes = record.workedMinutes ?? 0;
      if (s1Worked > 0 || s2Worked > 0) {
        workedMinutes = s1Worked + s2Worked;
      } else if ((!workedMinutes || workedMinutes === 0) && record.clockInTime && record.clockOutTime) {
        try {
          const [inH, inM] = record.clockInTime.split(':').map(Number);
          const [outH, outM] = record.clockOutTime.split(':').map(Number);
          if (!isNaN(inH) && !isNaN(outH)) {
            let diff = outH * 60 + outM - (inH * 60 + inM);
            if (diff < 0) diff += 24 * 60;
            workedMinutes = diff;
          }
        } catch {}
      }
      const totalHours = Number((workedMinutes / 60).toFixed(2));

      // Calculate late minutes & penalty eligibility (checking Shift 1 start)
      let lateMinutes = record.lateMinutes ?? 0;
      let latePenaltyEligible = record.latePenaltyEligible ?? false;
      let latePenaltyStatus: LatePenaltyStatus = record.latePenaltyStatus ?? 'none';

      const checkInTime = s1In || record.clockInTime;
      const checkStartTime = shift1Start || shiftStart;
      if (checkInTime && checkStartTime) {
        try {
          const [punchH, punchM] = checkInTime.split(':').map(Number);
          const [schedH, schedM] = checkStartTime.split(':').map(Number);
          if (!isNaN(punchH) && !isNaN(schedH)) {
            const punchTotal = punchH * 60 + punchM;
            const schedTotal = schedH * 60 + schedM;
            const diff = punchTotal - schedTotal;
            if (diff > 0) {
              lateMinutes = diff;
              if (diff > 15) {
                latePenaltyEligible = true;
                if (latePenaltyStatus === 'none') {
                  latePenaltyStatus = 'pending';
                }
              }
            } else {
              lateMinutes = 0;
              latePenaltyEligible = false;
              latePenaltyStatus = 'none';
            }
          }
        } catch {}
      }

      // Determine shift status
      let shiftStatus: ShiftPunchStatus = record.shiftStatus;
      if (!shiftStatus) {
        if (s2Out || (s1Out && !shift2Start)) {
          shiftStatus = 'completed';
        } else if (s1In || s2In || record.clockInTime) {
          shiftStatus = 'in_progress';
        } else {
          shiftStatus = 'not_started';
        }
      }

      // Auto-suggest attendance outcome if not manually adjusted
      let resolvedStatus: AttendanceStatus = record.status;
      if (!resolvedStatus || resolvedStatus === 'unmarked' as any) {
        if (shift2Start) {
          // Split shift staff
          const s1Done = Boolean(s1In && s1Out);
          const s2Done = Boolean(s2In && s2Out);
          if (s1Done && s2Done) {
            resolvedStatus = 'present';
          } else if (s1Done || s2Done || s1In || s2In) {
            resolvedStatus = 'half_day';
          } else {
            resolvedStatus = 'absent';
          }
        } else {
          // Single shift staff
          resolvedStatus = (s1In || record.clockInTime) ? 'present' : 'absent';
        }
      }

      const basicPayload: Record<string, any> = {
        user_id: record.userId,
        date: record.date,
        clock_in_time: s1In || record.clockInTime || null,
        clock_in_selfie_url: record.shift1ClockInSelfieUrl || record.shift1InSelfieUrl || record.clockInSelfieUrl || null,
        clock_in_lat: record.shift1ClockInLat ?? record.shift1InLat ?? record.clockInLat ?? null,
        clock_in_lng: record.shift1ClockInLng ?? record.shift1InLng ?? record.clockInLng ?? null,
        clock_out_time: s2Out || s1Out || record.clockOutTime || null,
        clock_out_selfie_url: record.shift2ClockOutSelfieUrl || record.shift2OutSelfieUrl || record.shift1ClockOutSelfieUrl || record.shift1OutSelfieUrl || record.clockOutSelfieUrl || null,
        status: resolvedStatus,
        shift_status: shiftStatus,
        scheduled_shift_start: shiftStart || shift1Start,
        scheduled_shift_end: shiftEnd || shift2End || shift1End,
        worked_minutes: workedMinutes,
        late_minutes: lateMinutes,
        late_penalty_eligible: latePenaltyEligible,
        late_penalty_status: latePenaltyStatus,
        late_penalty_amount: record.latePenaltyAmount ?? 0,
        late_penalty_reviewed_by: record.latePenaltyReviewedBy || null,
        late_penalty_reviewed_at: record.latePenaltyReviewedAt || null,
        half_day_reason: record.halfDayReason || null,
        manager_adjusted: record.managerAdjusted ?? false,
        adjustment_reason: record.adjustmentReason || null,
        marked_by: markedBy,
      };

      const fullPayload: Record<string, any> = {
        ...basicPayload,
        // Shift 1 columns
        shift_1_clock_in_time: s1In || null,
        shift_1_clock_in_selfie_url: record.shift1ClockInSelfieUrl || record.shift1InSelfieUrl || record.clockInSelfieUrl || null,
        shift_1_clock_in_lat: record.shift1ClockInLat ?? record.shift1InLat ?? record.clockInLat ?? null,
        shift_1_clock_in_lng: record.shift1ClockInLng ?? record.shift1InLng ?? record.clockInLng ?? null,
        shift_1_clock_in_accuracy: record.shift1ClockInAccuracy ?? record.clockInAccuracy ?? null,
        shift_1_clock_in_address: record.shift1ClockInAddress ?? record.clockInAddress ?? null,
        shift_1_clock_out_time: s1Out || null,
        shift_1_clock_out_selfie_url: record.shift1ClockOutSelfieUrl || record.shift1OutSelfieUrl || null,
        shift_1_clock_out_lat: record.shift1ClockOutLat ?? null,
        shift_1_clock_out_lng: record.shift1ClockOutLng ?? null,
        shift_1_clock_out_accuracy: record.shift1ClockOutAccuracy ?? null,
        shift_1_clock_out_address: record.shift1ClockOutAddress ?? null,
        shift_1_worked_minutes: s1Worked,
        shift_1_late_minutes: lateMinutes,
        shift_1_status: s1Out ? 'completed' : s1In ? 'in_progress' : 'not_started',

        // Shift 2 columns
        shift_2_clock_in_time: s2In || null,
        shift_2_clock_in_selfie_url: record.shift2ClockInSelfieUrl || record.shift2InSelfieUrl || null,
        shift_2_clock_in_lat: record.shift2ClockInLat ?? record.shift2InLat ?? null,
        shift_2_clock_in_lng: record.shift2ClockInLng ?? record.shift2InLng ?? null,
        shift_2_clock_in_accuracy: record.shift2ClockInAccuracy ?? null,
        shift_2_clock_in_address: record.shift2ClockInAddress ?? null,
        shift_2_clock_out_time: s2Out || null,
        shift_2_clock_out_selfie_url: record.shift2ClockOutSelfieUrl || record.shift2OutSelfieUrl || null,
        shift_2_clock_out_lat: record.shift2ClockOutLat ?? null,
        shift_2_clock_out_lng: record.shift2ClockOutLng ?? null,
        shift_2_clock_out_accuracy: record.shift2ClockOutAccuracy ?? null,
        shift_2_clock_out_address: record.shift2ClockOutAddress ?? null,
        shift_2_worked_minutes: s2Worked,
        shift_2_late_minutes: 0,
        shift_2_status: s2Out ? 'completed' : s2In ? 'in_progress' : 'not_started',
      };

      // Try saving with full split columns first
      let saveRes;
      if (record.id) {
        saveRes = await supabase
          .from('attendance_records')
          .upsert({ id: record.id, ...fullPayload })
          .select()
          .single();
      } else {
        saveRes = await supabase
          .from('attendance_records')
          .upsert(fullPayload, { onConflict: 'user_id,date' })
          .select()
          .single();
      }

      // If split columns don't exist yet in Supabase, fallback to basicPayload
      if (saveRes.error && (isSchemaMissingError(saveRes.error) || saveRes.error.code === '42703' || saveRes.error.message?.includes('does not exist'))) {
        console.warn('Split shift columns not yet in attendance_records, falling back to standard columns');
        if (record.id) {
          saveRes = await supabase
            .from('attendance_records')
            .upsert({ id: record.id, ...basicPayload })
            .select()
            .single();
        } else {
          saveRes = await supabase
            .from('attendance_records')
            .upsert(basicPayload, { onConflict: 'user_id,date' })
            .select()
            .single();
        }
      }

      // Handle FK constraints retry if needed
      if (saveRes.error) {
        if (
          saveRes.error.message?.includes('attendance_records_marked_by_fkey') ||
          saveRes.error.message?.includes('foreign key constraint')
        ) {
          const fallbackPayload = { ...basicPayload, marked_by: null, late_penalty_reviewed_by: null };
          const retryRes = record.id
            ? await supabase.from('attendance_records').upsert({ id: record.id, ...fallbackPayload }).select().single()
            : await supabase.from('attendance_records').upsert(fallbackPayload, { onConflict: 'user_id,date' }).select().single();
          if (!retryRes.error && retryRes.data) {
            return mapAttendance(retryRes.data);
          }
        }
        notifySchemaMissing('attendance_records', saveRes.error);
        throw new Error(saveRes.error.message || 'Failed to mark attendance');
      }

      return mapAttendance(saveRes.data);
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      throw err;
    }
  },

  async reviewLatePenalty(
    recordId: string,
    action: 'approved' | 'rejected',
    reviewerId: string,
    penaltyAmount: number = 0
  ): Promise<AttendanceRecord | null> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          late_penalty_status: action,
          late_penalty_amount: action === 'approved' ? penaltyAmount : 0,
          late_penalty_reviewed_by: reviewerId,
          late_penalty_reviewed_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();
      if (error) {
        throw new Error(error.message || 'Failed to review late penalty');
      }
      return data ? mapAttendance(data) : null;
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      throw err;
    }
  },

  // ==========================================
  // 4. WEEK OFF REQUESTS
  // ==========================================
  async getWeekOffRequests(): Promise<WeekOffRequest[]> {
    try {
      const { data, error } = await supabase.from('week_off_requests').select('*');
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        return [];
      }
      return (data || []).map(mapWeekOffRequest);
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      return [];
    }
  },

  async getWeekOffRequestsByUser(userId: string): Promise<WeekOffRequest[]> {
    try {
      const { data, error } = await supabase
        .from('week_off_requests')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        return [];
      }
      return (data || []).map(mapWeekOffRequest);
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      return [];
    }
  },

  async createWeekOffRequest(request: Omit<WeekOffRequest, 'id'>): Promise<WeekOffRequest> {
    try {
      const { data, error } = await supabase
        .from('week_off_requests')
        .insert({
          user_id: request.userId,
          requested_dates: request.requestedDates,
          reason: request.reason,
          status: request.status,
          reviewed_by: request.reviewedBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        throw new Error(error.message || 'Failed to create week off request');
      }
      return mapWeekOffRequest(data);
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      throw err;
    }
  },

  async updateWeekOffRequestStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string | null,
    reason?: string | null
  ): Promise<WeekOffRequest | null> {
    try {
      let finalReviewedBy = reviewedBy;
      if (finalReviewedBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', finalReviewedBy)
            .maybeSingle();
          if (!userExists) finalReviewedBy = null;
        } catch {}
      }

      const payload: Partial<DbWeekOffRequest> = {
        status,
        reviewed_by: finalReviewedBy,
      };
      if (reason !== undefined) payload.reason = reason;

      const { data, error } = await supabase
        .from('week_off_requests')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        if (error.message?.includes('foreign key constraint') || error.message?.includes('_fkey')) {
          const retryRes = await supabase
            .from('week_off_requests')
            .update({ ...payload, reviewed_by: null })
            .eq('id', id)
            .select()
            .single();
          if (!retryRes.error && retryRes.data) {
            return mapWeekOffRequest(retryRes.data);
          }
        }
        throw new Error(error.message || 'Failed to update week off request');
      }
      return data ? mapWeekOffRequest(data) : null;
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      throw err;
    }
  },

  async getCarriedForwardWeekOffBalance(userId: string): Promise<number> {
    try {
      const records = await this.getAttendanceByUser(userId);
      const today = new Date();
      const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      const priorMonthsSet = new Set<string>();
      records.forEach((r) => {
        const ym = r.date.substring(0, 7);
        if (ym < currentYearMonth) {
          priorMonthsSet.add(ym);
        }
      });

      let carriedForwardBalance = 0;
      priorMonthsSet.forEach((ym) => {
        const usedInMonth = records.filter(
          (r) => r.date.startsWith(ym) && r.status === 'week_off'
        ).length;
        const unusedInMonth = Math.max(0, 4 - usedInMonth);
        carriedForwardBalance += unusedInMonth;
      });

      return carriedForwardBalance;
    } catch {
      return 0;
    }
  },

  async getEmployeeMonthlySalary(user: User): Promise<number> {
    if (user.role === 'inventory_manager') return 25000;
    if (user.role === 'manager') return 35000;
    if (user.role === 'owner') return 50000;

    switch (user.staffType?.toLowerCase()) {
      case 'front desk':
        return 20000;
      case 'kitchen':
        return 18000;
      case 'maintenance':
        return 17000;
      case 'housekeeping':
        return 15000;
      case 'security':
        return 16000;
      default:
        return 16000;
    }
  },

  // ==========================================
  // 5. LEAVE REQUESTS
  // ==========================================
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await supabase.from('leave_requests').select('*');
      if (error) {
        notifySchemaMissing('leave_requests', error);
        return [];
      }
      return (data || []).map(mapLeaveRequest);
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      return [];
    }
  },

  async getLeaveRequestsByUser(userId: string): Promise<LeaveRequest[]> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('leave_requests', error);
        return [];
      }
      return (data || []).map(mapLeaveRequest);
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      return [];
    }
  },

  async createLeaveRequest(request: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: request.userId,
          start_date: request.startDate,
          end_date: request.endDate,
          leave_type: request.leaveType,
          reason: request.reason,
          status: request.status,
          reviewed_by: request.reviewedBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('leave_requests', error);
        throw new Error(error.message || 'Failed to create leave request');
      }
      return mapLeaveRequest(data);
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      throw err;
    }
  },

  async updateLeaveRequestStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string | null,
    reason?: string
  ): Promise<LeaveRequest | null> {
    try {
      let finalReviewedBy = reviewedBy;
      if (finalReviewedBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', finalReviewedBy)
            .maybeSingle();
          if (!userExists) finalReviewedBy = null;
        } catch {}
      }

      const payload: Partial<DbLeaveRequest> = {
        status,
        reviewed_by: finalReviewedBy,
      };
      if (reason !== undefined) payload.reason = reason;

      const { data, error } = await supabase
        .from('leave_requests')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('leave_requests', error);
        if (error.message?.includes('foreign key constraint') || error.message?.includes('_fkey')) {
          const retryRes = await supabase
            .from('leave_requests')
            .update({ ...payload, reviewed_by: null })
            .eq('id', id)
            .select()
            .single();
          if (!retryRes.error && retryRes.data) {
            return mapLeaveRequest(retryRes.data);
          }
        }
        throw new Error(error.message || 'Failed to update leave request');
      }
      return data ? mapLeaveRequest(data) : null;
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      throw err;
    }
  },

  // ==========================================
  // 6. ATTENDANCE CORRECTION REQUESTS
  // ==========================================
  async getAttendanceCorrectionRequests(): Promise<AttendanceCorrectionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*');
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        return [];
      }
      return (data || []).map(mapAttendanceCorrectionRequest);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      return [];
    }
  },

  async getAttendanceCorrectionRequestsByUser(userId: string): Promise<AttendanceCorrectionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        return [];
      }
      return (data || []).map(mapAttendanceCorrectionRequest);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      return [];
    }
  },

  async getAttendanceCorrectionRequestsByProperty(propertyId: string): Promise<AttendanceCorrectionRequest[]> {
    try {
      const users = await this.getUsersByProperty(propertyId);
      const userIds = users.map((u) => u.id);
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*')
        .in('user_id', userIds);
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        return [];
      }
      return (data || []).map(mapAttendanceCorrectionRequest);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      return [];
    }
  },

  async createAttendanceCorrectionRequest(
    request: Omit<AttendanceCorrectionRequest, 'id'>
  ): Promise<AttendanceCorrectionRequest> {
    try {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .insert({
          user_id: request.userId,
          date: request.date,
          punch_missed: request.punchMissed,
          note: request.note,
          status: request.status,
          reviewed_by: request.reviewedBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        throw new Error(error.message || 'Failed to create attendance correction request');
      }
      return mapAttendanceCorrectionRequest(data);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      throw err;
    }
  },

  async updateAttendanceCorrectionRequestStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string | null
  ): Promise<AttendanceCorrectionRequest | null> {
    try {
      let finalReviewedBy = reviewedBy;
      if (finalReviewedBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', finalReviewedBy)
            .maybeSingle();
          if (!userExists) finalReviewedBy = null;
        } catch {}
      }

      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .update({ status, reviewed_by: finalReviewedBy })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        if (error.message?.includes('foreign key constraint') || error.message?.includes('_fkey')) {
          const retryRes = await supabase
            .from('attendance_correction_requests')
            .update({ status, reviewed_by: null })
            .eq('id', id)
            .select()
            .single();
          if (!retryRes.error && retryRes.data) {
            return mapAttendanceCorrectionRequest(retryRes.data);
          }
        }
        throw new Error(error.message || 'Failed to update attendance correction request');
      }
      return data ? mapAttendanceCorrectionRequest(data) : null;
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      throw err;
    }
  },

  // ==========================================
  // 7. TASK CATEGORIES
  // ==========================================
  async getTaskCategories(propertyId?: string): Promise<TaskCategory[]> {
    try {
      let query = supabase.from('task_categories').select('*');
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) {
        notifySchemaMissing('task_categories', error);
        return [];
      }
      
      let categories = (data || []).map(mapTaskCategory);

      // Auto-seed default categories if none exist yet
      if (categories.length === 0 && propertyId) {
        try {
          const seedRows = DEFAULT_TASK_CATEGORIES.map((name) => ({
            property_id: propertyId,
            name,
          }));
          const { data: inserted, error: insertErr } = await supabase
            .from('task_categories')
            .insert(seedRows)
            .select();
          if (!insertErr && inserted) {
            categories = inserted.map(mapTaskCategory);
          }
        } catch (seedErr) {
          console.warn('Auto-seed task categories for property notice:', seedErr);
        }
      } else if (categories.length === 0 && !propertyId) {
        // If owner requests all categories and table is empty, seed across all existing properties
        try {
          const { data: properties } = await supabase.from('properties').select('id');
          if (properties && properties.length > 0) {
            const seedRows = properties.flatMap((p) =>
              DEFAULT_TASK_CATEGORIES.map((name) => ({
                property_id: p.id,
                name,
              }))
            );
            const { data: inserted, error: insertErr } = await supabase
              .from('task_categories')
              .insert(seedRows)
              .select();
            if (!insertErr && inserted) {
              categories = inserted.map(mapTaskCategory);
            }
          }
        } catch (seedAllErr) {
          console.warn('Auto-seed all task categories notice:', seedAllErr);
        }
      }

      return categories;
    } catch (err) {
      notifySchemaMissing('task_categories', err);
      return [];
    }
  },

  async createTaskCategory(propertyId: string, name: string): Promise<TaskCategory> {
    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert({
          property_id: propertyId,
          name: name.trim(),
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('task_categories', error);
        throw new Error(error.message || 'Failed to create task category');
      }
      return mapTaskCategory(data);
    } catch (err) {
      notifySchemaMissing('task_categories', err);
      throw err;
    }
  },

  // ==========================================
  // 8. TASKS
  // ==========================================
  async getTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) {
        notifySchemaMissing('tasks', error);
        return [];
      }
      return (data || []).map(mapTask);
    } catch (err) {
      notifySchemaMissing('tasks', err);
      return [];
    }
  },

  async getTasksByProperty(propertyId: string): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('property_id', propertyId);
      if (error) {
        notifySchemaMissing('tasks', error);
        return [];
      }
      return (data || []).map(mapTask);
    } catch (err) {
      notifySchemaMissing('tasks', err);
      return [];
    }
  },

  async getTaskById(id: string): Promise<Task | null> {
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('tasks', error);
        return null;
      }
      return data ? mapTask(data) : null;
    } catch (err) {
      notifySchemaMissing('tasks', err);
      return null;
    }
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      let finalCreatedBy = task.createdBy;
      let finalLastActionBy = task.lastActionBy;

      // Verify created_by foreign key against users table
      if (finalCreatedBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', finalCreatedBy)
            .maybeSingle();
          if (!userExists) {
            // Find a valid user on this property or owner
            const { data: fallbackUser } = await supabase
              .from('users')
              .select('id')
              .eq('property_id', task.propertyId)
              .limit(1)
              .maybeSingle();
            if (fallbackUser) finalCreatedBy = fallbackUser.id;
          }
        } catch {}
      }

      // Verify last_action_by foreign key against users table
      if (finalLastActionBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', finalLastActionBy)
            .maybeSingle();
          if (!userExists) finalLastActionBy = null;
        } catch {}
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          property_id: task.propertyId,
          created_by: finalCreatedBy,
          category_id: task.categoryId,
          description: task.description,
          photo_url: task.photoUrl,
          status: task.status,
          last_action_by: finalLastActionBy,
          last_action_note: task.lastActionNote,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('tasks', error);
        throw new Error(error.message || 'Failed to create task in database');
      }
      return mapTask(data);
    } catch (err) {
      notifySchemaMissing('tasks', err);
      throw err;
    }
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      const payload: Partial<DbTask> = {};
      if (updates.propertyId !== undefined) payload.property_id = updates.propertyId;
      if (updates.createdBy !== undefined) payload.created_by = updates.createdBy;
      if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
      if (updates.status !== undefined) payload.status = updates.status;
      
      let finalLastActionBy = updates.lastActionBy;
      if (finalLastActionBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', finalLastActionBy)
            .maybeSingle();
          if (!userExists) finalLastActionBy = null;
        } catch {}
      }
      if (updates.lastActionBy !== undefined) payload.last_action_by = finalLastActionBy;
      if (updates.lastActionNote !== undefined) payload.last_action_note = updates.lastActionNote;

      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('tasks', error);
        throw new Error(error.message || 'Failed to update task in database');
      }
      return data ? mapTask(data) : null;
    } catch (err) {
      notifySchemaMissing('tasks', err);
      throw err;
    }
  },

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    lastActionBy: string | null,
    lastActionNote: string | null = null
  ): Promise<Task | null> {
    try {
      let finalLastActionBy = lastActionBy;
      if (finalLastActionBy) {
        try {
          const { data: userExists } = await supabase
            .from('users')
            .select('id')
            .eq('id', finalLastActionBy)
            .maybeSingle();
          if (!userExists) finalLastActionBy = null;
        } catch {}
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status,
          last_action_by: finalLastActionBy,
          last_action_note: lastActionNote,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('tasks', error);
        throw new Error(error.message || 'Failed to update task status in database');
      }
      return data ? mapTask(data) : null;
    } catch (err) {
      notifySchemaMissing('tasks', err);
      throw err;
    }
  },

  // ==========================================
  // 9. VOUCHERS
  // ==========================================
  async getVouchers(): Promise<Voucher[]> {
    try {
      const { data, error } = await supabase.from('vouchers').select('*');
      if (error) {
        notifySchemaMissing('vouchers', error);
        return [];
      }
      return (data || []).map(mapVoucher);
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      return [];
    }
  },

  async getVoucherById(id: string): Promise<Voucher | null> {
    try {
      const { data, error } = await supabase.from('vouchers').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('vouchers', error);
        return null;
      }
      return data ? mapVoucher(data) : null;
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      return null;
    }
  },

  async getVoucherByTaskId(taskId: string): Promise<Voucher | null> {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('vouchers', error);
        return null;
      }
      return data ? mapVoucher(data) : null;
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      return null;
    }
  },

  async createVoucher(voucher: Omit<Voucher, 'id'>): Promise<Voucher> {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .insert({
          task_id: voucher.taskId,
          payment_type: voucher.paymentType,
          amount: voucher.amount,
          created_by: voucher.createdBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('vouchers', error);
        throw new Error(error.message || 'Failed to create voucher in database');
      }
      return mapVoucher(data);
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      throw err;
    }
  },

  async updateVoucher(id: string, updates: Partial<Voucher>): Promise<Voucher | null> {
    try {
      const payload: Partial<DbVoucher> = {};
      if (updates.taskId !== undefined) payload.task_id = updates.taskId;
      if (updates.paymentType !== undefined) payload.payment_type = updates.paymentType;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.createdBy !== undefined) payload.created_by = updates.createdBy;

      const { data, error } = await supabase
        .from('vouchers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('vouchers', error);
        throw new Error(error.message || 'Failed to update voucher in database');
      }
      return data ? mapVoucher(data) : null;
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      throw err;
    }
  },

  // ==========================================
  // 10. SALARY HISTORY & COMPENSATION
  // ==========================================
  async getSalaryHistory(userId: string): Promise<SalaryHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('salary_history')
        .select('*')
        .eq('user_id', userId)
        .order('effective_from', { ascending: false });
      if (error) {
        notifySchemaMissing('salary_history', error);
        return [];
      }
      return (data || []).map(mapSalaryHistory);
    } catch (err) {
      notifySchemaMissing('salary_history', err);
      return [];
    }
  },

  async addSalaryChange(
    userId: string,
    monthlySalary: number,
    effectiveFrom: string,
    notes: string = '',
    createdBy?: string
  ): Promise<SalaryHistoryRecord> {
    try {
      // 1. Mark previous active salary records as inactive / expired
      await supabase
        .from('salary_history')
        .update({ is_active: false, effective_to: effectiveFrom })
        .eq('user_id', userId)
        .eq('is_active', true);

      // 2. Insert new salary record
      const { data, error } = await supabase
        .from('salary_history')
        .insert({
          user_id: userId,
          monthly_salary: monthlySalary,
          effective_from: effectiveFrom,
          effective_to: null,
          is_active: true,
          notes: notes.trim() || null,
          created_by: createdBy || null,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('salary_history', error);
        throw new Error(error.message || 'Failed to record salary change');
      }

      // 3. Update current monthly_salary on user
      await dataService.updateUser(userId, { monthlySalary });

      return mapSalaryHistory(data);
    } catch (err) {
      notifySchemaMissing('salary_history', err);
      throw err;
    }
  },

  async getEmployeeSalaryForMonth(userId: string, yearMonth: string, fallbackUser?: User): Promise<number> {
    try {
      // Find salary active during that month (effective_from <= end of month)
      const [yStr, mStr] = yearMonth.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const endDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${yearMonth}-${String(endDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('salary_history')
        .select('*')
        .eq('user_id', userId)
        .lte('effective_from', endOfMonth)
        .order('effective_from', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return Number(data[0].monthly_salary);
      }
    } catch {}

    if (fallbackUser?.monthlySalary && fallbackUser.monthlySalary > 0) {
      return fallbackUser.monthlySalary;
    }

    if (fallbackUser) {
      return dataService.getEmployeeMonthlySalary(fallbackUser);
    }

    const user = await dataService.getUserById(userId);
    if (user?.monthlySalary && user.monthlySalary > 0) {
      return user.monthlySalary;
    }
    return user ? dataService.getEmployeeMonthlySalary(user) : 16000;
  },

  // ==========================================
  // 11. SALARY ADVANCES
  // ==========================================
  async getSalaryAdvances(userId?: string): Promise<SalaryAdvance[]> {
    try {
      let query = supabase.from('salary_advances').select('*').order('date', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) {
        notifySchemaMissing('salary_advances', error);
        return [];
      }
      return (data || []).map(mapSalaryAdvance);
    } catch (err) {
      notifySchemaMissing('salary_advances', err);
      return [];
    }
  },

  async createSalaryAdvance(advance: {
    userId: string;
    amount: number;
    date: string;
    reason: string;
    createdBy?: string;
  }): Promise<SalaryAdvance> {
    try {
      const { data, error } = await supabase
        .from('salary_advances')
        .insert({
          user_id: advance.userId,
          amount: advance.amount,
          date: advance.date,
          reason: advance.reason.trim(),
          recovered_amount: 0,
          outstanding_amount: advance.amount,
          status: 'active',
          created_by: advance.createdBy || null,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('salary_advances', error);
        throw new Error(error.message || 'Failed to create salary advance');
      }
      return mapSalaryAdvance(data);
    } catch (err) {
      notifySchemaMissing('salary_advances', err);
      throw err;
    }
  },

  // ==========================================
  // 12. PAYROLL ENGINE & CALCULATIONS
  // ==========================================
  async calculatePayrollForEmployee(user: User, payrollMonth: string, generatedBy?: string): Promise<PayrollRecord> {
    const [yStr, mStr] = payrollMonth.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const calendarDays = new Date(year, month, 0).getDate();

    // 1. Applicable Monthly Salary
    const monthlySalary = await dataService.getEmployeeSalaryForMonth(user.id, payrollMonth, user);
    const dailyRate = Math.round((monthlySalary / calendarDays) * 100) / 100;

    // 2. Attendance in month
    const [attendanceRecords, weekOffRequests] = await Promise.all([
      dataService.getAttendanceByUser(user.id),
      dataService.getWeekOffRequestsByUser(user.id),
    ]);

    const monthAttendance = attendanceRecords.filter((r) => r.date.startsWith(payrollMonth));

    // Calculate outcomes from finalized source records
    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let weekOffs = 0;
    let paidLeaves = 0;
    let lopLeaves = 0;
    let approvedLatePenalties = 0;

    monthAttendance.forEach((att) => {
      if (att.status === 'present') {
        presentDays += 1;
      } else if (att.status === 'half_day') {
        halfDays += 1;
      } else if (att.status === 'absent') {
        absentDays += 1;
      } else if (att.status === 'week_off') {
        weekOffs += 1;
      } else if (att.status === 'on_leave') {
        paidLeaves += 1;
      }

      // Check approved late penalties
      if (att.latePenaltyStatus === 'approved' && att.latePenaltyAmount) {
        approvedLatePenalties += Number(att.latePenaltyAmount);
      }
    });

    // Week-Off entitlement check (4 standard + carried forward)
    const carryForwardWeekOffs = await dataService.getCarriedForwardWeekOffBalance(user.id);
    const totalAvailableWeekOffs = 4 + carryForwardWeekOffs;
    const excessWeekOffs = Math.max(0, weekOffs - totalAvailableWeekOffs);
    const validWeekOffs = Math.min(weekOffs, totalAvailableWeekOffs);

    // 4. Payable & LOP day calculations
    const payableDays = presentDays + (halfDays * 0.5) + validWeekOffs + paidLeaves;
    const totalLopDays = absentDays + lopLeaves + excessWeekOffs + (halfDays * 0.5);

    // 5. Deductions & Recoveries
    const lopDeduction = Math.round(dailyRate * totalLopDays * 100) / 100;
    const latePenaltyDeduction = approvedLatePenalties;

    // Advances recovery (find outstanding advances for this user)
    const advances = await dataService.getSalaryAdvances(user.id);
    const activeAdvances = advances.filter((a) => a.status === 'active' && a.outstandingAmount > 0);
    let advanceRecovery = 0;
    activeAdvances.forEach((adv) => {
      // Suggest recovery capped at outstanding or 25% of gross
      const maxRecovery = Math.min(adv.outstandingAmount, Math.round(monthlySalary * 0.25));
      advanceRecovery += maxRecovery;
    });

    const otherAdditions = 0;
    const otherDeductions = 0;
    const grossSalary = monthlySalary;
    
    // Net Salary with floor protection (no negative values)
    const tentativeNet = grossSalary - lopDeduction - latePenaltyDeduction - advanceRecovery + otherAdditions - otherDeductions;
    const netSalary = Math.max(0, Math.round(tentativeNet * 100) / 100);
    const excessUnrecoveredDeduction = Math.max(0, Math.round(-tentativeNet * 100) / 100);

    return {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'rec-' + Date.now(),
      userId: user.id,
      propertyId: user.propertyId || '',
      payrollMonth,
      employeeName: user.name,
      employeeRole: user.role,
      employeeStaffType: user.staffType || undefined,
      monthlySalary,
      calendarDays,
      dailyRate,
      presentDays,
      halfDays,
      weekOffs: validWeekOffs,
      carryForwardWeekOffs,
      paidLeaves,
      absentDays,
      lopLeaves,
      excessWeekOffs,
      payableDays,
      totalLopDays,
      lopDeduction,
      latePenaltyDeduction,
      advanceRecovery,
      otherAdditions,
      otherDeductions,
      grossSalary,
      netSalary,
      excessUnrecoveredDeduction,
      status: 'calculated',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      generatedBy: generatedBy || null,
      generatedAt: new Date().toISOString(),
      adjustments: [],
    };
  },

  async getPayrollRecords(propertyId?: string | null, payrollMonth?: string): Promise<PayrollRecord[]> {
    try {
      let query = supabase.from('payroll_records').select('*, adjustments:payroll_adjustments(*)');
      if (propertyId) query = query.eq('property_id', propertyId);
      if (payrollMonth) query = query.eq('payroll_month', payrollMonth);
      
      const { data, error } = await query;
      if (error) {
        notifySchemaMissing('payroll_records', error);
        return [];
      }
      return (data || []).map((row) => {
        const adjustments = (row.adjustments || []).map(mapPayrollAdjustment);
        return mapPayrollRecord(row, adjustments);
      });
    } catch (err) {
      notifySchemaMissing('payroll_records', err);
      return [];
    }
  },

  async getPayrollRecordsByUser(userId: string): Promise<PayrollRecord[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*, adjustments:payroll_adjustments(*)')
        .eq('user_id', userId)
        .order('payroll_month', { ascending: false });
      if (error) {
        notifySchemaMissing('payroll_records', error);
        return [];
      }
      return (data || []).map((row) => {
        const adjustments = (row.adjustments || []).map(mapPayrollAdjustment);
        return mapPayrollRecord(row, adjustments);
      });
    } catch (err) {
      notifySchemaMissing('payroll_records', err);
      return [];
    }
  },

  async getPayrollRecordById(id: string): Promise<PayrollRecord | null> {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*, adjustments:payroll_adjustments(*)')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        if (error) notifySchemaMissing('payroll_records', error);
        return null;
      }
      const adjustments = (data.adjustments || []).map(mapPayrollAdjustment);
      return mapPayrollRecord(data, adjustments);
    } catch (err) {
      notifySchemaMissing('payroll_records', err);
      return null;
    }
  },

  async generateMonthlyPayroll(
    propertyId: string | null,
    payrollMonth: string,
    generatedBy: string
  ): Promise<PayrollRecord[]> {
    // 1. Fetch eligible staff
    let users = await dataService.getUsers();
    if (propertyId) {
      users = users.filter((u) => u.propertyId === propertyId);
    }
    const eligibleEmployees = users.filter((u) => u.isActive !== false);

    const generatedRecords: PayrollRecord[] = [];

    for (const emp of eligibleEmployees) {
      // Check if locked record already exists for this employee & month
      let existingDb: any = null;
      try {
        const { data } = await supabase
          .from('payroll_records')
          .select('*, adjustments:payroll_adjustments(*)')
          .eq('user_id', emp.id)
          .eq('payroll_month', payrollMonth)
          .maybeSingle();
        existingDb = data;
      } catch {}

      if (existingDb && (existingDb.status === 'locked' || existingDb.status === 'paid')) {
        // Preserve immutable locked/paid payroll
        const adjs = (existingDb.adjustments || []).map(mapPayrollAdjustment);
        generatedRecords.push(mapPayrollRecord(existingDb, adjs));
        continue;
      }

      // Calculate fresh payroll record
      const calculated = await dataService.calculatePayrollForEmployee(emp, payrollMonth, generatedBy);
      
      // Upsert into payroll_records
      try {
        const { data: inserted, error: upsertErr } = await supabase
          .from('payroll_records')
          .upsert({
            ...(existingDb ? { id: existingDb.id } : {}),
            user_id: calculated.userId,
            property_id: emp.propertyId || propertyId || '',
            payroll_month: calculated.payrollMonth,
            monthly_salary: calculated.monthlySalary,
            calendar_days: calculated.calendarDays,
            daily_rate: calculated.dailyRate,
            present_days: calculated.presentDays,
            half_days: calculated.halfDays,
            week_offs: calculated.weekOffs,
            carry_forward_week_offs: calculated.carryForwardWeekOffs,
            paid_leaves: calculated.paidLeaves,
            absent_days: calculated.absentDays,
            lop_leaves: calculated.lopLeaves,
            excess_week_offs: calculated.excessWeekOffs,
            payable_days: calculated.payableDays,
            total_lop_days: calculated.totalLopDays,
            lop_deduction: calculated.lopDeduction,
            late_penalty_deduction: calculated.latePenaltyDeduction,
            advance_recovery: calculated.advanceRecovery,
            other_additions: calculated.otherAdditions,
            other_deductions: calculated.otherDeductions,
            gross_salary: calculated.grossSalary,
            net_salary: calculated.netSalary,
            excess_unrecovered_deduction: calculated.excessUnrecoveredDeduction,
            status: calculated.status,
            payment_status: calculated.paymentStatus,
            generated_by: generatedBy,
            generated_at: calculated.generatedAt,
          }, { onConflict: 'user_id,payroll_month' })
          .select()
          .single();

        if (!upsertErr && inserted) {
          generatedRecords.push(mapPayrollRecord(inserted));
        } else {
          generatedRecords.push(calculated);
        }
      } catch {
        generatedRecords.push(calculated);
      }
    }

    return generatedRecords;
  },

  async updatePayrollStatus(id: string, status: PayrollStatus, actorId: string): Promise<PayrollRecord | null> {
    try {
      const updates: any = { status };
      if (status === 'approved') {
        updates.approved_by = actorId;
        updates.approved_at = new Date().toISOString();
      } else if (status === 'locked') {
        updates.locked_by = actorId;
        updates.locked_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('payroll_records')
        .update(updates)
        .eq('id', id)
        .select('*, adjustments:payroll_adjustments(*)')
        .single();
      if (error) {
        notifySchemaMissing('payroll_records', error);
        return null;
      }
      const adjs = (data.adjustments || []).map(mapPayrollAdjustment);
      return mapPayrollRecord(data, adjs);
    } catch (err) {
      notifySchemaMissing('payroll_records', err);
      return null;
    }
  },

  async lockPayroll(id: string, lockedBy: string): Promise<PayrollRecord | null> {
    return dataService.updatePayrollStatus(id, 'locked', lockedBy);
  },

  async recordPayrollPayment(
    id: string,
    paymentData: {
      paymentMode: PayrollPaymentMode;
      paymentDate: string;
      transactionRef?: string;
      paidAmount: number;
      notes?: string;
      paidBy: string;
    }
  ): Promise<PayrollRecord | null> {
    try {
      const record = await dataService.getPayrollRecordById(id);
      if (!record) throw new Error('Payroll record not found');

      const isFullyPaid = paymentData.paidAmount >= record.netSalary;
      const paymentStatus: PayrollPaymentStatus = isFullyPaid ? 'paid' : 'partially_paid';

      const { data, error } = await supabase
        .from('payroll_records')
        .update({
          payment_status: paymentStatus,
          payment_mode: paymentData.paymentMode,
          payment_date: paymentData.paymentDate,
          transaction_ref: paymentData.transactionRef?.trim() || null,
          paid_amount: paymentData.paidAmount,
          payment_notes: paymentData.notes?.trim() || null,
          paid_by: paymentData.paidBy,
          paid_at: new Date().toISOString(),
          status: isFullyPaid ? 'paid' : record.status,
        })
        .eq('id', id)
        .select('*, adjustments:payroll_adjustments(*)')
        .single();

      if (error) {
        notifySchemaMissing('payroll_records', error);
        throw new Error(error.message || 'Failed to record payment');
      }

      // If advance was recovered in this payroll, deduct from active advances
      if (record.advanceRecovery > 0) {
        try {
          const advances = await dataService.getSalaryAdvances(record.userId);
          let remainingRecovery = record.advanceRecovery;
          for (const adv of advances.filter((a) => a.status === 'active')) {
            if (remainingRecovery <= 0) break;
            const deduct = Math.min(adv.outstandingAmount, remainingRecovery);
            const newRecovered = adv.recoveredAmount + deduct;
            const newOutstanding = adv.outstandingAmount - deduct;
            await supabase
              .from('salary_advances')
              .update({
                recovered_amount: newRecovered,
                outstanding_amount: newOutstanding,
                status: newOutstanding === 0 ? 'fully_recovered' : 'active',
              })
              .eq('id', adv.id);
            remainingRecovery -= deduct;
          }
        } catch (advRecErr) {
          console.warn('Advance recovery update notice:', advRecErr);
        }
      }

      const adjs = (data.adjustments || []).map(mapPayrollAdjustment);
      return mapPayrollRecord(data, adjs);
    } catch (err) {
      notifySchemaMissing('payroll_records', err);
      throw err;
    }
  },

  async addPayrollAdjustment(
    recordId: string,
    adjustment: {
      type: 'addition' | 'deduction';
      amount: number;
      reason: string;
      createdBy?: string;
    }
  ): Promise<PayrollAdjustment> {
    try {
      const { data, error } = await supabase
        .from('payroll_adjustments')
        .insert({
          payroll_record_id: recordId,
          type: adjustment.type,
          amount: adjustment.amount,
          reason: adjustment.reason.trim(),
          created_by: adjustment.createdBy || null,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('payroll_adjustments', error);
        throw new Error(error.message || 'Failed to add adjustment');
      }

      // Re-calculate totals on the payroll record
      const record = await dataService.getPayrollRecordById(recordId);
      if (record) {
        const adjustments = record.adjustments || [];
        const additions = adjustments.filter((a) => a.type === 'addition').reduce((sum, a) => sum + a.amount, 0) + (adjustment.type === 'addition' ? adjustment.amount : 0);
        const deductions = adjustments.filter((a) => a.type === 'deduction').reduce((sum, a) => sum + a.amount, 0) + (adjustment.type === 'deduction' ? adjustment.amount : 0);
        
        const tentativeNet = record.grossSalary - record.lopDeduction - record.latePenaltyDeduction - record.advanceRecovery + additions - deductions;
        const netSalary = Math.max(0, Math.round(tentativeNet * 100) / 100);
        const excessUnrecovered = Math.max(0, Math.round(-tentativeNet * 100) / 100);

        await supabase
          .from('payroll_records')
          .update({
            other_additions: additions,
            other_deductions: deductions,
            net_salary: netSalary,
            excess_unrecovered_deduction: excessUnrecovered,
          })
          .eq('id', recordId);
      }

      return mapPayrollAdjustment(data);
    } catch (err) {
      notifySchemaMissing('payroll_adjustments', err);
      throw err;
    }
  },

  async deletePayrollAdjustment(adjustmentId: string): Promise<boolean> {
    try {
      // Find parent record id first
      const { data: adj } = await supabase.from('payroll_adjustments').select('payroll_record_id').eq('id', adjustmentId).maybeSingle();
      const { error } = await supabase.from('payroll_adjustments').delete().eq('id', adjustmentId);
      if (error) throw error;

      if (adj?.payroll_record_id) {
        const record = await dataService.getPayrollRecordById(adj.payroll_record_id);
        if (record) {
          const adjustments = (record.adjustments || []).filter((a) => a.id !== adjustmentId);
          const additions = adjustments.filter((a) => a.type === 'addition').reduce((sum, a) => sum + a.amount, 0);
          const deductions = adjustments.filter((a) => a.type === 'deduction').reduce((sum, a) => sum + a.amount, 0);
          
          const tentativeNet = record.grossSalary - record.lopDeduction - record.latePenaltyDeduction - record.advanceRecovery + additions - deductions;
          const netSalary = Math.max(0, Math.round(tentativeNet * 100) / 100);
          const excessUnrecovered = Math.max(0, Math.round(-tentativeNet * 100) / 100);

          await supabase
            .from('payroll_records')
            .update({
              other_additions: additions,
              other_deductions: deductions,
              net_salary: netSalary,
              excess_unrecovered_deduction: excessUnrecovered,
            })
            .eq('id', adj.payroll_record_id);
        }
      }
      return true;
    } catch (err) {
      notifySchemaMissing('payroll_adjustments', err);
      return false;
    }
  },
};

// Named function exports for seamless drop-in compatibility across the codebase
export const getProperties = () => dataService.getProperties();
export const getPropertyById = (id: string) => dataService.getPropertyById(id);
export const createProperty = (p: Omit<Property, 'id'>) => dataService.createProperty(p);
export const updateProperty = (id: string, u: Partial<Property>) => dataService.updateProperty(id, u);
export const deleteProperty = (id: string) => dataService.deleteProperty(id);
export const clearAllPropertiesAndStaff = (keepOwner?: boolean) => dataService.clearAllPropertiesAndStaff(keepOwner);
export const clearAllNonOwnerStaff = () => dataService.clearAllNonOwnerStaff();

export const getUsers = () => dataService.getUsers();
export const getUserById = (id: string) => dataService.getUserById(id);
export const getUsersByProperty = (propertyId: string) => dataService.getUsersByProperty(propertyId);
export const getUsersByRole = (role: UserRole) => dataService.getUsersByRole(role);
export const createUser = (user: Omit<User, 'id'> & { id?: string }) => dataService.createUser(user);
export const updateUser = (id: string, updates: Partial<User>) => dataService.updateUser(id, updates);
export const deleteUser = (id: string) => dataService.deleteUser(id);

export const getAttendanceRecords = () => dataService.getAttendanceRecords();
export const getAttendanceByUser = (userId: string) => dataService.getAttendanceByUser(userId);
export const getAttendanceByDate = (date: string) => dataService.getAttendanceByDate(date);
export const getAttendanceByUserAndDate = (userId: string, date: string) => dataService.getAttendanceByUserAndDate(userId, date);
export const markAttendance = (r: Omit<AttendanceRecord, 'id'> & { id?: string }) => dataService.markAttendance(r);
export const reviewLatePenalty = (recordId: string, action: 'approved' | 'rejected', reviewerId: string, penaltyAmount: number = 0) => dataService.reviewLatePenalty(recordId, action, reviewerId, penaltyAmount);

export const getWeekOffRequests = () => dataService.getWeekOffRequests();
export const getWeekOffRequestsByUser = (userId: string) => dataService.getWeekOffRequestsByUser(userId);
export const createWeekOffRequest = (r: Omit<WeekOffRequest, 'id'>) => dataService.createWeekOffRequest(r);
export const updateWeekOffRequestStatus = (id: string, s: RequestStatus, rBy: string | null, reason?: string | null) => dataService.updateWeekOffRequestStatus(id, s, rBy, reason);
export const getCarriedForwardWeekOffBalance = (userId: string) => dataService.getCarriedForwardWeekOffBalance(userId);
export const getEmployeeMonthlySalary = (user: User) => dataService.getEmployeeMonthlySalary(user);

export const getSalaryHistory = (userId: string) => dataService.getSalaryHistory(userId);
export const addSalaryChange = (userId: string, monthlySalary: number, effectiveFrom: string, notes?: string, createdBy?: string) => dataService.addSalaryChange(userId, monthlySalary, effectiveFrom, notes, createdBy);
export const getEmployeeSalaryForMonth = (userId: string, yearMonth: string, fallbackUser?: User) => dataService.getEmployeeSalaryForMonth(userId, yearMonth, fallbackUser);

export const getSalaryAdvances = (userId?: string) => dataService.getSalaryAdvances(userId);
export const createSalaryAdvance = (adv: { userId: string; amount: number; date: string; reason: string; createdBy?: string }) => dataService.createSalaryAdvance(adv);

export const calculatePayrollForEmployee = (user: User, payrollMonth: string, generatedBy?: string) => dataService.calculatePayrollForEmployee(user, payrollMonth, generatedBy);
export const getPayrollRecords = (propertyId?: string | null, payrollMonth?: string) => dataService.getPayrollRecords(propertyId, payrollMonth);
export const getPayrollRecordsByUser = (userId: string) => dataService.getPayrollRecordsByUser(userId);
export const getPayrollRecordById = (id: string) => dataService.getPayrollRecordById(id);
export const generateMonthlyPayroll = (propertyId: string | null, payrollMonth: string, generatedBy: string) => dataService.generateMonthlyPayroll(propertyId, payrollMonth, generatedBy);
export const updatePayrollStatus = (id: string, status: PayrollStatus, actorId: string) => dataService.updatePayrollStatus(id, status, actorId);
export const lockPayroll = (id: string, lockedBy: string) => dataService.lockPayroll(id, lockedBy);
export const recordPayrollPayment = (id: string, paymentData: { paymentMode: PayrollPaymentMode; paymentDate: string; transactionRef?: string; paidAmount: number; notes?: string; paidBy: string }) => dataService.recordPayrollPayment(id, paymentData);
export const addPayrollAdjustment = (recordId: string, adjustment: { type: 'addition' | 'deduction'; amount: number; reason: string; createdBy?: string }) => dataService.addPayrollAdjustment(recordId, adjustment);
export const deletePayrollAdjustment = (adjustmentId: string) => dataService.deletePayrollAdjustment(adjustmentId);

export const getLeaveRequests = () => dataService.getLeaveRequests();
export const getLeaveRequestsByUser = (userId: string) => dataService.getLeaveRequestsByUser(userId);
export const createLeaveRequest = (r: Omit<LeaveRequest, 'id'>) => dataService.createLeaveRequest(r);
export const updateLeaveRequestStatus = (id: string, s: RequestStatus, rBy: string | null, reason?: string) => dataService.updateLeaveRequestStatus(id, s, rBy, reason);

export const getAttendanceCorrectionRequests = () => dataService.getAttendanceCorrectionRequests();
export const getAttendanceCorrectionRequestsByUser = (userId: string) => dataService.getAttendanceCorrectionRequestsByUser(userId);
export const getAttendanceCorrectionRequestsByProperty = (propertyId: string) => dataService.getAttendanceCorrectionRequestsByProperty(propertyId);
export const createAttendanceCorrectionRequest = (r: Omit<AttendanceCorrectionRequest, 'id'>) => dataService.createAttendanceCorrectionRequest(r);
export const updateAttendanceCorrectionRequestStatus = (id: string, s: RequestStatus, rBy: string | null) => dataService.updateAttendanceCorrectionRequestStatus(id, s, rBy);

export const getTaskCategories = (propertyId?: string) => dataService.getTaskCategories(propertyId);
export const createTaskCategory = (propertyId: string, name: string) => dataService.createTaskCategory(propertyId, name);
export const getTasks = () => dataService.getTasks();
export const getTasksByProperty = (propertyId: string) => dataService.getTasksByProperty(propertyId);
export const getTaskById = (id: string) => dataService.getTaskById(id);
export const createTask = (task: Omit<Task, 'id'>) => dataService.createTask(task);
export const updateTask = (id: string, updates: Partial<Task>) => dataService.updateTask(id, updates);
export const updateTaskStatus = (id: string, status: TaskStatus, lastActionBy: string | null, lastActionNote: string | null = null) => dataService.updateTaskStatus(id, status, lastActionBy, lastActionNote);

export const getVouchers = () => dataService.getVouchers();
export const getVoucherById = (id: string) => dataService.getVoucherById(id);
export const getVoucherByTaskId = (taskId: string) => dataService.getVoucherByTaskId(taskId);
export const createVoucher = (v: Omit<Voucher, 'id'>) => dataService.createVoucher(v);
export const updateVoucher = (id: string, updates: Partial<Voucher>) => dataService.updateVoucher(id, updates);
