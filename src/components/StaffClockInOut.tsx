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
  Building2,
  RefreshCw,
  UserCheck,
  FileEdit,
  Calendar,
  CalendarDays,
  History,
  Timer,
  ChevronRight,
  Sun,
  Moon,
  Check,
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

// Helper to compute minutes difference between two HH:MM strings
function computeMinutesBetween(start: string, end: string): number {
  try {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
    let diff = endH * 60 + endM - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // handle overnight
    return diff;
  } catch {
    return 0;
  }
}

// Helper to format minutes into "Xh Ym"
function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type PunchActionType = 'shift1_in' | 'shift1_out' | 'shift2_in' | 'shift2_out';

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

  // Client-Side Live Digital Clock (Updates every 1000ms, zero server load)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Active Punch Modal Action
  const [activeAction, setActiveAction] = useState<PunchActionType | null>(null);

  // Camera & selfie state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  // Stop camera tracks
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

  // Load today's AttendanceRecord and past history for the current user
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
    const totalWorkedHours = monthlyRecords.reduce((acc, r) => acc + (r.totalHours || 0), 0);

    return {
      present,
      halfDay,
      weekOff,
      onLeave,
      absent,
      lateCount,
      totalLateMinutes,
      totalWorkedHours: Number(totalWorkedHours.toFixed(1)),
      totalMarked: monthlyRecords.length,
    };
  }, [monthlyRecords]);

  // Request camera access and stream live feed (Mandatory Live Camera)
  const startCamera = async () => {
    setCameraError(null);
    setCapturedSelfie(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser environment. Please enable camera access.');
      return;
    }

    try {
      let stream: MediaStream | null = null;
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
        console.warn('facingMode: user constraint failed, trying generic video constraint...', firstErr);
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
        (err instanceof Error && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) ||
        (typeof err === 'object' && err !== null && 'message' in err && String((err as any).message).toLowerCase().includes('device not found'));

      const isPermissionDenied =
        err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');

      let errorMsg = 'Unable to start camera feed. Please check device camera permissions.';
      if (isNotFound) {
        errorMsg = 'No camera device detected on this system. Please connect a webcam.';
      } else if (isPermissionDenied) {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings.';
      }

      setCameraError(errorMsg);
      setCameraActive(false);
    }
  };

  // Re-attach video stream if ref updates
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.log('Video stream play error', e));
    }
  }, [cameraActive]);

  // Request geolocation and calculate Haversine distance
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
          setLocError('Location permission denied. Please enable GPS.');
        } else {
          setLocError('Could not retrieve GPS location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Capture photo from live video feed
  const handleCaptureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image for front-facing camera
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfie(dataUrl);
      stopCamera();
      requestLocation();
    }
  };

  // Open specific Punch modal
  const handleOpenAction = (action: PunchActionType) => {
    setActiveAction(action);
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

  // Haversine distance, time parsing helpers
  const toMinutes = (timeStr?: string | null): number => {
    if (!timeStr) return 0;
    try {
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return 0;
      return h * 60 + m;
    } catch {
      return 0;
    }
  };

  // Shift Timing Configuration for Current User
  const shift1StartStr = currentUser?.shift1Start || currentUser?.shiftStart || '08:00';
  const shift1EndStr = currentUser?.shift1End || (currentUser?.shift2Start ? '14:00' : currentUser?.shiftEnd) || '17:00';
  const hasShift2 = Boolean(currentUser?.shift2Start && currentUser?.shift2End);
  const shift2StartStr = currentUser?.shift2Start || null;
  const shift2EndStr = currentUser?.shift2End || null;

  // Time calculations against current system time (currentTime)
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const s1StartMin = toMinutes(shift1StartStr);
  const s1EndMin = toMinutes(shift1EndStr);
  const s2StartMin = shift2StartStr ? toMinutes(shift2StartStr) : null;
  const s2EndMin = shift2EndStr ? toMinutes(shift2EndStr) : null;

  // Sequential Punch State Determination
  const shift1In = attendance?.shift1ClockInTime || attendance?.shift1InTime || attendance?.clockInTime || null;
  const shift1Out = attendance?.shift1ClockOutTime || attendance?.shift1OutTime || (attendance?.shift2ClockInTime ? null : (attendance?.shiftStatus === 'completed' ? attendance?.clockOutTime : null)) || null;
  const shift2In = attendance?.shift2ClockInTime || attendance?.shift2InTime || null;
  const shift2Out = attendance?.shift2ClockOutTime || attendance?.shift2OutTime || null;

  // Shift 1 Time Gating Check
  // If no punch in for Shift 1 and current time is past Shift 1 end time -> Shift 1 is missed!
  const isShift1Expired = !shift1In && currentMinutes > s1EndMin;
  const isShift1Active = !isShift1Expired && (!shift1In || (shift1In && !shift1Out));
  const isShift1Completed = Boolean(shift1In && shift1Out);

  // Shift 2 Time Gating Check
  const isShift2Early = hasShift2 && s2StartMin !== null && currentMinutes < (s2StartMin - 30);
  const isShift2InWindow = hasShift2 && s2StartMin !== null && currentMinutes >= (s2StartMin - 30) && (s2EndMin === null || currentMinutes <= (s2EndMin + 120));
  const isShift2Expired = hasShift2 && s2EndMin !== null && currentMinutes > (s2EndMin + 120) && !shift2In;
  const isShift2Completed = Boolean(shift2In && shift2Out);

  // Determine which punch action is logically next and whether it is permitted right now
  let activeShiftAction: PunchActionType | null = null;
  let actionDisabledReason: string | null = null;
  let currentStep = 1;

  if (!shift1In && !isShift1Expired) {
    // Punch 1: Shift 1 In is valid
    currentStep = 1;
    activeShiftAction = 'shift1_in';
  } else if (shift1In && !shift1Out) {
    // Punch 2: Shift 1 Out
    currentStep = 2;
    activeShiftAction = 'shift1_out';
  } else if (hasShift2 && !shift2In && !isShift2Completed && !isShift2Expired) {
    // Punch 3: Shift 2 In
    currentStep = 3;
    activeShiftAction = 'shift2_in';
    if (isShift2Early && s2StartMin !== null) {
      const diffMins = s2StartMin - currentMinutes;
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      actionDisabledReason = `Shift 2 starts at ${shift2StartStr} (opens in ${hrs > 0 ? `${hrs}h ` : ''}${mins}m). Early clock-in opens 30 mins before shift.`;
    }
  } else if (hasShift2 && shift2In && !shift2Out) {
    // Punch 4: Shift 2 Out
    currentStep = 4;
    activeShiftAction = 'shift2_out';
  } else {
    // Step 5: Day finished or all shift windows completed
    currentStep = 5;
    activeShiftAction = null;
  }

  const isDayFullyCompleted = currentStep === 5 || isShift2Completed || (isShift1Completed && !hasShift2) || attendance?.shiftStatus === 'completed';

  // Confirm Punch Submission
  const handleConfirmPunch = async () => {
    if (!currentUser || !activeAction) return;
    if (!capturedSelfie) {
      setMessage({ type: 'error', text: 'Please capture your live camera photo first.' });
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      setSubmitting(true);
      let updatedRecord: Partial<AttendanceRecord> = {
        userId: currentUser.id,
        date: todayStr,
        scheduledShiftStart: currentUser.shiftStart,
        scheduledShiftEnd: currentUser.shiftEnd,
        shift1Start: shift1StartStr,
        shift1End: shift1EndStr,
        shift2Start: shift2StartStr,
        shift2End: shift2EndStr,
        status: 'present',
      };

      if (attendance?.id) {
        updatedRecord.id = attendance.id;
      }

      if (activeAction === 'shift1_in') {
        updatedRecord = {
          ...attendance,
          ...updatedRecord,
          shift1ClockInTime: nowTime,
          shift1ClockInSelfieUrl: capturedSelfie,
          shift1ClockInLat: locLat,
          shift1ClockInLng: locLng,
          shift1InTime: nowTime,
          shift1InSelfieUrl: capturedSelfie,
          shift1InLat: locLat,
          shift1InLng: locLng,
          clockInTime: nowTime,
          clockInSelfieUrl: capturedSelfie,
          clockInLat: locLat,
          clockInLng: locLng,
          shiftStatus: 'in_progress',
        };
      } else if (activeAction === 'shift1_out') {
        const s1In = shift1In || nowTime;
        const s1Worked = computeMinutesBetween(s1In, nowTime);
        updatedRecord = {
          ...attendance,
          ...updatedRecord,
          shift1ClockInTime: s1In,
          shift1ClockOutTime: nowTime,
          shift1ClockOutSelfieUrl: capturedSelfie,
          shift1ClockOutLat: locLat,
          shift1ClockOutLng: locLng,
          shift1WorkedMinutes: s1Worked,
          shift1InTime: s1In,
          shift1OutTime: nowTime,
          shift1OutSelfieUrl: capturedSelfie,
          shift1OutLat: locLat,
          shift1OutLng: locLng,
          clockOutTime: nowTime,
          clockOutSelfieUrl: capturedSelfie,
          workedMinutes: s1Worked,
          totalHours: Number((s1Worked / 60).toFixed(2)),
          shiftStatus: hasShift2 ? 'in_progress' : 'completed',
        };
      } else if (activeAction === 'shift2_in') {
        updatedRecord = {
          ...attendance,
          ...updatedRecord,
          shift2ClockInTime: nowTime,
          shift2ClockInSelfieUrl: capturedSelfie,
          shift2ClockInLat: locLat,
          shift2ClockInLng: locLng,
          shift2InTime: nowTime,
          shift2InSelfieUrl: capturedSelfie,
          shift2InLat: locLat,
          shift2InLng: locLng,
          shiftStatus: 'in_progress',
        };
      } else if (activeAction === 'shift2_out') {
        const s2In = shift2In || nowTime;
        const s2Worked = computeMinutesBetween(s2In, nowTime);
        const s1Worked = attendance?.shift1WorkedMinutes || (shift1In && shift1Out ? computeMinutesBetween(shift1In, shift1Out) : 0);
        const totalWorked = s1Worked + s2Worked;

        updatedRecord = {
          ...attendance,
          ...updatedRecord,
          shift2ClockInTime: s2In,
          shift2ClockOutTime: nowTime,
          shift2ClockOutSelfieUrl: capturedSelfie,
          shift2ClockOutLat: locLat,
          shift2ClockOutLng: locLng,
          shift2WorkedMinutes: s2Worked,
          shift2InTime: s2In,
          shift2OutTime: nowTime,
          shift2OutSelfieUrl: capturedSelfie,
          shift2OutLat: locLat,
          shift2OutLng: locLng,
          clockOutTime: nowTime,
          clockOutSelfieUrl: capturedSelfie,
          workedMinutes: totalWorked,
          totalHours: Number((totalWorked / 60).toFixed(2)),
          shiftStatus: 'completed',
          status: (s1Worked > 0 && s2Worked > 0) ? 'present' : 'half_day',
        };
      }

      const saved = await markAttendance(updatedRecord as any);
      setAttendance(saved);
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { date: todayStr } }));

      let actionLabel = 'Shift 1 Clock In';
      if (activeAction === 'shift1_out') actionLabel = 'Shift 1 Clock Out';
      if (activeAction === 'shift2_in') actionLabel = 'Shift 2 Clock In';
      if (activeAction === 'shift2_out') actionLabel = 'Shift 2 Clock Out';

      setMessage({ type: 'success', text: `Successfully recorded ${actionLabel} at ${nowTime}!` });
      handleCloseAction();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Punch recording failed', err);
      setMessage({ type: 'error', text: 'Failed to record punch. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Finalize Day as Complete (Single shift worked)
  const handleMarkDayCompleted = async () => {
    if (!currentUser || !attendance) return;
    try {
      setSubmitting(true);
      const saved = await markAttendance({
        ...attendance,
        shiftStatus: 'completed',
      });
      setAttendance(saved);
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { date: todayStr } }));
      setMessage({ type: 'success', text: 'Daily attendance marked as completed.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Failed to finalize day', err);
    } finally {
      setSubmitting(false);
    }
  };

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

  // Formatted Live Clock Strings
  const formattedLiveTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedLiveDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
      {/* 1. TOP LIVE DIGITAL CLOCK & DATE BAR (1000ms Ticking, zero server load) */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-slate-800 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Clock
              </span>
              <span className="text-xs text-slate-400">{property ? property.name : 'Hostel Operations'}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight mt-0.5">
              {formattedLiveTime}
            </div>
          </div>
        </div>

        <div className="text-center sm:text-right border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 w-full sm:w-auto">
          <div className="text-xs text-slate-400 font-medium">{formattedLiveDate}</div>
          <div className="text-xs text-slate-300 font-semibold mt-1">
            Logged in: <span className="text-indigo-300">{currentUser?.name}</span> ({currentUser?.staffType || currentUser?.role})
          </div>
        </div>
      </div>

      {/* Global Status Notifications */}
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

      {/* 2. MULTI-SHIFT PUNCH CONTROLS & 4-PUNCH WORKFLOW */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-400" />
              Daily Shift Attendance &amp; Multi-Shift Punches
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Record Shift 1 &amp; Shift 2 punches using live camera capture.
            </p>
          </div>

          {/* Overall Status Badge */}
          <div className="self-start sm:self-auto">
            {isDayFullyCompleted ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                All Shifts Completed Today
              </span>
            ) : currentStep === 2 ? (
              <span className="px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Shift 1 in Progress
              </span>
            ) : currentStep === 3 ? (
              <span className="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                Shift 1 Completed (Shift 2 Pending)
              </span>
            ) : currentStep === 4 ? (
              <span className="px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                Shift 2 in Progress
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Not Clocked In Today
              </span>
            )}
          </div>
        </div>

        {/* Time-Gated Active Shift Status Banner */}
        {isShift1Expired && !shift1In && hasShift2 && !shift2In && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-100">
                Shift 1 Window Expired ({shift1StartStr} – {shift1EndStr})
              </div>
              <p className="text-amber-300/90 leading-relaxed">
                The morning shift time has passed. The system has automatically shifted focus to your next scheduled shift: <strong className="text-white">Shift 2 ({shift2StartStr} – {shift2EndStr})</strong>.
              </p>
              {actionDisabledReason && (
                <div className="text-[11px] text-amber-400 font-medium pt-1">
                  ⏳ {actionDisabledReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sequential Punch Steps Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className={`p-3 rounded-xl border text-center transition ${shift1In ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300' : isShift1Expired ? 'bg-rose-950/20 border-rose-900/50 text-rose-400' : currentStep === 1 ? 'bg-slate-950 border-indigo-500/80 ring-1 ring-indigo-500' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider">Punch 1</div>
            <div className="text-xs font-bold text-white mt-0.5">Shift 1 In</div>
            <div className="text-[11px] font-mono mt-1">
              {shift1In ? shift1In : isShift1Expired ? 'Missed' : currentStep === 1 ? 'Active Now' : 'Pending'}
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center transition ${shift1Out ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300' : isShift1Expired ? 'bg-rose-950/20 border-rose-900/50 text-rose-400' : currentStep === 2 ? 'bg-slate-950 border-indigo-500/80 ring-1 ring-indigo-500' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider">Punch 2</div>
            <div className="text-xs font-bold text-white mt-0.5">Shift 1 Out</div>
            <div className="text-[11px] font-mono mt-1">
              {shift1Out ? shift1Out : isShift1Expired ? 'Missed' : currentStep === 2 ? 'Active Next' : 'Pending'}
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center transition ${shift2In ? 'bg-purple-950/40 border-purple-800/60 text-purple-300' : hasShift2 && currentStep === 3 ? 'bg-slate-950 border-purple-500/80 ring-1 ring-purple-500' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider">Punch 3</div>
            <div className="text-xs font-bold text-white mt-0.5">Shift 2 In</div>
            <div className="text-[11px] font-mono mt-1">
              {shift2In ? shift2In : hasShift2 && currentStep === 3 ? (isShift2Early ? 'Upcoming' : 'Active Now') : hasShift2 ? 'Pending' : 'N/A (Single Shift)'}
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center transition ${shift2Out ? 'bg-purple-950/40 border-purple-800/60 text-purple-300' : hasShift2 && currentStep === 4 ? 'bg-slate-950 border-purple-500/80 ring-1 ring-purple-500' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider">Punch 4</div>
            <div className="text-xs font-bold text-white mt-0.5">Shift 2 Out</div>
            <div className="text-[11px] font-mono mt-1">
              {shift2Out ? shift2Out : hasShift2 && currentStep === 4 ? 'Active Next' : hasShift2 ? 'Pending' : 'N/A (Single Shift)'}
            </div>
          </div>
        </div>

        {/* 3. SHIFT 1 & SHIFT 2 CARDS (SIDE-BY-SIDE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shift 1 Card */}
          <div className={`p-4 rounded-xl border space-y-3.5 ${isShift1Expired && !shift1In ? 'bg-slate-950/40 border-slate-800 opacity-85' : 'bg-slate-950/70 border-slate-800'}`}>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="font-bold text-sm text-white block">Shift 1 (First Shift)</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {shift1StartStr} – {shift1EndStr}
                  </span>
                </div>
              </div>
              <div>
                {shift1In && shift1Out ? (
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded">
                    {formatDuration(attendance?.shift1WorkedMinutes || computeMinutesBetween(shift1In, shift1Out))}
                  </span>
                ) : isShift1Expired ? (
                  <span className="text-[11px] font-semibold text-rose-400 bg-rose-950/50 border border-rose-800/40 px-2 py-0.5 rounded">
                    Expired / Missed
                  </span>
                ) : shift1In ? (
                  <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/50 border border-blue-800/40 px-2 py-0.5 rounded">
                    In Progress
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    Not Clocked
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Shift 1 In */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <ClockInIcon className="w-3 h-3 text-blue-400" /> Clock In
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {shift1In || (isShift1Expired ? 'Missed' : '--:--')}
                  </span>
                </div>
                {attendance?.shift1InSelfieUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={attendance.shift1InSelfieUrl}
                      alt="Shift 1 In"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="text-[10px] text-slate-400 truncate">
                      Photo captured
                    </div>
                  </div>
                )}
              </div>

              {/* Shift 1 Out */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <ClockOutIcon className="w-3 h-3 text-emerald-400" /> Clock Out
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {shift1Out || (isShift1Expired ? 'Missed' : '--:--')}
                  </span>
                </div>
                {attendance?.shift1OutSelfieUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={attendance.shift1OutSelfieUrl}
                      alt="Shift 1 Out"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="text-[10px] text-slate-400 truncate">
                      Photo captured
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shift 2 Card */}
          <div className={`p-4 rounded-xl border space-y-3.5 ${!hasShift2 ? 'bg-slate-950/30 border-slate-800/50 opacity-60' : 'bg-slate-950/70 border-slate-800'}`}>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="font-bold text-sm text-white block">Shift 2 (Second Shift)</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {hasShift2 ? `${shift2StartStr} – ${shift2EndStr}` : 'Single Shift Profile'}
                  </span>
                </div>
              </div>
              <div>
                {!hasShift2 ? (
                  <span className="text-[11px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    Not Applicable
                  </span>
                ) : shift2In && shift2Out ? (
                  <span className="text-xs font-mono text-purple-400 bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 rounded">
                    {formatDuration(attendance?.shift2WorkedMinutes || computeMinutesBetween(shift2In, shift2Out))}
                  </span>
                ) : shift2In ? (
                  <span className="text-[11px] font-semibold text-purple-400 bg-purple-950/50 border border-purple-800/40 px-2 py-0.5 rounded">
                    In Progress
                  </span>
                ) : isShift2Early ? (
                  <span className="text-[11px] font-semibold text-amber-400 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded">
                    Starts at {shift2StartStr}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    Pending
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Shift 2 In */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <ClockInIcon className="w-3 h-3 text-purple-400" /> Clock In
                  </span>
                  <span className="font-mono text-xs font-bold text-purple-400">
                    {shift2In || '--:--'}
                  </span>
                </div>
                {attendance?.shift2InSelfieUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={attendance.shift2InSelfieUrl}
                      alt="Shift 2 In"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="text-[10px] text-slate-400 truncate">
                      Photo captured
                    </div>
                  </div>
                )}
              </div>

              {/* Shift 2 Out */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <ClockOutIcon className="w-3 h-3 text-emerald-400" /> Clock Out
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {shift2Out || '--:--'}
                  </span>
                </div>
                {attendance?.shift2OutSelfieUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={attendance.shift2OutSelfieUrl}
                      alt="Shift 2 Out"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="text-[10px] text-slate-400 truncate">
                      Photo captured
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Total Worked Hours Today Summary */}
        {(attendance?.workedMinutes || 0) > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Worked Duration Today:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatDuration(attendance?.workedMinutes)} ({attendance?.totalHours || (attendance?.workedMinutes ? (attendance.workedMinutes / 60).toFixed(2) : 0)} hrs)
            </span>
          </div>
        )}

        {/* 4. PRIMARY DYNAMIC ACTION BUTTONS (Time-Gated) */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 space-y-0.5">
            {currentStep === 1 ? (
              <p>Ready for Shift 1? Tap Clock In to capture your live camera photo.</p>
            ) : currentStep === 2 ? (
              <p>Shift 1 is active. Tap Clock Out when your first shift ends.</p>
            ) : currentStep === 3 ? (
              <p>{isShift1Expired ? `Shift 1 window closed. Active shift is Shift 2 (${shift2StartStr} - ${shift2EndStr}).` : 'Shift 1 completed! Tap Clock In for Shift 2 or mark day as complete.'}</p>
            ) : currentStep === 4 ? (
              <p>Shift 2 is active. Tap Clock Out to finish your second shift.</p>
            ) : (
              <p>All shift punches recorded for today.</p>
            )}
            {actionDisabledReason && (
              <p className="text-[11px] text-amber-400 font-medium">
                {actionDisabledReason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Step 1: Shift 1 Clock In (Only when Shift 1 is not expired) */}
            {currentStep === 1 && !isShift1Expired && (
              <button
                id="punch-shift1-in-btn"
                onClick={() => handleOpenAction('shift1_in')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer shrink-0"
              >
                <ClockInIcon className="w-4 h-4" />
                Punch 1: Shift 1 — Clock In
              </button>
            )}

            {/* Step 2: Shift 1 Clock Out */}
            {currentStep === 2 && (
              <button
                id="punch-shift1-out-btn"
                onClick={() => handleOpenAction('shift1_out')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer shrink-0"
              >
                <ClockOutIcon className="w-4 h-4" />
                Punch 2: Shift 1 — Clock Out
              </button>
            )}

            {/* Step 3: Shift 2 Clock In OR Finalize Day */}
            {currentStep === 3 && (
              <>
                <button
                  id="punch-shift2-in-btn"
                  onClick={() => handleOpenAction('shift2_in')}
                  disabled={Boolean(isShift2Early)}
                  title={actionDisabledReason || 'Punch 3: Shift 2 Clock In'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition cursor-pointer shrink-0"
                >
                  <Moon className="w-4 h-4" />
                  Punch 3: Shift 2 — Clock In
                </button>
                {!isShift1Expired && (
                  <button
                    type="button"
                    onClick={handleMarkDayCompleted}
                    disabled={submitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    Single Shift (Day Done)
                  </button>
                )}
              </>
            )}

            {/* Step 4: Shift 2 Clock Out */}
            {currentStep === 4 && (
              <button
                id="punch-shift2-out-btn"
                onClick={() => handleOpenAction('shift2_out')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer shrink-0"
              >
                <ClockOutIcon className="w-4 h-4" />
                Punch 4: Shift 2 — Clock Out
              </button>
            )}
          </div>
        </div>

        {/* Attendance Correction Notice */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <FileEdit className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Missed punching for an earlier shift or date?</span>
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

      {/* 5. MONTHLY ATTENDANCE SUMMARY & BREAKDOWN */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              My Monthly Attendance Summary
            </h3>
            <p className="text-xs text-slate-400">
              Overview of your shifts, week-offs, approved leaves, and total work hours.
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

        {/* Metric Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="text-[11px] text-slate-400 font-medium">Logged Days</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{monthStats.totalMarked}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Days Recorded</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-center">
            <div className="text-[11px] text-emerald-400 font-medium">Present Days</div>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{monthStats.present}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Full Shifts</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-center">
            <div className="text-[11px] text-amber-400 font-medium">Half Days</div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{monthStats.halfDay}</div>
            <div className="text-[10px] text-amber-500/80 mt-0.5">Half Shifts</div>
          </div>
          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-900/40 text-center">
            <div className="text-[11px] text-sky-400 font-medium">Week Offs</div>
            <div className="text-lg font-bold text-sky-300 font-mono mt-0.5">{monthStats.weekOff}</div>
            <div className="text-[10px] text-sky-500/80 mt-0.5">Approved Offs</div>
          </div>
          <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-900/40 text-center">
            <div className="text-[11px] text-violet-400 font-medium">On Leave</div>
            <div className="text-lg font-bold text-violet-300 font-mono mt-0.5">{monthStats.onLeave}</div>
            <div className="text-[10px] text-violet-500/80 mt-0.5">Approved Leaves</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-center">
            <div className="text-[11px] text-indigo-400 font-medium">Total Hours</div>
            <div className="text-lg font-bold text-indigo-300 font-mono mt-0.5">{monthStats.totalWorkedHours}h</div>
            <div className="text-[10px] text-indigo-500/80 mt-0.5">Worked Duration</div>
          </div>
        </div>

        {/* Late Arrival Notice if any */}
        {monthStats.lateCount > 0 && (
          <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-900/30 flex items-center justify-between text-xs text-orange-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                You have <strong className="text-white">{monthStats.lateCount} late arrival{monthStats.lateCount > 1 ? 's' : ''}</strong> (&gt; 15m) totaling <strong className="text-white font-mono">{monthStats.totalLateMinutes} mins</strong> this month.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 6. MONTHLY PUNCH HISTORY LOG TABLE */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Shift Punch Logs &amp; Past Records
            </h3>
            <p className="text-xs text-slate-400">
              Detailed list of punches, selfies, and work hours for {selectedMonth}.
            </p>
          </div>
        </div>

        {monthlyRecords.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-6 space-y-3">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              No attendance records logged yet for {selectedMonth}.
            </p>
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

                      {/* Shift Details */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        {record.shift1InTime || record.clockInTime ? (
                          <span className="font-mono text-[11px] text-slate-300">
                            S1 In: {record.shift1InTime || record.clockInTime}
                          </span>
                        ) : null}
                        {record.shift1OutTime ? (
                          <span className="font-mono text-[11px] text-slate-300">
                            S1 Out: {record.shift1OutTime}
                          </span>
                        ) : null}
                        {record.shift2InTime ? (
                          <span className="font-mono text-[11px] text-purple-300">
                            S2 In: {record.shift2InTime}
                          </span>
                        ) : null}
                        {record.shift2OutTime ? (
                          <span className="font-mono text-[11px] text-purple-300">
                            S2 Out: {record.shift2OutTime}
                          </span>
                        ) : null}
                        {(record.workedMinutes || 0) > 0 && (
                          <span className="text-emerald-400 font-mono text-[11px]">
                            Total: {formatDuration(record.workedMinutes)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Selfies thumbnail */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {record.shift1InSelfieUrl || record.clockInSelfieUrl ? (
                      <img
                        src={record.shift1InSelfieUrl || record.clockInSelfieUrl || ''}
                        alt="Punch In"
                        title="Punch In Photo"
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    ) : null}
                    {record.shift1OutSelfieUrl || record.shift2OutSelfieUrl || record.clockOutSelfieUrl ? (
                      <img
                        src={record.shift2OutSelfieUrl || record.shift1OutSelfieUrl || record.clockOutSelfieUrl || ''}
                        alt="Punch Out"
                        title="Punch Out Photo"
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    ) : null}
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

      {/* 7. MANDATORY LIVE CAMERA SELFIE MODAL (No File Upload, No Verified Badges) */}
      {activeAction && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {activeAction === 'shift1_in'
                    ? 'Shift 1 — Clock In Selfie'
                    : activeAction === 'shift1_out'
                    ? 'Shift 1 — Clock Out Selfie'
                    : activeAction === 'shift2_in'
                    ? 'Shift 2 — Clock In Selfie'
                    : 'Shift 2 — Clock Out Selfie'}
                </h3>
              </div>
              <button
                onClick={handleCloseAction}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Live Camera Viewfinder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  {capturedSelfie ? 'Captured Selfie' : 'Live Camera View'}
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
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retake Photo
                  </button>
                )}
              </div>

              {cameraError ? (
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs space-y-3">
                  <div className="flex items-start gap-2.5 text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <div className="font-semibold text-white">Camera Device Access</div>
                      <p className="text-slate-300 mt-1 leading-relaxed">{cameraError}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Grant / Retry Camera
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
                  <div className="absolute bottom-2 right-2 bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-md flex items-center gap-1 font-medium">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    Photo Captured
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
                      <span>Starting live camera stream...</span>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="absolute bottom-3 inset-x-0 flex justify-center items-center">
                      <button
                        type="button"
                        id="capture-selfie-btn"
                        onClick={handleCaptureSelfie}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold shadow-lg transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-indigo-600" />
                        Take Selfie
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Geolocation Section */}
            {capturedSelfie && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Location &amp; Geofence
                  </span>
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={detectingLoc}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={`w-3 h-3 ${detectingLoc ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {detectingLoc ? (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span>Detecting GPS location...</span>
                  </div>
                ) : locError ? (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{locError}</span>
                  </div>
                ) : !hasConfiguredPropertyCoords ? (
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Branch coordinates not configured.</span>
                  </div>
                ) : distanceM !== null ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span>GPS: {locLat}, {locLng}</span>
                      <span>Distance: {distanceM}m</span>
                    </div>

                    {isWithinGeofence ? (
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 flex items-center gap-2 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Within property area ({distanceM}m away).</span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Outside property radius ({outsideDistance}m outside).</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs">Waiting for GPS coordinates...</div>
                )}
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCloseAction}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-punch-btn"
                onClick={handleConfirmPunch}
                disabled={submitting || !capturedSelfie}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                {submitting ? 'Recording Punch...' : 'Confirm Punch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
