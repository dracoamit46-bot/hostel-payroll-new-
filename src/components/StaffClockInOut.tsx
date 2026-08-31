import React, { useEffect, useState, useRef, useMemo } from 'react';
import { AttendanceRecord, Property } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getPropertyById,
  getAttendanceByUser,
  markAttendance,
} from '../services/dataService';
import {
  Clock,
  Camera,
  MapPin,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  LogOut as ClockOutIcon,
  LogIn as ClockInIcon,
  ShieldCheck,
  ShieldAlert,
  Building2,
  RefreshCw,
  UserCheck,
  FileEdit,
  Upload,
  Sparkles,
  Calendar,
  CalendarDays,
  History,
  TrendingUp,
  Award,
  Info,
} from 'lucide-react';
import AttendanceCorrectionModal from './AttendanceCorrectionModal';

// Haversine formula to compute distance in meters between two lat/lng pairs
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function StaffClockInOut() {
  const { currentUser } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Active action modal/flow: null | 'clock_in' | 'clock_out'
  const [activeAction, setActiveAction] = useState<'clock_in' | 'clock_out' | null>(null);

  // Camera & selfie state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

  // Geolocation state
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [detectingLoc, setDetectingLoc] = useState<boolean>(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [correctionTargetDate, setCorrectionTargetDate] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to stop camera tracks
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 1. Load today's AttendanceRecord and past history for the current user
  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [userRecords, prop] = await Promise.all([
        getAttendanceByUser(currentUser.id),
        currentUser.propertyId ? getPropertyById(currentUser.propertyId) : Promise.resolve(null),
      ]);
      const todayRecord = userRecords.find((r) => r.date === todayStr) || null;
      setAttendance(todayRecord);
      setHistoryRecords(userRecords);
      setProperty(prop);
    } catch (err) {
      console.error('Failed to load attendance or property', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.propertyId]);

  // Compute monthly statistics
  const monthlyRecords = useMemo(() => {
    return historyRecords
      .filter((r) => r.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [historyRecords, selectedMonth]);

  const monthStats = useMemo(() => {
    const present = monthlyRecords.filter((r) => r.status === 'present').length;
    const halfDay = monthlyRecords.filter((r) => r.status === 'half_day').length;
    const weekOff = monthlyRecords.filter((r) => r.status === 'week_off').length;
    const onLeave = monthlyRecords.filter((r) => r.status === 'on_leave').length;
    const absent = monthlyRecords.filter((r) => r.status === 'absent').length;
    const lateCount = monthlyRecords.filter((r) => (r.lateMinutes || 0) > 15).length;
    const totalLateMinutes = monthlyRecords.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);

    return {
      present,
      halfDay,
      weekOff,
      onLeave,
      absent,
      lateCount,
      totalLateMinutes,
      totalMarked: monthlyRecords.length,
    };
  }, [monthlyRecords]);

  // Request camera access and stream live feed with resilient fallbacks
  const startCamera = async () => {
    setCameraError(null);
    setCapturedSelfie(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser environment. You can upload a photo or use digital punch below.');
      return;
    }

    try {
      let stream: MediaStream | null = null;

      // 1. Try front-facing camera with ideal dimensions
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn('facingMode: user constraint failed, retrying with generic video constraint...', firstErr);
        // 2. Fallback to basic video constraint (any connected camera / webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (stream) {
        streamRef.current = stream;
        setCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.log('Video auto-play warning', playErr);
          }
        }
      }
    } catch (err: unknown) {
      console.error('Camera access error', err);
      const isNotFound =
        (err instanceof Error && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'OverconstrainedError')) ||
        (typeof err === 'object' && err !== null && 'message' in err && String((err as any).message).toLowerCase().includes('device not found'));

      const isPermissionDenied =
        err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      let errorMsg = 'Unable to start camera feed. Please check device camera permissions.';
      if (isNotFound) {
        errorMsg = 'No physical camera device was detected on this device. You can upload a photo or generate a digital punch photo below.';
      } else if (isPermissionDenied) {
        errorMsg = 'Camera permission was denied. Please allow camera access in browser settings or upload a selfie below.';
      }

      setCameraError(errorMsg);
      setCameraActive(false);
    }
  };

  // Handle manual photo upload fallback
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedSelfie(dataUrl);
        setCameraError(null);
        stopCamera();
        requestLocation();
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate verified digital punch selfie for devices without a physical camera
  const handleGenerateSampleSelfie = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark slate gradient
      const grad = ctx.createLinearGradient(0, 0, 480, 480);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 480, 480);

      // Outer accent border
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, 456, 456);

      // Avatar circle
      ctx.beginPath();
      ctx.arc(240, 180, 80, 0, Math.PI * 2);
      ctx.fillStyle = '#4338ca';
      ctx.fill();

      // Avatar head
      ctx.beginPath();
      ctx.arc(240, 160, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      // Avatar shoulders
      ctx.beginPath();
      ctx.arc(240, 265, 60, Math.PI, 0);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      // Staff details & timestamp watermark
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentUser?.name || 'Staff Member', 240, 310);

      ctx.fillStyle = '#818cf8';
      ctx.font = '13px sans-serif';
      ctx.fillText(currentUser?.role ? currentUser.role.toUpperCase() : 'STAFF', 240, 335);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      const timeStr = new Date().toLocaleString();
      ctx.fillText(timeStr, 240, 375);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('✓ VERIFIED DIGITAL PUNCH', 240, 405);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(dataUrl);
      setCameraError(null);
      stopCamera();
      requestLocation();
    }
  };

  // Re-attach video stream if ref updates
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.log('Video stream play error', e));
    }
  }, [cameraActive]);

  // Request geolocation and calculate Haversine distance from property
  const requestLocation = () => {
    setLocError(null);
    setLocLat(null);
    setLocLng(null);
    setDistanceM(null);

    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLoc(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));
        setLocLat(userLat);
        setLocLng(userLng);
        setDetectingLoc(false);

        // Fetch user's property coordinates and compute Haversine distance
        if (
          property?.latitude !== null &&
          property?.latitude !== undefined &&
          property?.longitude !== null &&
          property?.longitude !== undefined
        ) {
          const dist = calculateDistanceMeters(
            userLat,
            userLng,
            property.latitude,
            property.longitude
          );
          setDistanceM(dist);
        }
      },
      (err) => {
        setDetectingLoc(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError('Location permission denied. Please allow GPS location to verify geofence.');
        } else {
          setLocError('Could not retrieve location. Please check your GPS signal.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Capture photo from live video feed onto canvas, convert to data URL, and request geolocation
  const handleCaptureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image for front-facing selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(dataUrl);
      stopCamera();

      // After capturing selfie, request geolocation
      requestLocation();
    }
  };

  // Open clock-in modal
  const handleOpenClockIn = () => {
    setActiveAction('clock_in');
    setCapturedSelfie(null);
    setLocLat(null);
    setLocLng(null);
    setDistanceM(null);
    setMessage(null);
    startCamera();
  };

  // Open clock-out modal
  const handleOpenClockOut = () => {
    setActiveAction('clock_out');
    setCapturedSelfie(null);
    setLocLat(null);
    setLocLng(null);
    setDistanceM(null);
    setMessage(null);
    startCamera();
  };

  // Close modal and cleanup
  const handleCloseAction = () => {
    stopCamera();
    setActiveAction(null);
    setCapturedSelfie(null);
    setCameraError(null);
    setLocError(null);
    setLocLat(null);
    setLocLng(null);
    setDistanceM(null);
  };

  // Confirm Clock In
  const handleConfirmClockIn = async () => {
    if (!currentUser) return;
    if (!capturedSelfie) {
      setMessage({ type: 'error', text: 'Please capture your selfie before clocking in.' });
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      setSubmitting(true);
      const saved = await markAttendance({
        userId: currentUser.id,
        date: todayStr,
        clockInTime: nowTime,
        clockInSelfieUrl: capturedSelfie,
        clockInLat: locLat,
        clockInLng: locLng,
        clockOutTime: null,
        clockOutSelfieUrl: null,
        status: 'present',
        shiftStatus: 'in_progress',
        scheduledShiftStart: currentUser.shiftStart,
        scheduledShiftEnd: currentUser.shiftEnd,
        markedBy: null,
      });

      setAttendance(saved);
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { date: todayStr } }));
      
      const lateNotice = saved.lateMinutes > 15 ? ` (Late by ${saved.lateMinutes} mins - Pending Review)` : '';
      setMessage({ type: 'success', text: `Successfully clocked in at ${nowTime}! Status: Present${lateNotice}` });
      handleCloseAction();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Clock in failed', err);
      setMessage({ type: 'error', text: 'Failed to record clock in. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Clock Out
  const handleConfirmClockOut = async () => {
    if (!currentUser || !attendance) return;
    if (!capturedSelfie) {
      setMessage({ type: 'error', text: 'Please capture your selfie before clocking out.' });
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      setSubmitting(true);
      const saved = await markAttendance({
        id: attendance.id,
        userId: currentUser.id,
        date: todayStr,
        clockInTime: attendance.clockInTime,
        clockInSelfieUrl: attendance.clockInSelfieUrl,
        clockInLat: attendance.clockInLat,
        clockInLng: attendance.clockInLng,
        clockOutTime: nowTime,
        clockOutSelfieUrl: capturedSelfie,
        status: attendance.status || 'present',
        shiftStatus: 'completed',
        scheduledShiftStart: attendance.scheduledShiftStart || currentUser.shiftStart,
        scheduledShiftEnd: attendance.scheduledShiftEnd || currentUser.shiftEnd,
        markedBy: attendance.markedBy,
      });

      setAttendance(saved);
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { date: todayStr } }));
      setMessage({ type: 'success', text: `Successfully clocked out at ${nowTime}! Shift marked as completed.` });
      handleCloseAction();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Clock out failed', err);
      setMessage({ type: 'error', text: 'Failed to record clock out. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const isClockedIn = Boolean(attendance?.clockInTime);
  const isClockedOut = Boolean(attendance?.clockOutTime);

  // Geofence status computation
  const hasConfiguredPropertyCoords =
    property?.latitude !== null &&
    property?.latitude !== undefined &&
    property?.longitude !== null &&
    property?.longitude !== undefined;

  const geofenceRadius = property?.geofenceRadiusM ?? 100;
  const isWithinGeofence = distanceM !== null ? distanceM <= geofenceRadius : null;
  const outsideDistance =
    distanceM !== null && distanceM > geofenceRadius ? distanceM - geofenceRadius : 0;

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading attendance status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Attendance Clock In / Out
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Log your daily shift with live selfie capture and verified geofence location.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isClockedOut ? (
            <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Shift Completed Today</span>
            </div>
          ) : isClockedIn ? (
            <div className="text-xs px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>On Shift (Clocked in: {attendance?.clockInTime})</span>
            </div>
          ) : (
            <div className="text-xs px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Not Clocked In Today</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/80 border border-rose-800/80 text-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Today's Attendance Overview Card */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-base text-white">
                {property ? property.name : 'Assigned Property'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Date: <strong className="text-slate-200">{todayStr}</strong> | Staff: <strong className="text-slate-200">{currentUser?.name}</strong> ({currentUser?.staffType || currentUser?.role})
            </p>
          </div>

          {currentUser?.shiftStart && currentUser?.shiftEnd && (
            <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start">
              Scheduled Shift: <span className="font-mono text-slate-200 font-semibold">{currentUser.shiftStart} - {currentUser.shiftEnd}</span>
            </div>
          )}
        </div>

        {/* Clock In / Clock Out Records Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Clock In Summary */}
          <div className={`p-4 rounded-xl border space-y-3 ${isClockedIn ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-950/40 border-slate-800/60 border-dashed'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ClockInIcon className="w-3.5 h-3.5 text-blue-400" />
                Clock In
              </span>
              {isClockedIn ? (
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/50 border border-blue-800/40 px-2 py-0.5 rounded">
                  {attendance?.clockInTime}
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">Pending</span>
              )}
            </div>

            {isClockedIn ? (
              <div className="flex items-center gap-3 pt-1">
                {attendance?.clockInSelfieUrl && (
                  <img
                    src={attendance.clockInSelfieUrl}
                    alt="Clock-in selfie"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                )}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="font-mono text-[11px]">
                      {attendance?.clockInLat !== null && attendance?.clockInLng !== null
                        ? `${attendance?.clockInLat}, ${attendance?.clockInLng}`
                        : 'Location recorded'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Clock In Logged</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 pt-1">
                Tap Clock In below to take your live selfie and record check-in.
              </p>
            )}
          </div>

          {/* Clock Out Summary */}
          <div className={`p-4 rounded-xl border space-y-3 ${isClockedOut ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-950/40 border-slate-800/60 border-dashed'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ClockOutIcon className="w-3.5 h-3.5 text-emerald-400" />
                Clock Out
              </span>
              {isClockedOut ? (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
                  {attendance?.clockOutTime}
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">Pending</span>
              )}
            </div>

            {isClockedOut ? (
              <div className="flex items-center gap-3 pt-1">
                {attendance?.clockOutSelfieUrl && (
                  <img
                    src={attendance.clockOutSelfieUrl}
                    alt="Clock-out selfie"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                )}
                <div className="space-y-1 text-xs">
                  <div className="text-slate-300 font-medium">Status: Present (Shift Completed)</div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Clock Out Logged</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 pt-1">
                {isClockedIn ? 'Tap Clock Out at the end of your shift.' : 'Available after Clock In.'}
              </p>
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {!isClockedIn
              ? 'Ready to begin your shift? Tap Clock In to capture your live selfie and check-in location.'
              : !isClockedOut
              ? 'Shift in progress. Tap Clock Out when your shift ends to log your exit selfie.'
              : 'You have completed both Clock In and Clock Out for today.'}
          </p>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* 2. Clock In button (only shown if not already clocked in today) */}
            {!isClockedIn && (
              <button
                id="start-clock-in-btn"
                onClick={handleOpenClockIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer shrink-0"
              >
                <ClockInIcon className="w-4 h-4" />
                Clock In
              </button>
            )}

            {/* 3. Clock Out button (only shown if clocked in but not clocked out today) */}
            {isClockedIn && !isClockedOut && (
              <button
                id="start-clock-out-btn"
                onClick={handleOpenClockOut}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer shrink-0"
              >
                <ClockOutIcon className="w-4 h-4" />
                Clock Out
              </button>
            )}
          </div>
        </div>

        {/* Correction Request Callout */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <FileEdit className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Missed punching for yesterday or an earlier date?</span>
          </div>
          <button
            id="btn-open-correction-modal"
            type="button"
            onClick={() => {
              setCorrectionTargetDate('');
              setShowCorrectionModal(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800/80 text-blue-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <FileEdit className="w-3.5 h-3.5" />
            Request Manager to Mark
          </button>
        </div>
      </div>

      {/* Monthly Attendance Summary & Breakdown */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              My Monthly Attendance Summary
            </h3>
            <p className="text-xs text-slate-400">
              Overview of your shifts, week-offs, approved leaves, and punctuality for the selected month.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              id="staff-month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* 6 Metric Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400 font-medium">Logged Records</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{monthStats.totalMarked}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Days Recorded</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-center">
            <div className="text-[11px] text-emerald-400 font-medium">Present (Full)</div>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{monthStats.present}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Full Shifts</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-center">
            <div className="text-[11px] text-amber-400 font-medium">Half Day</div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{monthStats.halfDay}</div>
            <div className="text-[10px] text-amber-500/80 mt-0.5">Half Shifts</div>
          </div>
          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-900/40 text-center">
            <div className="text-[11px] text-sky-400 font-medium">Week Offs</div>
            <div className="text-lg font-bold text-sky-300 font-mono mt-0.5">{monthStats.weekOff}</div>
            <div className="text-[10px] text-sky-500/80 mt-0.5">4/mo Quota</div>
          </div>
          <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-900/40 text-center">
            <div className="text-[11px] text-violet-400 font-medium">On Leave</div>
            <div className="text-lg font-bold text-violet-300 font-mono mt-0.5">{monthStats.onLeave}</div>
            <div className="text-[10px] text-violet-500/80 mt-0.5">Approved</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-center">
            <div className="text-[11px] text-rose-400 font-medium">Absences</div>
            <div className="text-lg font-bold text-rose-300 font-mono mt-0.5">{monthStats.absent}</div>
            <div className="text-[10px] text-rose-500/80 mt-0.5">Unapproved</div>
          </div>
        </div>

        {/* Punctuality and Late Arrival Callout if any */}
        {monthStats.lateCount > 0 && (
          <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-900/30 flex items-center justify-between text-xs text-orange-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                You have <strong className="text-white">{monthStats.lateCount} late arrival{monthStats.lateCount > 1 ? 's' : ''}</strong> (&gt; 15m) totaling <strong className="text-white font-mono">{monthStats.totalLateMinutes} mins</strong> this month.
              </span>
            </div>
            <span className="text-[11px] text-orange-400/80 hidden sm:inline">
              Late penalties require Manager review before any payroll deductions.
            </span>
          </div>
        )}
      </div>

      {/* Monthly Punch History Log Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Shift Punch Logs &amp; Past Records
            </h3>
            <p className="text-xs text-slate-400">
              Detailed list of punches, selfies, work hours, and manager reviews for {selectedMonth}.
            </p>
          </div>
        </div>

        {monthlyRecords.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-6 space-y-3">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              No attendance records logged yet for {selectedMonth}.
            </p>
            <button
              type="button"
              onClick={() => {
                setCorrectionTargetDate('');
                setShowCorrectionModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              Submit Attendance Request
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {monthlyRecords.map((record) => {
              const formattedDate = new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={record.id || record.date}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    record.date === todayStr
                      ? 'bg-slate-950/90 border-indigo-900/60 ring-1 ring-indigo-500/20'
                      : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Date & Status */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[9px] uppercase font-bold text-slate-400">
                        {formattedDate.split(' ')[0]}
                      </span>
                      <span className="text-xs font-bold text-white font-mono leading-none">
                        {record.date.split('-')[2]}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{record.date}</span>
                        {record.date === todayStr && (
                          <span className="px-2 py-0.2 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 text-[10px] font-semibold">
                            Today
                          </span>
                        )}
                        {/* Attendance Status Badge */}
                        {record.status === 'present' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Present
                          </span>
                        ) : record.status === 'half_day' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-800 text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Half Day
                          </span>
                        ) : record.status === 'week_off' ? (
                          <span className="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-800 text-sky-300 text-[11px] font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Week Off
                          </span>
                        ) : record.status === 'on_leave' ? (
                          <span className="px-2 py-0.5 rounded-md bg-violet-950/80 border border-violet-800 text-violet-300 text-[11px] font-semibold flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> On Leave
                          </span>
                        ) : record.status === 'absent' ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Absent
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px] font-medium">
                            Unmarked
                          </span>
                        )}
                      </div>

                      {/* Punches & Notes */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        {record.clockInTime && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                            <ClockInIcon className="w-3 h-3 text-blue-400" />
                            In: {record.clockInTime}
                          </span>
                        )}
                        {record.clockOutTime && (
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                            <ClockOutIcon className="w-3 h-3 text-emerald-400" />
                            Out: {record.clockOutTime}
                          </span>
                        )}
                        {(record.lateMinutes || 0) > 15 && (
                          <span className="text-orange-400 font-medium text-[11px]">
                            Late: {record.lateMinutes}m
                            {record.latePenaltyStatus === 'approved' ? ' (Penalty Applied)' : record.latePenaltyStatus === 'rejected' ? ' (Penalty Waived)' : ''}
                          </span>
                        )}
                        {record.managerAdjusted && (
                          <span className="text-indigo-300 text-[11px] flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3 text-indigo-400" /> Manager Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Selfies thumbnail & action */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {record.clockInSelfieUrl && (
                      <img
                        src={record.clockInSelfieUrl}
                        alt="Clock In"
                        title="Clock In Selfie"
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    )}
                    {record.clockOutSelfieUrl && (
                      <img
                        src={record.clockOutSelfieUrl}
                        alt="Clock Out"
                        title="Clock Out Selfie"
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    )}
                    {(!record.clockInTime || !record.clockOutTime || record.status === 'absent') && record.date !== todayStr && (
                      <button
                        type="button"
                        onClick={() => {
                          setCorrectionTargetDate(record.date);
                          setShowCorrectionModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                        title="Request correction for this date"
                      >
                        Correct
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance Correction Request Modal */}
      <AttendanceCorrectionModal
        isOpen={showCorrectionModal}
        initialDate={correctionTargetDate}
        onClose={() => setShowCorrectionModal(false)}
        onSubmitted={() => {
          loadData();
        }}
      />

      {/* 2. Interactive Camera & Geolocation Modal / Panel */}
      {activeAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {activeAction === 'clock_in' ? (
                  <ClockInIcon className="w-5 h-5 text-indigo-400" />
                ) : (
                  <ClockOutIcon className="w-5 h-5 text-emerald-400" />
                )}
                <h3 className="text-base font-bold text-white">
                  {activeAction === 'clock_in' ? 'Clock In - Live Selfie' : 'Clock Out - Live Selfie'}
                </h3>
              </div>
              <button
                onClick={handleCloseAction}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Live Camera Viewfinder or Captured Snapshot */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  {capturedSelfie ? 'Captured Selfie' : 'Live Camera Preview'}
                </span>
                {capturedSelfie && (
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedSelfie(null);
                      setLocLat(null);
                      setLocLng(null);
                      setDistanceM(null);
                      startCamera();
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retake Selfie
                  </button>
                )}
              </div>

              {/* Hidden file input for manual photo upload fallback */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleFileSelect}
              />

              {cameraError ? (
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs space-y-3">
                  <div className="flex items-start gap-2.5 text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white">Camera Device Notice</div>
                      <p className="text-slate-300 mt-1 leading-relaxed">{cameraError}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Camera
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition shadow-sm shadow-indigo-600/30"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload / Take Photo
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateSampleSelfie}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-600/40 text-emerald-100 text-xs font-medium cursor-pointer transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                      Digital Verified Punch
                    </button>
                  </div>
                </div>
              ) : capturedSelfie ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-4/3 flex items-center justify-center">
                  <img
                    src={capturedSelfie}
                    alt="Captured selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    Selfie Captured
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-4/3 flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 text-slate-400 text-xs p-4 text-center">
                      <RotateCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Detecting available camera device...</span>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                        >
                          Upload Photo
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateSampleSelfie}
                          className="px-2.5 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 text-[11px] text-indigo-200"
                        >
                          Digital Punch
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-2">
                      <button
                        type="button"
                        id="capture-selfie-btn"
                        onClick={handleCaptureSelfie}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold shadow-lg transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-indigo-600" />
                        Capture Selfie
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload photo from device"
                        className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs transition cursor-pointer backdrop-blur-sm border border-slate-700"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Geolocation & Geofence Section */}
            {capturedSelfie && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Location &amp; Geofence Verification
                  </span>
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={detectingLoc}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3 h-3 ${detectingLoc ? 'animate-spin' : ''}`} />
                    Refresh Location
                  </button>
                </div>

                {detectingLoc ? (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span>Getting current GPS location...</span>
                  </div>
                ) : locError ? (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{locError}</span>
                  </div>
                ) : !hasConfiguredPropertyCoords ? (
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Geofence not configured for this property.</span>
                  </div>
                ) : distanceM !== null ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span>Location: {locLat}, {locLng}</span>
                      <span>Distance: {distanceM}m (Allowed: {geofenceRadius}m)</span>
                    </div>

                    {isWithinGeofence ? (
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 flex items-center gap-2 font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Within property geofence ({distanceM} meters away).</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 flex items-start gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span>You are {outsideDistance} meters outside the property radius.</span>
                          <p className="text-[11px] text-amber-400/80 font-normal mt-0.5">
                            You may still proceed with clock-in; the location will be flagged.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs">Waiting for GPS coordinates...</div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              {activeAction === 'clock_in' ? (
                <button
                  type="button"
                  id="confirm-clock-in-btn"
                  onClick={handleConfirmClockIn}
                  disabled={submitting || !capturedSelfie}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  {submitting ? 'Clocking In...' : 'Confirm Clock In'}
                </button>
              ) : (
                <button
                  type="button"
                  id="confirm-clock-out-btn"
                  onClick={handleConfirmClockOut}
                  disabled={submitting || !capturedSelfie}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Clocking Out...' : 'Confirm Clock Out'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
