import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Phone,
  Clock,
  IndianRupee,
  KeyRound,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Briefcase,
  Layers,
  Save,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, Property, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: User | null;
  properties: Property[];
  isOwner: boolean;
  onEmployeeUpdated: (updatedUser: User) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  properties,
  isOwner,
  onEmployeeUpdated,
}) => {
  if (!isOpen || !employee) return null;

  // Form State
  const [name, setName] = useState<string>(employee.name || '');
  const [phone, setPhone] = useState<string>(employee.phone || '');
  const [role, setRole] = useState<UserRole>(employee.role || 'staff');
  const [propertyId, setPropertyId] = useState<string>(employee.propertyId || '');
  const [staffType, setStaffType] = useState<string>(employee.staffType || '');
  
  // Shifts State
  const [shift1Start, setShift1Start] = useState<string>(
    employee.shift1Start || employee.shiftStart || '08:00'
  );
  const [shift1End, setShift1End] = useState<string>(
    employee.shift1End || (employee.shift2Start ? '14:00' : employee.shiftEnd || '16:00')
  );
  const [enableShift2, setEnableShift2] = useState<boolean>(
    Boolean(employee.shift2Start && employee.shift2End)
  );
  const [shift2Start, setShift2Start] = useState<string>(
    employee.shift2Start || '18:00'
  );
  const [shift2End, setShift2End] = useState<string>(
    employee.shift2End || '22:00'
  );

  // Salary State
  const [monthlySalary, setMonthlySalary] = useState<string>(
    employee.monthlySalary ? String(employee.monthlySalary) : '16000'
  );
  const [salaryRevisionNotes, setSalaryRevisionNotes] = useState<string>('');

  // PIN State
  const [newPin, setNewPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);

  // Joining Date & Active State
  const [joiningDate, setJoiningDate] = useState<string>(
    employee.joiningDate || new Date().toISOString().split('T')[0]
  );
  const [isActive, setIsActive] = useState<boolean>(employee.isActive !== false);

  // Submission / Messages
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setPhone(employee.phone || '');
      setRole(employee.role || 'staff');
      setPropertyId(employee.propertyId || '');
      setStaffType(employee.staffType || '');
      setShift1Start(employee.shift1Start || employee.shiftStart || '08:00');
      setShift1End(employee.shift1End || (employee.shift2Start ? '14:00' : employee.shiftEnd || '16:00'));
      setEnableShift2(Boolean(employee.shift2Start && employee.shift2End));
      setShift2Start(employee.shift2Start || '18:00');
      setShift2End(employee.shift2End || '22:00');
      setMonthlySalary(employee.monthlySalary ? String(employee.monthlySalary) : '16000');
      setSalaryRevisionNotes('');
      setNewPin('');
      setJoiningDate(employee.joiningDate || new Date().toISOString().split('T')[0]);
      setIsActive(employee.isActive !== false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [employee]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const parsedSalary = parseFloat(monthlySalary);

    if (!trimmedName || !trimmedPhone) {
      setErrorMsg('Name and Phone number are required.');
      return;
    }

    if (isNaN(parsedSalary) || parsedSalary <= 0) {
      setErrorMsg('Please specify a valid positive monthly base salary (₹).');
      return;
    }

    if (!shift1Start || !shift1End) {
      setErrorMsg('Please set both Shift 1 start and end times.');
      return;
    }

    if (enableShift2 && (!shift2Start || !shift2End)) {
      setErrorMsg('Please set both Shift 2 start and end times or disable Shift 2.');
      return;
    }

    const cleanPin = newPin.trim();
    if (cleanPin.length > 0 && (cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin))) {
      setErrorMsg('Login Security PIN must be 4 to 6 numeric digits.');
      return;
    }

    try {
      setIsSaving(true);

      const effectiveShiftStart = shift1Start;
      const effectiveShiftEnd = enableShift2 ? shift2End : shift1End;

      // 1. Update User Record
      const updated = await dataService.updateUser(employee.id, {
        name: trimmedName,
        phone: trimmedPhone,
        role: isOwner ? role : employee.role,
        propertyId: isOwner && propertyId ? propertyId : employee.propertyId,
        staffType: role === 'staff' ? staffType.trim() : null,
        shiftStart: effectiveShiftStart,
        shiftEnd: effectiveShiftEnd,
        shift1Start: shift1Start,
        shift1End: shift1End,
        shift2Start: enableShift2 ? shift2Start : null,
        shift2End: enableShift2 ? shift2End : null,
        monthlySalary: parsedSalary,
        joiningDate: joiningDate || employee.joiningDate,
        isActive: isActive,
      });

      if (!updated) {
        throw new Error('Failed to update employee details');
      }

      // 2. If Salary Changed, record in salary_history
      const oldSalary = employee.monthlySalary ? Number(employee.monthlySalary) : null;
      if (oldSalary === null || oldSalary !== parsedSalary) {
        try {
          await dataService.addSalaryChange(
            employee.id,
            parsedSalary,
            new Date().toISOString().split('T')[0],
            salaryRevisionNotes.trim() || 'Salary updated via Edit Employee Details'
          );
        } catch (salErr) {
          console.warn('Salary history update note:', salErr);
        }
      }

      // 3. If PIN was entered, provision/update auth credentials
      if (cleanPin.length >= 4 && cleanPin.length <= 6) {
        try {
          await authService.provisionUserPin(trimmedPhone, cleanPin, {
            name: trimmedName,
            role: updated.role,
            propertyId: updated.propertyId,
          });
        } catch (pinErr) {
          console.warn('Auth PIN update note:', pinErr);
        }
      }

      setSuccessMsg(`Successfully updated details for "${trimmedName}".`);
      onEmployeeUpdated(updated);

      // Broadcast update event to ensure all views refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff-updated', { detail: { updatedUserId: updated.id } }));
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error('Failed to update employee', err);
      const rawError = err instanceof Error ? err.message : String(err);
      if (
        rawError.includes('users_phone_key') ||
        rawError.toLowerCase().includes('duplicate key') ||
        rawError.includes('23505') ||
        rawError.toLowerCase().includes('already exists')
      ) {
        setErrorMsg(`Another user with phone number "${trimmedPhone}" already exists.`);
      } else {
        setErrorMsg(rawError || 'Failed to save changes. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Edit Employee Details</h3>
              <p className="text-xs text-slate-400">
                Update shifts, salary rate, login PIN, and credentials for {employee.name}
              </p>
            </div>
          </div>
          <button
            id="close-edit-employee-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-emerald-400 text-xs font-medium">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* 1. Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Number (Login ID) <span className="text-indigo-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm font-mono outline-none transition"
                />
              </div>
            </div>

            {/* Role (Editable by Owner) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Role {isOwner ? '<span className="text-indigo-400">*</span>' : '(Managed)'}
              </label>
              {isOwner ? (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
                >
                  <option value="staff">Staff (On-ground Shift Worker)</option>
                  <option value="manager">Property Manager</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="owner">Owner (Executive Admin)</option>
                </select>
              ) : (
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300 text-sm flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span className="capitalize">{employee.role.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            {/* Branch / Property */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Assigned Branch / Property
              </label>
              {isOwner ? (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
                >
                  <option value="">-- Select Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300 text-sm flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{properties.find((p) => p.id === employee.propertyId)?.name || 'Assigned Branch'}</span>
                </div>
              )}
            </div>

            {/* Department / Staff Type (if staff) */}
            {role === 'staff' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Department / Staff Type
                </label>
                <select
                  value={staffType}
                  onChange={(e) => setStaffType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
                >
                  <option value="">-- Select Department --</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Front Desk">Front Desk</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Security">Security</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          {/* 2. SHIFT CONFIGURATION SECTION (Shift 1 and Shift 2) */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/70 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Assigned Shift Timings
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-indigo-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableShift2}
                  onChange={(e) => setEnableShift2(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>Enable Split Shift (Shift 1 &amp; Shift 2)</span>
              </label>
            </div>

            {/* Shift 1 Inputs */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                  Shift 1 (Morning / Standard)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Shift 1 Start</label>
                  <input
                    type="time"
                    value={shift1Start}
                    onChange={(e) => setShift1Start(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Shift 1 End</label>
                  <input
                    type="time"
                    value={shift1End}
                    onChange={(e) => setShift1End(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Shift 2 Inputs (Shown if enabled) */}
            {enableShift2 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/60 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide">
                    Shift 2 (Evening / Split Shift)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Shift 2 Start</label>
                    <input
                      type="time"
                      value={shift2Start}
                      onChange={(e) => setShift2Start(e.target.value)}
                      required={enableShift2}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-amber-500 text-slate-100 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Shift 2 End</label>
                    <input
                      type="time"
                      value={shift2End}
                      onChange={(e) => setShift2End(e.target.value)}
                      required={enableShift2}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-amber-500 text-slate-100 text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. SALARY & PIN SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Salary */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Monthly Base Salary (₹) <span className="text-emerald-400">*</span></span>
                <span className="text-[10px] text-emerald-400 font-medium">Auto-Revision</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-emerald-300 font-mono font-bold text-sm outline-none transition"
                />
              </div>
            </div>

            {/* Set / Change Security PIN */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Security PIN (4-6 digits)</span>
                <span className="text-[10px] text-slate-500">Leave blank to keep unchanged</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter new PIN to update"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm font-mono tracking-widest outline-none transition placeholder:tracking-normal placeholder:text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm font-mono outline-none transition cursor-pointer"
              />
            </div>

            {/* Active Status Toggle */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Employment Status
              </label>
              <select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
              >
                <option value="active">Active Employee</option>
                <option value="inactive">Inactive / Offboarded</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-employee-details"
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving Changes...' : 'Save Employee Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
