import React, { useEffect, useState } from 'react';
import { Property, User, UserRole } from '../types';
import {
  getProperties,
  getUsers,
  createProperty,
  createUser,
  updateUser,
  deleteUser
} from '../services/dataService';
import { authService } from '../services/authService';
import {
  Building2,
  Plus,
  MapPin,
  Briefcase,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Users,
  X,
  Phone,
  Clock,
  IndianRupee,
  Shield,
  Trash2
} from 'lucide-react';

export default function OwnerPropertyManagement() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Property form
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyAddress, setNewPropertyAddress] = useState('');
  const [propertyCreating, setPropertyCreating] = useState(false);
  const [propertySuccess, setPropertySuccess] = useState<string | null>(null);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  // Staff form
  const [staffRole, setStaffRole] = useState<UserRole>('staff');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPin, setStaffPin] = useState('123456');
  const [staffPropertyId, setStaffPropertyId] = useState('');
  const [staffType, setStaffType] = useState('');
  const [staffShiftStart, setStaffShiftStart] = useState('08:00');
  const [staffShiftEnd, setStaffShiftEnd] = useState('16:00');
  const [staffSalary, setStaffSalary] = useState('16000');
  const [staffJoiningDate, setStaffJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffCreating, setStaffCreating] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedProperties, fetchedUsers] = await Promise.all([
        getProperties(),
        getUsers(),
      ]);
      setProperties(fetchedProperties);
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-adjust default salary based on role & staff department
  useEffect(() => {
    if (staffRole === 'manager') {
      setStaffSalary('35000');
    } else if (staffRole === 'inventory_manager') {
      setStaffSalary('25000');
    } else {
      switch (staffType.toLowerCase()) {
        case 'kitchen':
          setStaffSalary('18000');
          break;
        case 'maintenance':
          setStaffSalary('17000');
          break;
        case 'front desk':
          setStaffSalary('20000');
          break;
        case 'housekeeping':
          setStaffSalary('15000');
          break;
        case 'security':
          setStaffSalary('16000');
          break;
        default:
          setStaffSalary((prev) => (prev ? prev : '16000'));
      }
    }
  }, [staffRole, staffType]);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setPropertyError(null);
    setPropertySuccess(null);

    const trimmedName = newPropertyName.trim();
    const trimmedAddress = newPropertyAddress.trim();

    if (!trimmedName || !trimmedAddress) {
      setPropertyError('Please enter both property name and address.');
      return;
    }

    try {
      setPropertyCreating(true);
      const created = await createProperty({
        name: trimmedName,
        address: trimmedAddress,
        latitude: null,
        longitude: null,
        geofenceRadiusM: null,
      });

      setNewPropertyName('');
      setNewPropertyAddress('');
      setPropertySuccess(`Property "${created.name}" created successfully!`);
      await loadData();
      
      setTimeout(() => {
        setPropertySuccess(null);
        setShowPropertyModal(false);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to create property', err);
      setPropertyError(err.message || 'Failed to create property. Please try again.');
    } finally {
      setPropertyCreating(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffSuccess(null);

    const trimmedName = staffName.trim();
    const trimmedPhone = staffPhone.trim();
    const trimmedType = staffType.trim();
    const parsedSalary = parseFloat(staffSalary);

    if (!staffPropertyId) {
      setStaffError('Please select a valid property before adding an employee.');
      return;
    }
    if (!trimmedName || !trimmedPhone) {
      setStaffError('Please fill in both Name and Phone Number.');
      return;
    }
    if (isNaN(parsedSalary) || parsedSalary <= 0) {
      setStaffError('Please specify a valid positive Fixed Monthly Salary (₹).');
      return;
    }

    if (staffRole === 'staff') {
      if (!trimmedType) {
        setStaffError('Please specify the Staff Type / Department (e.g. Housekeeping, Kitchen).');
        return;
      }
      if (!staffShiftStart || !staffShiftEnd) {
        setStaffError('Please set both shift start and end times for staff.');
        return;
      }
    }

    try {
      setStaffCreating(true);
      const cleanPin = staffPin.trim() || '123456';
      
      if (cleanPin.length < 4 || cleanPin.length > 6) {
        setStaffError('Security PIN must be between 4 and 6 digits.');
        setStaffCreating(false);
        return;
      }

      const newEmployee = await createUser({
        name: trimmedName,
        phone: trimmedPhone,
        role: staffRole,
        propertyId: staffPropertyId,
        staffType: staffRole === 'staff' ? trimmedType : null,
        shiftStart: staffRole === 'staff' ? staffShiftStart : null,
        shiftEnd: staffRole === 'staff' ? staffShiftEnd : null,
        monthlySalary: parsedSalary,
        joiningDate: staffJoiningDate || new Date().toISOString().split('T')[0],
      });

      try {
        await authService.provisionUserPin(trimmedPhone, cleanPin, {
          name: trimmedName,
          role: staffRole,
          propertyId: staffPropertyId,
        });
      } catch (authPinErr) {
        console.warn('Auth PIN provision note:', authPinErr);
      }

      setStaffName('');
      setStaffPhone('');
      setStaffPin('123456');
      setStaffType('');
      setStaffShiftStart('08:00');
      setStaffShiftEnd('16:00');
      setStaffSalary('16000');
      setStaffJoiningDate(new Date().toISOString().split('T')[0]);
      
      setStaffSuccess(`Staff member "${newEmployee.name}" created successfully!`);
      await loadData();

      setTimeout(() => {
        setStaffSuccess(null);
        setShowStaffModal(false);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to create employee', err);
      setStaffError(err.message || 'Failed to create employee. Ensure the phone number is unique.');
    } finally {
      setStaffCreating(false);
    }
  };

  const handleAssignManager = async (propertyId: string, newManagerId: string) => {
    try {
      const currentMgr = users.find((u) => u.propertyId === propertyId && u.role === 'manager');
      if (currentMgr && currentMgr.id !== newManagerId) {
        await updateUser(currentMgr.id, { propertyId: null });
      }
      if (newManagerId) {
        await updateUser(newManagerId, { propertyId });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to assign manager', err);
    }
  };

  const handleAssignInventoryManager = async (propertyId: string, newInvManagerId: string) => {
    try {
      const currentInv = users.find((u) => u.propertyId === propertyId && u.role === 'inventory_manager');
      if (currentInv && currentInv.id !== newInvManagerId) {
        await updateUser(currentInv.id, { propertyId: null });
      }
      if (newInvManagerId) {
        await updateUser(newInvManagerId, { propertyId });
      }
      await loadData();
    } catch (err) {
      console.error('Failed to assign inventory manager', err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteUser(id);
        await loadData();
      } catch (err) {
        console.error('Failed to delete user', err);
        alert('Failed to delete user.');
      }
    }
  };

  const allManagers = users.filter(u => u.role === 'manager');
  const allInventoryManagers = users.filter(u => u.role === 'inventory_manager');
  const unassignedStaff = users.filter(u => !u.propertyId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Branches & Staff</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your properties and assign staff members.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShowPropertyModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold shadow transition cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            Create Property
          </button>
          <button
            onClick={() => setShowStaffModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {properties.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-8 text-center space-y-2">
            <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">No properties in database yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the "Create Property" button to add your first hostel property.
            </p>
          </div>
        ) : (
          properties.map(property => {
            const propManager = users.find(u => u.propertyId === property.id && u.role === 'manager');
            const propInvManager = users.find(u => u.propertyId === property.id && u.role === 'inventory_manager');
            const propStaff = users.filter(u => u.propertyId === property.id && u.role === 'staff');

            return (
              <div key={property.id} className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <h4 className="text-lg font-bold text-white tracking-tight">{property.name}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{property.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded-md border border-slate-800 self-start">
                    ID: {property.id}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-blue-300 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-blue-400" />
                      Property Manager
                    </label>
                    <select
                      value={propManager?.id || ''}
                      onChange={(e) => handleAssignManager(property.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-blue-500 text-xs text-slate-200 outline-none transition cursor-pointer"
                    >
                      <option value="">(Unassigned)</option>
                      {allManagers.map((mgr) => {
                        const isAssignedElsewhere = mgr.propertyId && mgr.propertyId !== property.id;
                        return (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.name} {isAssignedElsewhere ? `(Currently on other property)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-400" />
                      Inventory Manager
                    </label>
                    <select
                      value={propInvManager?.id || ''}
                      onChange={(e) => handleAssignInventoryManager(property.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-xs text-slate-200 outline-none transition cursor-pointer"
                    >
                      <option value="">(Unassigned)</option>
                      {allInventoryManagers.map((inv) => {
                        const isAssignedElsewhere = inv.propertyId && inv.propertyId !== property.id;
                        return (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} {isAssignedElsewhere ? `(Currently on other property)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Staff ({propStaff.length})
                    </h5>
                  </div>
                  
                  {propStaff.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 text-center">
                      <p className="text-[10px] text-slate-500">No staff assigned.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {propStaff.map(staff => (
                        <div key={staff.id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 text-sm">{staff.name}</span>
                            <button onClick={() => handleDeleteStaff(staff.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Phone className="w-3 h-3" /> {staff.phone}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/50">
                              {staff.staffType || 'Staff'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 flex items-center gap-0.5">
                              <IndianRupee className="w-2.5 h-2.5" />
                              {staff.monthlySalary?.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {unassignedStaff.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-900/30 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Unassigned Staff ({unassignedStaff.length})
          </h3>
          <p className="text-[11px] text-slate-400">These employees are not assigned to any property.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassignedStaff.map(staff => (
              <div key={staff.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-sm">{staff.name}</span>
                  <button onClick={() => handleDeleteStaff(staff.id)} className="text-slate-500 hover:text-rose-400 transition cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {staff.phone}</span>
                  <span className="capitalize text-[10px] bg-slate-800 px-1.5 py-0.5 rounded w-fit">{staff.role.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property Modal */}
      {showPropertyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Create New Property
              </h3>
              <button onClick={() => setShowPropertyModal(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProperty} className="p-5 space-y-4">
              {propertyError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-rose-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{propertyError}</p>
                </div>
              )}
              {propertySuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{propertySuccess}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Property Name *</label>
                  <input
                    type="text"
                    value={newPropertyName}
                    onChange={(e) => setNewPropertyName(e.target.value)}
                    placeholder="e.g. Mountain View Hostel"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-100 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Address *</label>
                  <input
                    type="text"
                    value={newPropertyAddress}
                    onChange={(e) => setNewPropertyAddress(e.target.value)}
                    placeholder="e.g. 104 Pine Ridge, Mall Road, Manali"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-100 text-sm outline-none transition"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={propertyCreating}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold shadow transition cursor-pointer"
                >
                  {propertyCreating ? 'Creating...' : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto pt-20 pb-20">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Add New Staff Member
              </h3>
              <button onClick={() => setShowStaffModal(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="p-5 space-y-4">
              {staffError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-rose-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{staffError}</p>
                </div>
              )}
              {staffSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{staffSuccess}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Role *</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
                  >
                    <option value="staff">Staff (Regular)</option>
                    <option value="manager">Property Manager</option>
                    <option value="inventory_manager">Inventory Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Assign to Branch *</label>
                  <select
                    value={staffPropertyId}
                    onChange={(e) => setStaffPropertyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
                  >
                    <option value="">-- Select Branch --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone (Login ID) *</label>
                  <input
                    type="tel"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10 digit number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Security PIN (4-6 digits) *</label>
                  <input
                    type="text"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Fixed Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    value={staffSalary}
                    onChange={(e) => setStaffSalary(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
                  />
                </div>
              </div>

              {staffRole === 'staff' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Department / Type *</label>
                    <select
                      value={staffType}
                      onChange={(e) => setStaffType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Shift Start</label>
                      <input
                        type="time"
                        value={staffShiftStart}
                        onChange={(e) => setStaffShiftStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Shift End</label>
                      <input
                        type="time"
                        value={staffShiftEnd}
                        onChange={(e) => setStaffShiftEnd(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={staffCreating}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow transition cursor-pointer"
                >
                  {staffCreating ? 'Creating Staff...' : 'Confirm & Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
