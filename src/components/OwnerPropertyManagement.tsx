import React, { useEffect, useState } from 'react';
import { Property, User, UserRole } from '../types';
import {
  getProperties,
  getUsers,
  createProperty,
  createUser,
  updateUser,
  deleteUser,
  deleteProperty
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
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Pencil
} from 'lucide-react';
import { EditEmployeeModal } from './EditEmployeeModal';

export default function OwnerPropertyManagement() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  // View state
  const [activeView, setActiveView] = useState<'branches' | 'directory'>('branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

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
  const [staffShift1Start, setStaffShift1Start] = useState('08:00');
  const [staffShift1End, setStaffShift1End] = useState('14:00');
  const [staffEnableShift2, setStaffEnableShift2] = useState(false);
  const [staffShift2Start, setStaffShift2Start] = useState('18:00');
  const [staffShift2End, setStaffShift2End] = useState('22:00');
  const [staffSalary, setStaffSalary] = useState('16000');
  const [staffJoiningDate, setStaffJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffCreating, setStaffCreating] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Toast / Alert notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

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
      showToast('error', 'Failed to load properties and staff data.');
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
      showToast('success', `Branch "${created.name}" created successfully!`);
      await loadData();
      
      setTimeout(() => {
        setPropertySuccess(null);
        setShowPropertyModal(false);
      }, 1500);
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
      if (!staffShift1Start || !staffShift1End) {
        setStaffError('Please set both Shift 1 start and end times for staff.');
        return;
      }
      if (staffEnableShift2 && (!staffShift2Start || !staffShift2End)) {
        setStaffError('Please set both Shift 2 start and end times or uncheck Shift 2.');
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

      const effectiveShiftStart = staffShift1Start || '08:00';
      const effectiveShiftEnd = staffEnableShift2 ? staffShift2End || '22:00' : staffShift1End || '16:00';

      const newEmployee = await createUser({
        name: trimmedName,
        phone: trimmedPhone,
        role: staffRole,
        propertyId: staffPropertyId,
        staffType: staffRole === 'staff' ? trimmedType : null,
        shiftStart: staffRole === 'staff' ? effectiveShiftStart : null,
        shiftEnd: staffRole === 'staff' ? effectiveShiftEnd : null,
        shift1Start: staffRole === 'staff' ? staffShift1Start : null,
        shift1End: staffRole === 'staff' ? staffShift1End : null,
        shift2Start: staffRole === 'staff' && staffEnableShift2 ? staffShift2Start : null,
        shift2End: staffRole === 'staff' && staffEnableShift2 ? staffShift2End : null,
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
      setStaffShift1Start('08:00');
      setStaffShift1End('14:00');
      setStaffEnableShift2(false);
      setStaffShift2Start('18:00');
      setStaffShift2End('22:00');
      setStaffSalary('16000');
      setStaffJoiningDate(new Date().toISOString().split('T')[0]);
      
      setStaffSuccess(`Staff member "${newEmployee.name}" created successfully!`);
      showToast('success', `Employee "${newEmployee.name}" added successfully.`);
      await loadData();

      setTimeout(() => {
        setStaffSuccess(null);
        setShowStaffModal(false);
      }, 1500);
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
      showToast('success', 'Branch Manager assignment updated.');
    } catch (err) {
      console.error('Failed to assign manager', err);
      showToast('error', 'Failed to update manager assignment.');
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
      showToast('success', 'Inventory Manager assignment updated.');
    } catch (err) {
      console.error('Failed to assign inventory manager', err);
      showToast('error', 'Failed to update inventory manager assignment.');
    }
  };

  // Perform single staff deletion
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetUser = userToDelete;
    try {
      setActionProcessing(true);
      // Optimistically update local users state
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      await deleteUser(targetUser.id);
      showToast('success', `"${targetUser.name}" (${targetUser.role.replace('_', ' ')}) was deleted from the database.`);
      setUserToDelete(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete user', err);
      showToast('error', err.message || 'Failed to delete staff member.');
      await loadData();
    } finally {
      setActionProcessing(false);
    }
  };

  // Perform single property deletion
  const confirmDeleteProperty = async () => {
    if (!propertyToDelete) return;
    try {
      setActionProcessing(true);
      await deleteProperty(propertyToDelete.id);
      showToast('success', `Branch "${propertyToDelete.name}" and its associated records have been deleted.`);
      setPropertyToDelete(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete property', err);
      showToast('error', err.message || 'Failed to delete property.');
    } finally {
      setActionProcessing(false);
    }
  };

  // Perform bulk unassigned staff wipe
  const confirmClearUnassignedStaff = async () => {
    try {
      setActionProcessing(true);
      const unassigned = users.filter((u) => !u.propertyId && u.role !== 'owner');
      for (const u of unassigned) {
        await deleteUser(u.id);
      }
      showToast('success', `Cleaned up ${unassigned.length} unassigned staff record(s).`);
      await loadData();
    } catch (err: any) {
      console.error('Failed to clear unassigned staff', err);
      showToast('error', err.message || 'Failed to clear unassigned staff.');
    } finally {
      setActionProcessing(false);
    }
  };

  const allManagers = users.filter(u => u.role === 'manager');
  const allInventoryManagers = users.filter(u => u.role === 'inventory_manager');
  const nonOwnerUsers = users.filter(u => u.role !== 'owner');
  const unassignedStaff = users.filter(u => !u.propertyId && u.role !== 'owner');

  // Filtered users for directory view
  const filteredUsers = nonOwnerUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      (u.staffType && u.staffType.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && properties.length === 0 && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-sm text-slate-400">Loading branch and staff records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-[200] max-w-md p-4 rounded-xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-3 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/50 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <p className="text-sm font-medium flex-1">{notification.message}</p>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Branches & Staff Management</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Create, manage, and delete properties or staff members across your hostel chain.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-create-property"
            onClick={() => setShowPropertyModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold shadow transition cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-purple-400" />
            Create Property
          </button>
          <button
            id="btn-add-staff"
            onClick={() => setShowStaffModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            id="tab-view-branches"
            onClick={() => setActiveView('branches')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeView === 'branches'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Branch View ({properties.length})
          </button>
          <button
            id="tab-view-directory"
            onClick={() => setActiveView('directory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeView === 'directory'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Directory ({nonOwnerUsers.length})
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* VIEW 1: BRANCH VIEW */}
      {activeView === 'branches' && (
        <div className="space-y-6">
          {properties.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-10 text-center space-y-3">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-base font-semibold text-slate-300">No properties in database</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the "Create Property" button above to add your first hostel branch.
                </p>
              </div>

              {nonOwnerUsers.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {nonOwnerUsers.length} Staff Member(s) in Database
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      You currently have {nonOwnerUsers.length} staff records remaining in the database (all unassigned).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveView('directory')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
                    >
                      View Staff Directory
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            properties.map((property) => {
              const propManager = users.find((u) => u.propertyId === property.id && u.role === 'manager');
              const propInvManager = users.find((u) => u.propertyId === property.id && u.role === 'inventory_manager');
              const propStaff = users.filter((u) => u.propertyId === property.id && u.role === 'staff');

              return (
                <div
                  key={property.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg space-y-4 relative overflow-hidden"
                >
                  {/* Property Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-5 h-5 text-purple-400 shrink-0" />
                        <h3 className="text-lg font-bold text-white tracking-tight">{property.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{property.address}</span>
                      </div>
                    </div>
                    
                    {/* Delete Property & ID */}
                    <div className="flex items-center gap-2 self-start">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                        ID: {property.id.slice(0, 8)}
                      </span>
                      <button
                        id={`btn-delete-property-${property.id}`}
                        onClick={() => setPropertyToDelete(property)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-xs font-semibold transition cursor-pointer"
                        title="Delete this property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Branch
                      </button>
                    </div>
                  </div>

                  {/* Manager Assignments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-blue-300 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-blue-400" />
                          Branch Manager
                        </label>
                        {propManager && (
                          <button
                            onClick={() => setUserToDelete(propManager)}
                            className="text-[11px] text-slate-500 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer"
                            title="Delete this manager"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Manager
                          </button>
                        )}
                      </div>
                      <select
                        value={propManager?.id || ''}
                        onChange={(e) => handleAssignManager(property.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-blue-500 text-xs text-slate-200 outline-none transition cursor-pointer"
                      >
                        <option value="">(Unassigned)</option>
                        {allManagers.map((mgr) => {
                          const isAssignedElsewhere = mgr.propertyId && mgr.propertyId !== property.id;
                          return (
                            <option key={mgr.id} value={mgr.id}>
                              {mgr.name} ({mgr.phone}) {isAssignedElsewhere ? `- assigned elsewhere` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase tracking-wider font-semibold text-amber-300 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-amber-400" />
                          Inventory Manager
                        </label>
                        {propInvManager && (
                          <button
                            onClick={() => setUserToDelete(propInvManager)}
                            className="text-[11px] text-slate-500 hover:text-rose-400 transition flex items-center gap-1 cursor-pointer"
                            title="Delete this inventory manager"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Manager
                          </button>
                        )}
                      </div>
                      <select
                        value={propInvManager?.id || ''}
                        onChange={(e) => handleAssignInventoryManager(property.id, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-xs text-slate-200 outline-none transition cursor-pointer"
                      >
                        <option value="">(Unassigned)</option>
                        {allInventoryManagers.map((inv) => {
                          const isAssignedElsewhere = inv.propertyId && inv.propertyId !== property.id;
                          return (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} ({inv.phone}) {isAssignedElsewhere ? `- assigned elsewhere` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Staff List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        Assigned Staff ({propStaff.length})
                      </h5>
                    </div>

                    {propStaff.length === 0 ? (
                      <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
                        <p className="text-xs text-slate-500">No regular staff assigned to this property yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {propStaff.map((staff) => (
                          <div
                            key={staff.id}
                            id={`staff-card-${staff.id}`}
                            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-1.5 relative group hover:border-slate-700 transition"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-200 text-sm truncate">{staff.name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  id={`btn-edit-staff-${staff.id}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEmployee(staff);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition cursor-pointer"
                                  title={`Edit ${staff.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                                </button>
                                <button
                                  id={`btn-delete-staff-${staff.id}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUserToDelete(staff);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                  title={`Delete ${staff.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Phone className="w-3 h-3 text-slate-500" /> {staff.phone}
                            </div>
                            {/* Shift timing display */}
                            {(staff.shift1Start || staff.shiftStart) && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {staff.shift2Start ? (
                                  <span>S1: {staff.shift1Start || staff.shiftStart} | S2: {staff.shift2Start}</span>
                                ) : (
                                  <span>{staff.shift1Start || staff.shiftStart} - {staff.shift1End || staff.shiftEnd}</span>
                                )}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] mt-1 pt-1 border-t border-slate-800/50">
                              <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                                {staff.staffType || 'Staff'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 flex items-center gap-0.5 font-medium">
                                <IndianRupee className="w-2.5 h-2.5" />
                                {staff.monthlySalary?.toLocaleString('en-IN') || '0'}
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

          {/* Unassigned Staff Section */}
          {unassignedStaff.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-950/15 border border-amber-900/40 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Unassigned Staff ({unassignedStaff.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    These staff members are not currently linked to any active branch.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={confirmClearUnassignedStaff}
                    disabled={actionProcessing}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {unassignedStaff.length} Unassigned
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {unassignedStaff.map((staff) => (
                  <div
                    key={staff.id}
                    id={`unassigned-staff-card-${staff.id}`}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200 text-sm truncate">{staff.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          id={`btn-edit-unassigned-${staff.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingEmployee(staff);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition cursor-pointer"
                          title={`Edit ${staff.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          id={`btn-delete-unassigned-${staff.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUserToDelete(staff);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title={`Delete ${staff.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" /> {staff.phone}
                      </span>
                      <span className="capitalize text-[10px] bg-slate-800 px-2 py-0.5 rounded w-fit text-slate-300">
                        {staff.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: STAFF DIRECTORY VIEW (Search & Direct Deletions) */}
      {activeView === 'directory' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search staff by name, phone, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 text-sm outline-none cursor-pointer"
              >
                <option value="all">All Roles ({nonOwnerUsers.length})</option>
                <option value="manager">Property Managers</option>
                <option value="inventory_manager">Inventory Managers</option>
                <option value="staff">Regular Staff</option>
              </select>
            </div>
          </div>

          {/* Staff Grid */}
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No staff members found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredUsers.map((user) => {
                const assignedProperty = properties.find((p) => p.id === user.propertyId);
                return (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white text-base">{user.name}</h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" /> {user.phone}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            user.role === 'manager'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800/50'
                              : user.role === 'inventory_manager'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                              : 'bg-indigo-950 text-indigo-300 border border-indigo-800/50'
                          }`}
                        >
                          {user.role.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Branch:</span>
                          <span className="font-medium text-slate-200">
                            {assignedProperty ? assignedProperty.name : 'Unassigned'}
                          </span>
                        </div>
                        {user.staffType && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Dept:</span>
                            <span className="font-medium text-slate-200">{user.staffType}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Salary:</span>
                          <span className="font-medium text-emerald-400 flex items-center gap-0.5">
                            <IndianRupee className="w-3 h-3" />
                            {user.monthlySalary?.toLocaleString('en-IN') || '0'} /mo
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        id={`btn-edit-staff-dir-${user.id}`}
                        type="button"
                        onClick={() => setEditingEmployee(user)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                        Edit Details
                      </button>
                      <button
                        id={`btn-delete-staff-${user.id}`}
                        type="button"
                        onClick={() => setUserToDelete(user)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Delete Staff Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE PROPERTY MODAL */}
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

      {/* MODAL 2: ADD STAFF MODAL */}
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
                    <option value="owner">Owner (Full Admin Access)</option>
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
                    {properties.map((p) => (
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

                  {/* Shift 1 Configuration */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Shift 1 Timing *
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Shift 1 Start</label>
                        <input
                          type="time"
                          value={staffShift1Start}
                          onChange={(e) => setStaffShift1Start(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Shift 1 End</label>
                        <input
                          type="time"
                          value={staffShift1End}
                          onChange={(e) => setStaffShift1End(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shift 2 (Split Shift) Configuration */}
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffEnableShift2}
                        onChange={(e) => setStaffEnableShift2(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
                      />
                      <span className="text-xs font-semibold text-slate-200">
                        Enable Shift 2 (Split Shift Timing)
                      </span>
                    </label>

                    {staffEnableShift2 && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Shift 2 Start</label>
                          <input
                            type="time"
                            value={staffShift2Start}
                            onChange={(e) => setStaffShift2Start(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Shift 2 End</label>
                          <input
                            type="time"
                            value={staffShift2End}
                            onChange={(e) => setStaffShift2End(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs outline-none"
                          />
                        </div>
                      </div>
                    )}
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

      {/* MODAL 3: DELETE SINGLE PROPERTY CONFIRMATION */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Property Branch</h3>
                <p className="text-xs text-slate-400">{propertyToDelete.name}</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
              <p>
                Are you sure you want to delete <strong className="text-white">"{propertyToDelete.name}"</strong>?
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>All tasks, categories, and inventory items for this branch will be removed.</li>
                <li>Staff assigned to this branch will become unassigned.</li>
                <li>This action is permanent and cannot be undone.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionProcessing}
                onClick={() => setPropertyToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={confirmDeleteProperty}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                {actionProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete Branch
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE SINGLE STAFF CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Staff Member</h3>
                <p className="text-xs text-slate-400">{userToDelete.name} ({userToDelete.phone})</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
              <p>
                Are you sure you want to delete <strong className="text-white">"{userToDelete.name}"</strong>?
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Role: <span className="text-slate-200 capitalize font-medium">{userToDelete.role.replace('_', ' ')}</span></li>
                <li>Their attendance records, shifts, and assigned task links will be safely cleaned up.</li>
                <li>Their phone number login will be released.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionProcessing}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionProcessing}
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                {actionProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete Staff
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <EditEmployeeModal
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          employee={editingEmployee}
          properties={properties}
          isOwner={true}
          onEmployeeUpdated={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? updated : u))
            );
            loadData();
          }}
        />
      )}
    </div>
  );
}
