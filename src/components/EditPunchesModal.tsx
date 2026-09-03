import React, { useState, useEffect } from 'react';
import { AttendanceRecord, User } from '../types';
import { markAttendance } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { X, Save, Clock, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  attendance: AttendanceRecord | null;
  user: User;
  date: string;
}

export default function EditPunchesModal({ isOpen, onClose, attendance, user, date }: Props) {
  const { currentUser } = useAuth();
  
  const [s1In, setS1In] = useState('');
  const [s1Out, setS1Out] = useState('');
  const [s2In, setS2In] = useState('');
  const [s2Out, setS2Out] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setS1In(attendance?.shift1ClockInTime || attendance?.clockInTime || '');
      setS1Out(attendance?.shift1ClockOutTime || attendance?.clockOutTime || '');
      setS2In(attendance?.shift2ClockInTime || '');
      setS2Out(attendance?.shift2ClockOutTime || '');
      setError(null);
    }
  }, [isOpen, attendance]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      
      await markAttendance({
        ...attendance,
        id: attendance?.id,
        userId: user.id,
        date: date,
        clockInTime: s1In || null,
        clockInSelfieUrl: attendance?.clockInSelfieUrl || null,
        clockInLat: attendance?.clockInLat || null,
        clockInLng: attendance?.clockInLng || null,
        clockOutTime: s1Out || null,
        clockOutSelfieUrl: attendance?.clockOutSelfieUrl || null,
        clockOutLat: attendance?.clockOutLat || null,
        clockOutLng: attendance?.clockOutLng || null,
        shift1ClockInTime: s1In || null,
        shift1ClockOutTime: s1Out || null,
        shift2ClockInTime: s2In || null,
        shift2ClockOutTime: s2Out || null,
        status: attendance?.status || (s1In ? 'present' : 'absent'),
        shiftStatus: 'completed', // Manager overrides and closes the shift
        markedBy: currentUser.id,
        managerAdjusted: true,
        adjustmentReason: 'Manual exact punch override by Manager'
      });
      
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { date } }));
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update punches.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white">Override Punches</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-200 text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <div className="col-span-2 text-xs font-bold text-slate-300">Shift 1</div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Clock In</label>
                <input type="time" value={s1In} onChange={(e) => setS1In(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Clock Out</label>
                <input type="time" value={s1Out} onChange={(e) => setS1Out(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
              </div>
            </div>
            
            {user.shift2Start && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <div className="col-span-2 text-xs font-bold text-purple-300">Shift 2</div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Clock In</label>
                  <input type="time" value={s2In} onChange={(e) => setS2In(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Clock Out</label>
                  <input type="time" value={s2Out} onChange={(e) => setS2Out(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50">
              <Save className="w-4 h-4" /> Save Punches
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
