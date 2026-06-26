import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Clock, CheckCircle2, XCircle, Download, MapPin,
  Timer, Plane, Search, Camera,
  ShieldCheck, AlertTriangle, X, Loader2, Navigation,
  Eye, ZoomIn,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, Card, CardHeader, Button, Badge, Avatar, Input, Tabs } from "../components/ui";
import { useStore, SyncedEmployee, AttendanceRecord, ActivityRecord } from "../data/store";
import { cn } from "../utils/cn";
import { AttendanceCalendarWidget } from "../components/AttendanceCalendarWidget";

// ————————————————————————————————————————————————————————————————————————————————
// Change OFFICE_LAT / OFFICE_LNG to your actual office GPS coordinates.
const OFFICE_LAT = 28.6259;      // TIS Nexus Office
const OFFICE_LNG = 77.3773;
const OFFICE_RADIUS_M = 100;     // 100 metres radius
const OFFICE_LABEL = "TIS Nexus HQ, Noida";
const LATE_THRESHOLD_HOUR = 10;
const LATE_THRESHOLD_MIN = 0;

// --- Haversine Distance -------------------------------------------------------
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatWorkHours(inISO?: string, outISO?: string): string {
  if (!inISO || !outISO) return inISO ? "Active" : "-";
  const diff = new Date(outISO).getTime() - new Date(inISO).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

const monthlyData = [
  { day: "01", present: 18, absent: 1, leave: 3, wfh: 2 },
  { day: "02", present: 20, absent: 0, leave: 3, wfh: 1 },
  { day: "03", present: 19, absent: 1, leave: 3, wfh: 1 },
  { day: "04", present: 21, absent: 0, leave: 2, wfh: 1 },
  { day: "05", present: 20, absent: 1, leave: 2, wfh: 1 },
  { day: "06", present: 18, absent: 2, leave: 3, wfh: 1 },
  { day: "07", present: 19, absent: 1, leave: 3, wfh: 1 },
  { day: "08", present: 20, absent: 0, leave: 3, wfh: 1 },
  { day: "09", present: 19, absent: 1, leave: 3, wfh: 1 },
  { day: "10", present: 21, absent: 0, leave: 2, wfh: 1 },
  { day: "11", present: 20, absent: 1, leave: 2, wfh: 1 },
  { day: "12", present: 18, absent: 2, leave: 3, wfh: 1 },
  { day: "13", present: 19, absent: 1, leave: 3, wfh: 1 },
  { day: "14", present: 20, absent: 0, leave: 3, wfh: 1 },
];

const tooltipStyle = {
  background: "white", border: "1px solid #e2e8f0",
  borderRadius: 12, fontSize: 12, fontWeight: 600, padding: "8px 12px",
};

// --- Selfie Viewer Modal ------------------------------------------------------
function SelfieViewerModal({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
      <div className="relative rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold">{name}'s Check-in Selfie</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <img src={src} alt={`${name} selfie`} className="w-full object-cover" />
        <div className="bg-slate-900 px-4 py-2 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5" /> GPS-Verified Attendance Photo
        </div>
      </div>
    </div>
  );
}

// --- Secure Check-In Modal ----------------------------------------------------
type CheckInStep = "gps" | "camera" | "confirm" | "blocked";

interface CheckInData {
  selfiePhoto: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  locationStatus: "Verified" | "Outside Office";
}

function SecureCheckInModal({
  userName,
  onConfirm,
  onClose,
}: {
  userName: string;
  onConfirm: (data: CheckInData) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<CheckInStep>("gps");
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "blocked" | "error">("loading");
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");

  const [cameraError, setCameraError] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Step 1: GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const d = haversineMetres(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        setCoords({ lat: latitude, lng: longitude });
        setDistance(Math.round(d));
        if (d <= OFFICE_RADIUS_M) {
          setGpsStatus("ok");
        } else {
          setGpsStatus("blocked");
          setStep("blocked");
        }
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? "Location permission denied. Please allow location access in your browser settings."
            : "Could not get your location. Please try again."
        );
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  // Step 2: Camera
  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setCameraError("Camera access denied. Please allow camera permission and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (step === "camera") startCamera();
    return () => { if (step === "camera") stopCamera(); };
  }, [step, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureSelfie = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setSelfie(dataUrl);
    stopCamera();
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selfie || !coords || distance === null) return;
    onConfirm({
      selfiePhoto: selfie,
      lat: coords.lat,
      lng: coords.lng,
      distanceMeters: distance,
      locationStatus: distance <= OFFICE_RADIUS_M ? "Verified" : "Outside Office",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#025085]" />
            <span className="font-bold text-slate-900">Secure Check-In</span>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 border-b border-slate-100">
          {[
            { id: "gps", label: "Location" },
            { id: "camera", label: "Selfie" },
            { id: "confirm", label: "Confirm" },
          ].map((s, i) => {
            const stepOrder: Record<string, number> = { gps: 0, camera: 1, confirm: 2, blocked: 0 };
            const current = stepOrder[step];
            const isActive = stepOrder[s.id] === current;
            const isDone = stepOrder[s.id] < current;
            return (
              <div key={s.id} className={cn("flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors",
                isActive ? "text-[#025085] border-b-2 border-[#025085]" : isDone ? "text-emerald-600" : "text-slate-400"
              )}>
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                  isActive ? "bg-[#025085] text-white" : isDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                )}>
                  {isDone ? "✓" : i + 1}
                </span>
                {s.label}
              </div>
            );
          })}
        </div>

        <div className="p-6">
          {/* -- Step: GPS -- */}
          {(step === "gps" || step === "blocked") && (
            <div className="flex flex-col items-center gap-4 text-center">
              {gpsStatus === "loading" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <Loader2 className="h-8 w-8 animate-spin text-[#025085]" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Detecting Your Location...</div>
                    <div className="mt-1 text-sm text-slate-500">Please allow location access when prompted.</div>
                  </div>
                </>
              )}

              {gpsStatus === "ok" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                    <Navigation className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-700">Within Office Radius ✓</div>
                    <div className="mt-1 text-sm text-slate-500">
                      You are <span className="font-bold text-slate-900">{distance}m</span> from {OFFICE_LABEL}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">{coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}</div>
                  </div>
                  <Button className="w-full" leftIcon={<Camera className="h-4 w-4" />} onClick={() => setStep("camera")}>
                    Continue to Selfie
                  </Button>
                </>
              )}

              {gpsStatus === "blocked" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
                    <AlertTriangle className="h-8 w-8 text-rose-500" />
                  </div>
                  <div>
                    <div className="font-bold text-rose-600">Outside Office Zone</div>
                    <div className="mt-2 text-sm text-slate-600 font-medium">
                      You are outside the office location. Attendance cannot be marked.
                    </div>
                    <div className="mt-1.5 text-xs text-slate-400">
                      Distance: <span className="font-semibold text-slate-700">{distance}m</span> (Allowed limit: {OFFICE_RADIUS_M}m)
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
                </>
              )}

              {gpsStatus === "error" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Location Access Required</div>
                    <div className="mt-1 text-sm text-slate-600">{gpsError}</div>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
                </>
              )}
            </div>
          )}

          {/* -- Step: Camera -- */}
          {step === "camera" && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="font-bold text-slate-900">Take Your Check-In Selfie</div>
                <div className="mt-1 text-sm text-slate-500">Face the camera clearly. This photo is saved with your attendance record.</div>
              </div>

              {cameraError ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{cameraError}</div>
                  <Button variant="secondary" onClick={startCamera}>Retry Camera</Button>
                </div>
              ) : (
                <>
                  <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: "4/3" }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover scale-x-[-1]"
                    />
                    {!cameraReady && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                      </div>
                    )}
                    {/* Face guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="h-52 w-40 rounded-full border-2 border-dashed border-white/40" />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                      <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80 font-medium">
                        Position your face in the circle
                      </span>
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                  <Button
                    className="w-full"
                    leftIcon={<Camera className="h-4 w-4" />}
                    disabled={!cameraReady}
                    onClick={captureSelfie}
                  >
                    {cameraReady ? "Capture Selfie" : "Starting Camera..."}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* -- Step: Confirm -- */}
          {step === "confirm" && selfie && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="font-bold text-slate-900">Confirm Check-In</div>
                <div className="mt-1 text-sm text-slate-500">Review your details before confirming.</div>
              </div>

              <img src={selfie} alt="Selfie preview" className="w-40 h-32 rounded-2xl object-cover ring-2 ring-[#025085]/30 scale-x-[-1]" />

              <div className="w-full rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">Employee</span>
                  <span className="text-sm font-bold text-slate-900">{userName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">Time</span>
                  <span className="text-sm font-bold text-slate-900">
                    {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">Location</span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified ({distance}m)
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">GPS Coords</span>
                  <span className="text-xs font-mono text-slate-600">{coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}</span>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => { setSelfie(null); setStep("camera"); startCamera(); }}>
                  Retake
                </Button>
                <Button className="flex-1" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={handleConfirm}>
                  Confirm Check-In
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Secure Check-Out Modal ────────────────────────────────────────────────────────
interface CheckOutData {
  lat: number;
  lng: number;
  distanceMeters: number;
  locationStatus: "Verified" | "Outside Office";
}

function SecureCheckOutModal({
  userName,
  onConfirm,
  onClose,
}: {
  userName: string;
  onConfirm: (data: CheckOutData) => void;
  onClose: () => void;
}) {
  const [gpsStatus, setGpsStatus] = useState<"loading" | "ok" | "blocked" | "error">("loading");
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const d = haversineMetres(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
        setCoords({ lat: latitude, lng: longitude });
        setDistance(Math.round(d));
        if (d <= OFFICE_RADIUS_M) {
          setGpsStatus("ok");
        } else {
          setGpsStatus("blocked");
        }
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? "Location permission denied. Please allow location access in your browser settings to verify check-out."
            : "Could not get your location. Please try again."
        );
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  const handleConfirm = () => {
    if (!coords || distance === null) return;
    onConfirm({
      lat: coords.lat,
      lng: coords.lng,
      distanceMeters: distance,
      locationStatus: distance <= OFFICE_RADIUS_M ? "Verified" : "Outside Office",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-rose-600" />
            <span className="font-bold text-slate-900">Secure Check-Out</span>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            {gpsStatus === "loading" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <Loader2 className="h-8 w-8 animate-spin text-[#025085]" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Checking Geofence Location…</div>
                  <div className="mt-1 text-sm text-slate-500">Verifying you are at the office before check-out.</div>
                </div>
              </>
            )}

            {gpsStatus === "ok" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <Navigation className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <div className="font-bold text-emerald-700">Within Office Radius ✓</div>
                  <div className="mt-1 text-sm text-slate-500 font-medium">
                    You are <span className="font-bold text-slate-900">{distance}m</span> from {OFFICE_LABEL}
                  </div>
                </div>

                <div className="w-full rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-left mt-2">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs font-semibold text-slate-500">Employee</span>
                    <span className="text-sm font-bold text-slate-900">{userName}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs font-semibold text-slate-500">Time</span>
                    <span className="text-sm font-bold text-slate-900">
                      {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs font-semibold text-slate-500">Location Status</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  </div>
                </div>

                <div className="flex w-full gap-3 mt-2">
                  <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
                  <Button className="flex-1 bg-rose-600 hover:bg-rose-700 border-none text-white font-bold" onClick={handleConfirm}>
                    Confirm Check-Out
                  </Button>
                </div>
              </>
            )}

            {gpsStatus === "blocked" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
                  <AlertTriangle className="h-8 w-8 text-rose-500" />
                </div>
                <div>
                  <div className="font-bold text-rose-600">Outside Office Zone</div>
                  <div className="mt-2 text-sm text-slate-600 font-medium">
                    You are outside the office location. Attendance cannot be marked.
                  </div>
                  <div className="mt-1.5 text-xs text-slate-400">
                    Distance: <span className="font-semibold text-slate-700">{distance}m</span> (Allowed limit: {OFFICE_RADIUS_M}m)
                  </div>
                </div>
                <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
              </>
            )}

            {gpsStatus === "error" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Location Access Required</div>
                  <div className="mt-1 text-sm text-slate-600">{gpsError}</div>
                </div>
                <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Location Status Badge ────────────────────────────────────────────────────────
function LocationBadge({ record }: { record: AttendanceRecord }) {
  if (!record.locationStatus) {
    return <span className="text-slate-400 text-xs">-</span>;
  }
  if (record.locationStatus === "Verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
        <ShieldCheck className="h-3 w-3" />
        Verified {record.distanceMeters != null ? `(${record.distanceMeters}m)` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200/60">
      <AlertTriangle className="h-3 w-3" />
      Outside Office
    </span>
  );
}

// --- Main Attendance Component ------------------------------------------------
export function Attendance({ currentUser, search, setSearch }: { currentUser: SyncedEmployee; search?: string; setSearch?: (s: string) => void }) {
  const [attendance, setAttendance] = useStore<AttendanceRecord[]>("attendance", []);
  const [employees] = useStore<SyncedEmployee[]>("employees", []);
  const [, setActivities] = useStore<ActivityRecord[]>("activities", []);

  const [tab, setTab] = useState("today");
  const [localSearch, setLocalSearch] = useState("");
  const searchVal = search !== undefined ? search : localSearch;
  const onSearchChange = setSearch !== undefined ? setSearch : setLocalSearch;

  // Immediate input state
  const [inputValue, setInputValue] = useState(searchVal);

  // Debounced search state used for actual list filtering
  const [debouncedSearch, setDebouncedSearch] = useState(searchVal);

  // Sync input value with searchVal from parent/navigation
  useEffect(() => {
    setInputValue(searchVal);
  }, [searchVal]);

  // Debounce the state update of both the internal filter and the parent state
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
      if (inputValue !== searchVal) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [inputValue, onSearchChange, searchVal]);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [viewSelfie, setViewSelfie] = useState<{ src: string; name: string } | null>(null);

  const isAdmin = currentUser.role === "Admin";
  const todayStr = new Date().toISOString().split("T")[0];
  const userAttendance = attendance.find(a => a.name === currentUser.name && a.date === todayStr);

  // --- Check-In (secure) ----------------------------------------------------
  const handleSecureCheckIn = (data: {
    selfiePhoto: string;
    lat: number;
    lng: number;
    distanceMeters: number;
    locationStatus: "Verified" | "Outside Office";
  }) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const isLate =
      now.getHours() > LATE_THRESHOLD_HOUR ||
      (now.getHours() === LATE_THRESHOLD_HOUR && now.getMinutes() > LATE_THRESHOLD_MIN);
    const status = isLate ? "Late" : "Present";

    const record: AttendanceRecord = {
      id: currentUser.id,
      name: currentUser.name,
      department: currentUser.department,
      checkIn: timeStr,
      checkOut: "-",
      status,
      avatar: currentUser.avatar,
      date: todayStr,
      selfiePhoto: data.selfiePhoto,
      lat: data.lat,
      lng: data.lng,
      locationStatus: data.locationStatus,
      distanceMeters: data.distanceMeters,
      checkInTime: now.toISOString(),
    };

    setAttendance(prev => {
      const idx = prev.findIndex(a => a.name === currentUser.name && a.date === todayStr);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = record;
        return updated;
      }
      return [...prev, record];
    });

    setActivities(prev => [{
      id: Date.now(),
      user: currentUser.name,
      action: isLate ? "checked in late (GPS verified)" : "checked in (GPS verified)",
      target: "for today",
      time: "Just now",
      avatar: currentUser.avatar,
    }, ...prev]);
  };

  // ─── Check-Out ────────────────────────────────────────────────────────────
  const handleSecureCheckOut = (data: CheckOutData) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    setAttendance(prev =>
      prev.map(a =>
        a.name === currentUser.name && a.date === todayStr
          ? {
              ...a,
              checkOut: timeStr,
              checkOutTime: now.toISOString(),
              checkOutLat: data.lat,
              checkOutLng: data.lng,
              checkOutDistanceMeters: data.distanceMeters,
              checkOutLocationStatus: data.locationStatus
            }
          : a
      )
    );
    setActivities(prev => [{
      id: Date.now(),
      user: currentUser.name,
      action: "checked out (GPS verified)",
      target: "for today",
      time: "Just now",
      avatar: currentUser.avatar,
    }, ...prev]);
  };

  // --- Filtered Lists --------------------------------------------------------
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      if (!isAdmin && a.name !== currentUser.name) return false;
      if (debouncedSearch && !a.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
      return true;
    });
  }, [attendance, debouncedSearch, currentUser, isAdmin]);

  const lateArrivals = useMemo(() =>
    attendance.filter(a => a.status === "Late"),
    [attendance]
  );

  // --- KPI Metrics ----------------------------------------------------------
  const totalEmployees = employees.length;
  const presentCount = attendance.filter(a => a.status === "Present" || a.status === "Late").length;
  const absentCount = attendance.filter(a => a.status === "Absent").length;
  const leaveCount = attendance.filter(a => a.status === "On Leave").length;
  const lateCount = attendance.filter(a => a.status === "Late").length;

  // --- Live clock ----------------------------------------------------------
  const [liveTime, setLiveTime] = useState(
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );
  useEffect(() => {
    const id = setInterval(() =>
      setLiveTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }))
    , 1000);
    return () => clearInterval(id);
  }, []);

  const statusClassMap: Record<string, "success" | "danger" | "warning" | "info" | "neutral"> = {
    Present: "success", Absent: "danger", "On Leave": "warning", Late: "info",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Management"
        subtitle={isAdmin
          ? "GPS-verified check-ins, late arrivals and real-time compliance metrics"
          : "Secure GPS & selfie-verified shift management"
        }
        breadcrumb={[{ label: "Home" }, { label: "Operations" }, { label: "Attendance" }]}
        actions={
          <Button variant="secondary" size="md" leftIcon={<Download className="h-4 w-4" />}>Export Report</Button>
        }
      />

      {/* Check-in card & Stats strip */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: check-in widget */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-6 text-white shadow-xl shadow-indigo-900/30">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-200">
              <Clock className="h-3.5 w-3.5 text-indigo-400 animate-pulse" /> Live Punch Status
            </div>
            <div className="mt-3 font-display text-3xl font-extrabold tracking-tight">{liveTime}</div>
            <div className="text-xs text-indigo-200/80 mt-1">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-center mb-4 bg-white/5 rounded-xl border border-white/10 p-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-white/50">Punch In</div>
                <div className="font-display text-sm font-bold mt-1 text-white">{userAttendance?.checkIn || "-"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-white/50">Punch Out</div>
                <div className="font-display text-sm font-bold mt-1 text-white">{userAttendance?.checkOut || "-"}</div>
              </div>
            </div>

            {/* Location status for current user */}
            {userAttendance?.locationStatus && (
              <div className={cn(
                "mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
                userAttendance.locationStatus === "Verified"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/20 text-rose-300"
              )}>
                {userAttendance.locationStatus === "Verified"
                  ? <ShieldCheck className="h-3.5 w-3.5" />
                  : <AlertTriangle className="h-3.5 w-3.5" />
                }
                {userAttendance.locationStatus} · {userAttendance.distanceMeters}m from office
              </div>
            )}

            <div className="mt-2">
              {!userAttendance ? (
                <button
                  onClick={() => setShowCheckInModal(true)}
                  className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-indigo-600 text-sm font-bold hover:shadow-lg transition-all text-white"
                >
                  <ShieldCheck className="h-4 w-4" /> Secure Check In
                </button>
              ) : userAttendance.status === "On Leave" ? (
                <div className="text-center py-3 text-sm font-bold text-white/70 bg-white/5 rounded-xl border border-white/10">
                  On Leave ✈️
                </div>
              ) : userAttendance.status === "Absent" ? (
                <div className="text-center py-3 text-sm font-bold text-white/70 bg-white/5 rounded-xl border border-white/10">
                  Marked Absent ❌
                </div>
              ) : userAttendance.checkOut === "-" ? (
                <button
                  onClick={() => setShowCheckOutModal(true)}
                  className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 transition-colors shadow"
                >
                  <XCircle className="h-4 w-4" /> Check Out Today
                </button>
              ) : (
                <div className="text-center py-3 text-sm font-bold text-white/70 bg-white/5 rounded-xl border border-white/10">
                  Shift Completed 🎉
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-indigo-200/60">
              <MapPin className="h-3 w-3" /> GPS-Verified · Selfie Required · {OFFICE_RADIUS_M}m Radius
            </div>

            {/* Show selfie thumbnail for the current user */}
            {userAttendance?.selfiePhoto && (
              <button
                onClick={() => setViewSelfie({ src: userAttendance.selfiePhoto!, name: currentUser.name })}
                className="mt-3 flex items-center gap-2 w-full rounded-xl bg-white/10 px-3 py-2 hover:bg-white/15 transition-colors"
              >
                <img src={userAttendance.selfiePhoto} alt="my selfie" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30 scale-x-[-1]" />
                <span className="text-xs font-semibold text-white/70">View my check-in selfie</span>
                <ZoomIn className="h-3.5 w-3.5 ml-auto text-white/50" />
              </button>
            )}
          </div>
        </div>

        {/* Right: 4 stats + compact calendar */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Top 4 KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Present", value: presentCount.toString(), icon: <CheckCircle2 className="h-4 w-4" />, color: "from-emerald-500 to-teal-600", delta: `${((presentCount / (totalEmployees || 1)) * 100).toFixed(1)}% rate` },
              { label: "Absent", value: absentCount.toString(), icon: <XCircle className="h-4 w-4" />, color: "from-rose-500 to-pink-600", delta: "requires excuse" },
              { label: "On Leave", value: leaveCount.toString(), icon: <Plane className="h-4 w-4" />, color: "from-amber-500 to-orange-600", delta: "active request" },
              { label: "Late Check-ins", value: lateCount.toString(), icon: <Timer className="h-4 w-4" />, color: "from-fuchsia-500 to-purple-600", delta: `after ${LATE_THRESHOLD_HOUR}:${String(LATE_THRESHOLD_MIN).padStart(2, "0")} AM` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow ${s.color}`}>{s.icon}</div>
                </div>
                <div className="mt-1.5 font-display text-xl font-extrabold text-slate-900">{s.value}</div>
                <div className="mt-0.5 text-[10px] text-slate-500">{s.delta}</div>
              </div>
            ))}
          </div>
          {/* Compact attendance calendar */}
          <AttendanceCalendarWidget currentUser={currentUser} compact />
        </div>
      </div>

      {/* Tabs / Search */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "today", label: isAdmin ? "Today's Log" : "My Log", count: filteredAttendance.length },
              { value: "late", label: "Late Arrivals", count: lateArrivals.length },
              { value: "week", label: "Weekly Trend" },
            ]}
          />
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-56">
                <Input
                  placeholder="Search employee..."
                  leftIcon={<Search className="h-4 w-4" />}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* -- Today's Log -- */}
      {tab === "today" && (
        <Card>
          <CardHeader
            title={isAdmin ? "Today's GPS-Verified Attendance Log" : "My Personal Shift Log"}
            subtitle="Real-time check-in, check-out and location verification"
            action={
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> On Leave</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> Late</span>
              </div>
            }
          />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Check In</th>
                  <th className="px-6 py-3.5">Check Out</th>
                  <th className="px-6 py-3.5">Work Hours</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isAdmin && <th className="px-6 py-3.5">Selfie</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center text-sm text-slate-500 bg-slate-50/20">
                      No attendance records available
                    </td>
                  </tr>
                ) : filteredAttendance.map(a => (
                  <tr key={a.id + (a.date || "")} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar src={a.avatar} name={a.name} size={36} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                          <div className="text-[11px] text-slate-500">{a.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5"><Badge variant="indigo">{a.department}</Badge></td>
                    <td className="px-6 py-3.5 text-sm text-slate-700 font-medium">{a.checkIn}</td>
                    <td className="px-6 py-3.5 text-sm text-slate-700">{a.checkOut}</td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-700">
                      {formatWorkHours(a.checkInTime, a.checkOutTime)}
                    </td>
                    <td className="px-6 py-3.5"><LocationBadge record={a} /></td>
                    <td className="px-6 py-3.5"><Badge variant={statusClassMap[a.status] || "neutral"} dot>{a.status}</Badge></td>
                    {isAdmin && (
                      <td className="px-6 py-3.5">
                        {a.selfiePhoto ? (
                          <button
                            onClick={() => setViewSelfie({ src: a.selfiePhoto!, name: a.name })}
                            className="group relative"
                          >
                            <img
                              src={a.selfiePhoto}
                              alt={`${a.name} selfie`}
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-200 scale-x-[-1] hover:ring-[#025085] transition-all"
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/20 transition-all">
                              <Eye className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* -- Late Arrivals Tab -- */}
      {tab === "late" && (
        <Card>
          <CardHeader
            title="Late Arrivals Log"
            subtitle={`Employees who checked in after ${LATE_THRESHOLD_HOUR}:${String(LATE_THRESHOLD_MIN).padStart(2, "0")} AM`}
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                <Timer className="h-3.5 w-3.5" /> {lateArrivals.length} late today
              </span>
            }
          />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Check-In Time</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Distance</th>
                  <th className="px-6 py-3.5">Status</th>
                  {isAdmin && <th className="px-6 py-3.5">Selfie</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lateArrivals.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-10 text-center text-sm text-slate-500">
                      🎉 No late arrivals today!
                    </td>
                  </tr>
                ) : lateArrivals.map(a => (
                  <tr key={a.id + "late"} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar src={a.avatar} name={a.name} size={36} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                          <div className="text-[11px] text-slate-500">{a.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5"><Badge variant="indigo">{a.department}</Badge></td>
                    <td className="px-6 py-3.5">
                      <span className="font-semibold text-amber-700">{a.checkIn}</span>
                    </td>
                    <td className="px-6 py-3.5"><LocationBadge record={a} /></td>
                    <td className="px-6 py-3.5 text-sm text-slate-600">
                      {a.distanceMeters != null ? `${a.distanceMeters}m` : "-"}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant="info" dot>Late</Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3.5">
                        {a.selfiePhoto ? (
                          <button onClick={() => setViewSelfie({ src: a.selfiePhoto!, name: a.name })} className="group relative">
                            <img src={a.selfiePhoto} alt="selfie" className="h-9 w-9 rounded-full object-cover ring-2 ring-amber-200 scale-x-[-1] hover:ring-[#025085] transition-all" />
                          </button>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* -- Weekly Trend -- */}
      {tab === "week" && (
        <Card>
          <CardHeader title="Workforce Trend Analytics" subtitle="Attendance ratios for last 14 days" />
          <div className="p-6">
            <div className="h-[260px] w-full">
              <ResponsiveContainer>
                <BarChart data={monthlyData} barCategoryGap={12}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9", radius: 8 }} />
                  <Bar dataKey="present" stackId="a" fill="#025085" />
                  <Bar dataKey="wfh" stackId="a" fill="#10b981" />
                  <Bar dataKey="leave" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="absent" stackId="a" fill="#E81D3B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}


      {/* -- Modals -- */}
      {showCheckInModal && (
        <SecureCheckInModal
          userName={currentUser.name}
          onConfirm={handleSecureCheckIn}
          onClose={() => setShowCheckInModal(false)}
        />
      )}
      {showCheckOutModal && (
        <SecureCheckOutModal
          userName={currentUser.name}
          onConfirm={handleSecureCheckOut}
          onClose={() => setShowCheckOutModal(false)}
        />
      )}
      {viewSelfie && (
        <SelfieViewerModal
          src={viewSelfie.src}
          name={viewSelfie.name}
          onClose={() => setViewSelfie(null)}
        />
      )}
    </div>
  );
}

