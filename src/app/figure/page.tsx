'use client';

import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { Lexend } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

type VideoDevice = { deviceId: string; label: string };

const EXERCISE_TITLES: Record<string, string> = {
  "lat-raise": "Lateral Raise",
  "db-incline-fly": "Dumbbell Incline Fly",
  "bench-press": "Bench Press",
  "arnold-press": "Arnold Press",
  "db-front-hold": "Dumbbell Front Hold",
};

type FeedbackPhase = { name: string; cues: string[] };
type Exercise = {
  id: string;
  title: string;
  muscles: string[];
  imageUrl: string;
  phases: FeedbackPhase[];
};

const EXERCISES: Exercise[] = [
  {
    id: "lat-raise",
    title: "Lateral Raise",
    muscles: ["Shoulders"],
    imageUrl: "https://static.strengthlevel.com/images/exercises/dumbbell-lateral-raise/dumbbell-lateral-raise-800.avif",
    phases: [
      { name: "Lifting Phase (Concentric)", cues: ["Abducts the arms laterally on the scapular plane until approximately shoulder height."] },
      { name: "Lowering Phase (Eccentric)", cues: ["Lowers the dumbbells back toward the sides under control."] },
    ],
  },
  {
    id: "db-incline-fly",
    title: "Dumbbell Incline Fly",
    muscles: ["Chest"],
    imageUrl: "https://static.strengthlevel.com/images/exercises/incline-dumbbell-fly/incline-dumbbell-fly-800.avif",
    phases: [
      { name: "Setup", cues: ["Lying down on an incline bench (30-45°), dumbbells are positioned above the upper chest, palms facing each other. Lift the arms straight upwards."] },
      { name: "Descent Phase (Eccentric)", cues: ["Lowers dumbbells in a wide arc, maintaining the fixed elbow angle."] },
      { name: "Ascent Phase (Concentric)", cues: ["Bring dumbbells back up in the same arc, contracting the pectorals through horizontal adduction."] },
    ],
  },
  {
    id: "bench-press",
    title: "Bench Press",
    muscles: ["Chest", "Shoulders", "Triceps"],
    imageUrl: "https://static.strengthlevel.com/images/exercises/bench-press/bench-press-800.avif",
    phases: [
      { name: "Setup", cues: ["Set your shoulder blades back and down."] },
      { name: "Descent Phase", cues: ["Lower the bar to your chest with control."] },
      { name: "Ascent Phase", cues: ["Drive through your chest and fully extend your arms."] },
    ],
  },
  {
    id: "arnold-press",
    title: "Arnold Press",
    muscles: ["Biceps", "Triceps"],
    imageUrl: "https://static.strengthlevel.com/images/exercises/arnold-press/arnold-press-800.avif",
    phases: [
      { name: "Setup", cues: ["Palms face you, dumbbells in front of shoulders."] },
      { name: "Concentric Phase", cues: ["Rotate wrists as you press upwards."] },
      { name: "Eccentric Phase", cues: ["Rotate wrists back to the starting position as you lower."] },
    ],
  },
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const EXERCISE_THRESHOLDS = {
  "lat-raise": {
    shoulder: { min: 10, max: 90 },
    elbow: { min: 150, max: 180 },
  },
  "db-incline-fly": {
    shoulder: { min: 45, max: 180 },
    elbow: { min: 150, max: 170 },
  },
};

const EXERCISE_PHASES_MAP = {
  "lat-raise": [
    { name: "Lifting Phase (Concentric)", angle: { min: 16, max: 89 } },
    { name: "Lowering Phase (Eccentric)", angle: { min: 16, max: 89 } },
    { name: "Starting Position", angle: { min: 0, max: 15 } },
  ],
  "db-incline-fly": [
    { name: "Setup/Start Position", angle: { min: 160, max: 180 } },
    { name: "Descent Phase (Eccentric)", angle: { min: 91, max: 159 } },
    { name: "Ascent Phase (Concentric)", angle: { min: 91, max: 159 } },
  ],
};

async function ensureMPLoaded() {
  const win: any = window as any;
  if (win.__mpLoaded) return;
  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = reject;
      document.body.appendChild(s);
    });
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.4/pose.js");
  win.__mpLoaded = true;
}

const calculateAngle = (A: any, B: any, C: any) => {
  if (!A || !B || !C) return 0;
  const a = B.x - A.x;
  const b = B.y - A.y;
  const c = B.x - C.x;
  const d = B.y - C.y;
  const angle = Math.atan2(d, c) - Math.atan2(b, a);
  const degrees = Math.abs(angle * 180.0 / Math.PI);
  return degrees > 180 ? 360 - degrees : degrees;
};

type PhaseFormState = { intensity: number };
const defaultPhaseState: PhaseFormState = { intensity: 0 };

function FigureInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const exerciseId = sp.get("exercise") || "";
  const musclesRaw = decodeURIComponent(sp.get("muscles") || "");
  const phasesRaw = decodeURIComponent(sp.get("phases") || "");
  const intensityRaw = decodeURIComponent(sp.get("intensity") || "");

  const selectedExercise = EXERCISES.find((ex) => ex.id === exerciseId);
  const phasesData = selectedExercise?.phases || [];

  const [selectedPhaseNames, setSelectedPhaseNames] = useState<string[]>([]);
  const [configured, setConfigured] = useState<Set<string>>(new Set());
  const [forms, setForms] = useState<Record<string, PhaseFormState>>({});

  useEffect(() => {
    if (phasesRaw) {
      const names = phasesRaw.split(",").map(p => p.trim()).filter(Boolean);
      setSelectedPhaseNames(names);
    }
  }, [phasesRaw]);

  useEffect(() => {
    if (phasesRaw && intensityRaw) {
      const names = phasesRaw.split(",").map(p => p.trim()).filter(Boolean);
      const intensities = intensityRaw.split(",").map(i => Number(i.trim()));
      const initialForms: Record<string, PhaseFormState> = {};
      const initialConfigured = new Set<string>();

      names.forEach((name, index) => {
        initialForms[name] = { intensity: intensities[index] };
        initialConfigured.add(name);
      });

      setSelectedPhaseNames(names);
      setForms(initialForms);
      setConfigured(initialConfigured);
    } else {
      setSelectedPhaseNames([]);
      setForms({});
      setConfigured(new Set());
    }
  }, [phasesRaw, intensityRaw]);

  const progress = useMemo(() => {
    if (selectedPhaseNames.length === 0) return 0;
    return Math.round((configured.size / selectedPhaseNames.length) * 100);
  }, [selectedPhaseNames, configured]);

  const toggleSelectPhase = (phaseName: string) => {
    setSelectedPhaseNames((prev) =>
      prev.includes(phaseName) ? prev.filter((p) => p !== phaseName) : [...prev, phaseName]
    );
    setForms((prev) => (prev[phaseName] ? prev : { ...prev, [phaseName]: { ...defaultPhaseState } }));
    setConfigured((prev) => {
      const next = new Set(prev);
      next.delete(phaseName);
      return next;
    });
  };

  const handleSavePhase = (phaseName: string) => {
    setConfigured((prev) => new Set(prev).add(phaseName));
  };
  
  const handleFinishConfiguration = () => {
    const exParam = encodeURIComponent(exerciseId);
    const musclesParam = encodeURIComponent(musclesRaw || "");
    const phasesParam = encodeURIComponent(selectedPhaseNames.join(","));
    
    const intensityValues = selectedPhaseNames.map(phaseName => {
      return forms[phaseName]?.intensity || 0;
    });
    const intensityParam = encodeURIComponent(intensityValues.join(","));

    router.push(`/monitor?exercise=${exParam}&muscles=${musclesParam}&phases=${phasesParam}&intensity=${intensityParam}`);
  };

  const exerciseTitle = EXERCISE_TITLES[exerciseId] || "—";

  const initialMuscles = useMemo(
    () => (musclesRaw ? musclesRaw.split(",").map(m => m.trim()).filter(Boolean) : []),
    [musclesRaw]
  );
  
  const tutorialSrc = exerciseId ? `/videos/tutorial-${exerciseId}.mp4` : "";

  const [showPoseOverlay, setShowPoseOverlay] = useState(false);
  const [showMediaPipeOverlay, setShowMediaPipeOverlay] = useState(true);
  const overlayImageCache = useRef<Record<string, HTMLImageElement>>({});
  const [phaseCompleteText, setPhaseCompleteText] = useState('');
  
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [frontCam, setFrontCam] = useState<string>("");
  const [sideCam, setSideCam] = useState<string>("");

  const videoFrontRef = useRef<HTMLVideoElement>(null);
  const videoSideRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  const canvasFrontRef = useRef<HTMLCanvasElement>(null);
  const canvasSideRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);

  const mpPoseRef = useRef<any>(null);
  const mpRafRef = useRef<number | null>(null);

  const mpPoseFrontRef = useRef<any>(null);
  const mpPoseSideRef = useRef<any>(null);
  const mpPoseModalRef = useRef<any>(null);
  const rafFrontRef = useRef<number | null>(null);
  const rafSideRef = useRef<number | null>(null);
  const rafModalRef = useRef<number | null>(null);

  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [reps, setReps] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);

  const activationPct = useMemo(() => {
    const byReps = (reps / 12) * 100;
    return Math.max(byReps);
  }, [duration, reps]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [modalName, setModalName] = useState("");
  const [modalTarget, setModalTarget] = useState<"front" | "side" | null>(null);

  const [leftShoulderAngle, setLeftShoulderAngle] = useState(0);
  const [rightShoulderAngle, setRightShoulderAngle] = useState(0);
  const [leftShoulderPos, setLeftShoulderPos] = useState({ x: 0, y: 0, visible: false });
  const [rightShoulderPos, setRightShoulderPos] = useState({ x: 0, y: 0, visible: false });

  const [leftElbowAngle, setLeftElbowAngle] = useState(0);
  const [rightElbowAngle, setRightElbowAngle] = useState(0);
  const [leftElbowPos, setLeftElbowPos] = useState({ x: 0, y: 0, visible: false });
  const [rightElbowPos, setRightElbowPos] = useState({ x: 0, y: 0, visible: false });

  const [leftShoulderCorrect, setLeftShoulderCorrect] = useState(true);
  const [rightShoulderCorrect, setRightShoulderCorrect] = useState(true);
  const [leftElbowCorrect, setLeftElbowCorrect] = useState(true);
  const [rightElbowCorrect, setRightElbowCorrect] = useState(true);

  const [currentPhase, setCurrentPhase] = useState("—");
  const lastPhaseRef = useRef('');

  const streamFrontRef = useRef<MediaStream | null>(null);
  const streamSideRef = useRef<MediaStream | null>(null);

  const repStateRef = useRef<'start' | 'lifting' | 'peak' | 'lowering' | 'descending' | 'bottom' | 'ascending'>('start');
  
  const phaseToFilename: Record<string, string> = {
    "Starting Position": "starting_position",
    "Lifting Phase (Concentric)": "lifting_phase_concentric",
    "Lowering Phase (Eccentric)": "lowering_phase_eccentric",
    "Setup/Start Position": "setup_start_position",
    "Descent Phase (Eccentric)": "descent_phase_eccentric",
    "Ascent Phase (Concentric)": "ascent_phase_concentric",
  };

  useEffect(() => {
    if (!isModalOpen || !exerciseId) return;
    const fileName = phaseToFilename[currentPhase] || "default";
    const imagePath = `/images/${exerciseId}-${fileName}.png`;
    
    if (imagePath && !overlayImageCache.current[imagePath]) {
      const img = new Image();
      img.src = imagePath;
      img.onload = () => {
        overlayImageCache.current[imagePath] = img;
      };
    }
  }, [isModalOpen, exerciseId, currentPhase]);
  
  useEffect(() => {
    if (lastPhaseRef.current !== currentPhase) {
      setPhaseCompleteText(`${lastPhaseRef.current} Completed`);
      const timer = setTimeout(() => {
        setPhaseCompleteText('');
      }, 5000); 
      lastPhaseRef.current = currentPhase;
      return () => clearTimeout(timer);
    }
  }, [currentPhase]);

  useEffect(() => {
    setSelectedMuscles(initialMuscles);
  }, [initialMuscles]);

  const handleMuscleSelect = (m: string) => {
    setSelectedMuscles(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));
  };

  const stopStream = (s: MediaStream | null) => s?.getTracks().forEach(t => t.stop());

  const startStream = async (deviceId: string, target: "front" | "side") => {
    if (!deviceId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
      if (target === "front") {
        stopStream(streamFrontRef.current);
        streamFrontRef.current = stream;
        if (videoFrontRef.current) videoFrontRef.current.srcObject = stream;
      } else {
        stopStream(streamSideRef.current);
        streamSideRef.current = stream;
        if (videoSideRef.current) videoSideRef.current.srcObject = stream;
      }

      if (isModalOpen && modalTarget === target && modalVideoRef.current) {
        modalVideoRef.current.srcObject = stream;
        modalVideoRef.current.play?.();
      }
    } catch (e) {
      console.error("getUserMedia error:", e);
    }
  };

  const openModal = (name: string, target: "front" | "side") => {
    setModalName(name);
    setModalTarget(target);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalTarget(null);
    if (modalVideoRef.current) {
      modalVideoRef.current.pause?.();
      (modalVideoRef.current as any).srcObject = null;
    }
  };

  const handleFinishSession = () => {
    stopStream(streamFrontRef.current);
    stopStream(streamSideRef.current);
    if (rafFrontRef.current) cancelAnimationFrame(rafFrontRef.current);
    if (rafSideRef.current) cancelAnimationFrame(rafSideRef.current);
    if (rafModalRef.current) cancelAnimationFrame(rafModalRef.current);

    if (mpPoseFrontRef.current?.close) {
        try { mpPoseFrontRef.current.close(); } catch { }
    }
    if (mpPoseSideRef.current?.close) {
        try { mpPoseSideRef.current.close(); } catch { }
    }
    if (mpPoseModalRef.current?.close) {
        try { mpPoseModalRef.current.close(); } catch { }
    }

    setReps(0);
    setDuration(0);
    setProgressWidth(0);

    setIsCompletionDialogOpen(true);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        temp.getTracks().forEach(t => t.stop());
        const all = await navigator.mediaDevices.enumerateDevices();
        const vids = all
          .filter(d => d.kind === "videoinput")
          .map(d => ({ deviceId: d.deviceId, label: d.label || "Camera" }));
        setVideoDevices(vids);
        if (vids[0] && !frontCam) setFrontCam(vids[0].deviceId);
        if (vids[1] && !sideCam) setSideCam(vids[1].deviceId || vids[0]?.deviceId);
      } catch (e) {
        console.error("Permission error:", e);
      }
    };
    init();

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (frontCam) startStream(frontCam, "front"); }, [frontCam]);
  useEffect(() => { if (sideCam) startStream(sideCam, "side"); }, [sideCam]);

  useEffect(() => {
    if (!isModalOpen || !modalTarget) return;
    let cancelled = false;

    const drawAngleArc = (ctx: CanvasRenderingContext2D, center: any, point1: any, point2: any, color: string) => {
      if (!center || !point1 || !point2) return;

      const p1x = point1.x * ctx.canvas.width;
      const p1y = point1.y * ctx.canvas.height;
      const cx = center.x * ctx.canvas.width;
      const cy = center.y * ctx.canvas.height;
      const p2x = point2.x * ctx.canvas.width;
      const p2y = point2.y * ctx.canvas.height;

      const a1 = Math.atan2(p1y - cy, p1x - cx);
      const a2 = Math.atan2(p2y - cy, p2x - cx);

      ctx.beginPath();
      let angleDiff = a2 - a1;
      if (angleDiff < 0) angleDiff += 2 * Math.PI;

      if (angleDiff > Math.PI) {
        ctx.arc(cx, cy, 30, a1, a2, true);
      } else {
        ctx.arc(cx, cy, 30, a1, a2, false);
      }

      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();
    };

    (async () => {
      await ensureMPLoaded();
      if (cancelled) return;

      const stream = modalTarget === "front" ? streamFrontRef.current : streamSideRef.current;
      if (modalVideoRef.current && stream) {
        modalVideoRef.current.srcObject = stream;
        await modalVideoRef.current.play?.();
      }

      const win: any = window as any;
      const Pose = win.Pose;
      const MP = win;

      const pose = new Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MP.VERSION}/${file}`
      });
      pose.setOptions({
        selfieMode: true,
        modelComplexity: 2,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      const checkForm = (angle: number, threshold: { min: number, max: number }) => {
        return angle >= threshold.min && angle <= threshold.max;
      };

      const updateElbowAngles = (landmarks: any, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
        if (!landmarks) return;
        const leftShoulder = landmarks[MP.POSE_LANDMARKS.LEFT_SHOULDER];
        const leftElbow = landmarks[MP.POSE_LANDMARKS.LEFT_ELBOW];
        const leftWrist = landmarks[MP.POSE_LANDMARKS.LEFT_WRIST];
        const rightShoulder = landmarks[MP.POSE_LANDMARKS.RIGHT_SHOULDER];
        const rightElbow = landmarks[MP.POSE_LANDMARKS.RIGHT_ELBOW];
        const rightWrist = landmarks[MP.POSE_LANDMARKS.RIGHT_WRIST];

        let lAngle = 0, rAngle = 0;
        let lPos = { x: 0, y: 0, visible: false };
        let rPos = { x: 0, y: 0, visible: false };
        let lCorrect = true, rCorrect = true;

        const elbowThreshold = EXERCISE_THRESHOLDS[exerciseId as keyof typeof EXERCISE_THRESHOLDS]?.elbow;

        if (leftShoulder && leftElbow && leftWrist && leftElbow.visibility > 0.5) {
          lAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
          lPos = {
            x: leftElbow.x * canvas.width,
            y: leftElbow.y * canvas.height,
            visible: true
          };
          if (elbowThreshold) lCorrect = checkForm(lAngle, elbowThreshold);
          if (showMediaPipeOverlay) drawAngleArc(ctx, leftElbow, leftShoulder, leftWrist, lCorrect ? '#00FF00' : '#FF0000');
        }
        if (rightShoulder && rightElbow && rightWrist && rightElbow.visibility > 0.5) {
          rAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
          rPos = {
            x: rightElbow.x * canvas.width,
            y: rightElbow.y * canvas.height,
            visible: true
          };
          if (elbowThreshold) rCorrect = checkForm(rAngle, elbowThreshold);
          if (showMediaPipeOverlay) drawAngleArc(ctx, rightElbow, rightShoulder, rightWrist, rCorrect ? '#00FF00' : '#FF0000');
        }

        if (modalTarget === 'side') {
          if (lPos.visible && !rPos.visible) {
            rPos.visible = false;
            rAngle = 0;
            rCorrect = true;
          } else if (rPos.visible && !lPos.visible) {
            lPos.visible = false;
            lAngle = 0;
            lCorrect = true;
          } else if (lPos.visible && rPos.visible) {
            if (leftElbow.visibility > rightElbow.visibility) {
              rPos.visible = false;
              rAngle = 0;
              rCorrect = true;
            } else {
              lPos.visible = false;
              lAngle = 0;
              lCorrect = true;
            }
          }
        }
        setLeftElbowAngle(lAngle);
        setRightElbowAngle(rAngle);
        setLeftElbowPos(lPos);
        setRightElbowPos(rPos);
        setLeftElbowCorrect(lCorrect);
        setRightElbowCorrect(rCorrect);
      };

      const updateShoulderAngles = (landmarks: any, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
        if (!landmarks) return;
        const leftHip = landmarks[MP.POSE_LANDMARKS.LEFT_HIP];
        const leftShoulder = landmarks[MP.POSE_LANDMARKS.LEFT_SHOULDER];
        const leftElbow = landmarks[MP.POSE_LANDMARKS.LEFT_ELBOW];
        const rightHip = landmarks[MP.POSE_LANDMARKS.RIGHT_HIP];
        const rightShoulder = landmarks[MP.POSE_LANDMARKS.RIGHT_SHOULDER];
        const rightElbow = landmarks[MP.POSE_LANDMARKS.RIGHT_ELBOW];

        let lAngle = 0, rAngle = 0;
        let lPos = { x: 0, y: 0, visible: false };
        let rPos = { x: 0, y: 0, visible: false };
        let lCorrect = true, rCorrect = true;
        
        const shoulderThreshold = EXERCISE_THRESHOLDS[exerciseId as keyof typeof EXERCISE_THRESHOLDS]?.shoulder;
        
        if (leftHip && leftShoulder && leftElbow && leftShoulder.visibility > 0.5) {
          lAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
          lPos = {
            x: leftShoulder.x * canvas.width,
            y: leftShoulder.y * canvas.height,
            visible: true
          };
          if (shoulderThreshold) lCorrect = checkForm(lAngle, shoulderThreshold);
          if (showMediaPipeOverlay) drawAngleArc(ctx, leftShoulder, leftHip, leftElbow, lCorrect ? '#00FF00' : '#FF0000');
        }
        if (rightHip && rightShoulder && rightElbow && rightShoulder.visibility > 0.5) {
          rAngle = calculateAngle(rightHip, rightShoulder, rightElbow);
          rPos = {
            x: rightShoulder.x * canvas.width,
            y: rightShoulder.y * canvas.height,
            visible: true
          };
          if (shoulderThreshold) rCorrect = checkForm(rAngle, shoulderThreshold);
          if (showMediaPipeOverlay) drawAngleArc(ctx, rightShoulder, rightHip, rightElbow, rCorrect ? '#00FF00' : '#FF0000');
        }

        if (modalTarget === 'side') {
          if (lPos.visible && !rPos.visible) {
            rPos.visible = false;
            rAngle = 0;
            rCorrect = true;
          } else if (rPos.visible && !lPos.visible) {
            lPos.visible = false;
            lAngle = 0;
            lCorrect = true;
          } else if (lPos.visible && rPos.visible) {
            if (leftShoulder.visibility > rightShoulder.visibility) {
              rPos.visible = false;
              rAngle = 0;
              rCorrect = true;
            } else {
              lPos.visible = false;
              lAngle = 0;
              lCorrect = true;
            }
          }
        }
        setLeftShoulderAngle(lAngle);
        setRightShoulderAngle(rAngle);
        setLeftShoulderPos(lPos);
        setRightShoulderPos(rPos);
        setLeftShoulderCorrect(lCorrect);
        setRightShoulderCorrect(rCorrect);
      };
      
      const handlePhaseAndRepTracking = (landmarks: any) => {
        const leftShoulder = landmarks[MP.POSE_LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = landmarks[MP.POSE_LANDMARKS.RIGHT_SHOULDER];
        const leftHip = landmarks[MP.POSE_LANDMARKS.LEFT_HIP];
        const rightHip = landmarks[MP.POSE_LANDMARKS.RIGHT_HIP];
        const leftElbow = landmarks[MP.POSE_LANDMARKS.LEFT_ELBOW];
        const rightElbow = landmarks[MP.POSE_LANDMARKS.RIGHT_ELBOW];

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftElbow || !rightElbow) {
            setCurrentPhase("—");
            return;
        }

        const lAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
        const rAngle = calculateAngle(rightHip, rightShoulder, rightElbow);
        const angleToTrack = leftShoulder.visibility > rightShoulder.visibility ? lAngle : rAngle;

        switch (exerciseId) {
            case "lat-raise": {
                if (angleToTrack > 85 && repStateRef.current === 'lifting') {
                    repStateRef.current = 'peak';
                    setCurrentPhase("Lifting Phase (Concentric)");
                } else if (angleToTrack <= 30 && repStateRef.current === 'lowering') {
                    setReps(prevReps => prevReps + 1);
                    repStateRef.current = 'start';
                    setCurrentPhase("Starting Position");
                } else if (angleToTrack > 30 && angleToTrack < 85 && repStateRef.current === 'start') {
                    repStateRef.current = 'lifting';
                    setCurrentPhase("Lifting Phase (Concentric)");
                } else if (angleToTrack < 85 && repStateRef.current === 'peak') {
                    repStateRef.current = 'lowering';
                    setCurrentPhase("Lowering Phase (Eccentric)");
                }
                break;
            }
            case "db-incline-fly": {
                if (angleToTrack <= 95 && repStateRef.current === 'descending') {
                    repStateRef.current = 'bottom';
                    setCurrentPhase("Descent Phase (Eccentric)");
                } else if (angleToTrack >= 160 && repStateRef.current === 'ascending') {
                    setReps(prevReps => prevReps + 1);
                    repStateRef.current = 'start';
                    setCurrentPhase("Setup/Start Position");
                } else if (angleToTrack < 160 && angleToTrack > 95 && repStateRef.current === 'start') {
                    repStateRef.current = 'descending';
                    setCurrentPhase("Descent Phase (Eccentric)");
                } else if (angleToTrack > 95 && repStateRef.current === 'bottom') {
                    repStateRef.current = 'ascending';
                    setCurrentPhase("Ascent Phase (Concentric)");
                }
                break;
            }
            default:
                setCurrentPhase("—");
                break;
        }
      };
      
      const onResults = (results: any) => {
        const canvas = modalCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        const v = modalVideoRef.current;
        if (!canvas || !ctx || !v) return;

        if (v) {
          const rect = v.getBoundingClientRect();
          const w = Math.floor(rect.width);
          const h = Math.floor(rect.height);
          if (w && h && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
          }
        }
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results.poseLandmarks) {
          handlePhaseAndRepTracking(results.poseLandmarks);
        }

        const fileName = phaseToFilename[currentPhase] || "default";
        const imagePath = `/images/${exerciseId}-${fileName}.png`;
        const imageToDraw = imagePath ? overlayImageCache.current[imagePath] : null;
        if (showPoseOverlay && imageToDraw) {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(imageToDraw, 0, 0, canvas.width, canvas.height);
        }
        
        if (showMediaPipeOverlay && results.poseLandmarks) {
          const landmarks = results.poseLandmarks;
          updateShoulderAngles(landmarks, canvas, ctx);
          updateElbowAngles(landmarks, canvas, ctx);
          MP.drawConnectors(ctx, landmarks, MP.POSE_CONNECTIONS, {
              visibilityMin: 0.65,
              color: 'white'
          });
          const left = Object.values(MP.POSE_LANDMARKS_LEFT).map((i: any) => landmarks[i]);
          const right = Object.values(MP.POSE_LANDMARKS_RIGHT).map((i: any) => landmarks[i]);
          const neutral = Object.values(MP.POSE_LANDMARKS_NEUTRAL).map((i: any) => landmarks[i]);
          MP.drawLandmarks(ctx, left, { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)' });
          MP.drawLandmarks(ctx, right, { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)' });
          MP.drawLandmarks(ctx, neutral, { visibilityMin: 0.65, color: 'white', fillColor: 'white' });
        }
        
        ctx.restore();
      };
      
      pose.onResults(onResults);
      mpPoseModalRef.current = pose;

      const pump = async () => {
        if (cancelled) return;
        const v = modalVideoRef.current;
        if (v && v.readyState >= 2) {
          await mpPoseModalRef.current.send({ image: v });
        }
        rafModalRef.current = requestAnimationFrame(pump);
      };
      rafModalRef.current = requestAnimationFrame(pump);
    })();

    return () => {
      cancelled = true;
      if (rafModalRef.current) cancelAnimationFrame(rafModalRef.current);
      rafModalRef.current = null;
      if (mpPoseModalRef.current?.close) {
        try { mpPoseModalRef.current.close(); } catch { }
      }
      mpPoseModalRef.current = null;
    };
  }, [isModalOpen, modalTarget, exerciseId, currentPhase, showPoseOverlay, showMediaPipeOverlay]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureMPLoaded();
      if (cancelled) return;

      const win: any = window as any;
      const Pose = win.Pose;
      const MP = win;
      const pose = new Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MP.VERSION}/${file}`
      });
      pose.setOptions({
        selfieMode: true,
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const onResults = (results: any) => {
        const canvas = canvasSideRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const v = videoSideRef.current;
        if (v) {
          const w = v.clientWidth || 0;
          const h = v.clientHeight || 0;
          if (w && h && (canvas.width !== w || canvas.height !== h)) {
            canvas.width = w;
            canvas.height = h;
          }
        }

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (results.poseLandmarks) {
          MP.drawConnectors(ctx, results.poseLandmarks, MP.POSE_CONNECTIONS, {
            visibilityMin: 0.65,
            color: 'white'
          });
          const left = Object.values(MP.POSE_LANDMARKS_LEFT).map((i: any) => results.poseLandmarks[i]);
          const right = Object.values(MP.POSE_LANDMARKS_RIGHT).map((i: any) => results.poseLandmarks[i]);
          const neutral = Object.values(MP.POSE_LANDMARKS_NEUTRAL).map((i: any) => results.poseLandmarks[i]);
          MP.drawLandmarks(ctx, left, { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)' });
          MP.drawLandmarks(ctx, right, { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)' });
          MP.drawLandmarks(ctx, neutral, { visibilityMin: 0.65, color: 'white', fillColor: 'white' });
        }
        ctx.restore();
      };

      pose.onResults(onResults);
      mpPoseSideRef.current = pose;

      const pump = async () => {
        if (cancelled) return;
        const v = videoSideRef.current;
        if (v && v.readyState >= 2) {
          await mpPoseSideRef.current.send({ image: v });
        }
        rafSideRef.current = requestAnimationFrame(pump);
      };
      rafSideRef.current = requestAnimationFrame(pump);
    })();

    return () => {
      cancelled = true;
      if (rafSideRef.current) cancelAnimationFrame(rafSideRef.current);
      rafSideRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
    setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); 

  useEffect(() => {
    const newProgress = Math.min(100, (reps / 12) * 100);
    setProgressWidth(newProgress);
  }, [reps]);

  useEffect(() => {
    return () => {
      stopStream(streamFrontRef.current);
      stopStream(streamSideRef.current);
    };
  }, []);

  return (
    <main
      className="monitor-root min-h-screen bg-zinc-100 p-4 sm:p-6"
      style={{
        fontFamily: `var(--font-lexend)`
      }}
    >
      <div className="mx-auto w-full max-w-screen-2xl rounded-3xl bg-white p-5 sm:p-8 shadow-xl ring-1 ring-black/5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mb-6 text-center">Monitor Your Exercise</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="w-full">
              <div className="mb-2 flex items-center gap-2">
                <label className="text-sm text-zinc-900 w-32">Front Camera</label>
                <div className="relative w-full">
                  <select
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black appearance-none pr-10"
                    value={frontCam}
                    onChange={e => setFrontCam(e.target.value)}
                    aria-label="Select front camera"
                  >
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera"}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z" />
                  </svg>
                </div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openModal("Front Camera", "front")}
                  className="relative w-full h-80 rounded-xl overflow-hidden bg-zinc-200 shadow-inner hover:ring-2 hover:ring-indigo-500 cursor-pointer"
                  aria-label="Expand Front Camera"
                >
                  <video
                    ref={videoFrontRef}
                    className="relative pointer-events-none w-full h-full object-cover scale-x-[-1]"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasFrontRef}
                    className="absolute inset-0 pointer-events-none [scale-x-[-1]]"
                  />
                </button>
                <div className={`absolute left-1/2 bottom-4 -translate-x-1/2 z-10 px-4 py-2 rounded-md font-semibold ${phaseCompleteText ? 'bg-white/20 backdrop-blur text-green-500' : 'hidden'}`}>
                  {phaseCompleteText}
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="mb-2 flex items-center gap-2">
                <label className="text-sm text-zinc-900 w-32">Side Camera</label>
                <div className="relative w-full">
                  <select
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black appearance-none pr-10"
                    value={sideCam}
                    onChange={e => setSideCam(e.target.value)}
                    aria-label="Select side camera"
                  >
                    {videoDevices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera"}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.17l3.71-2.94a.75.75 0 1 1 .94 1.16l-4.24 3.36a.75.75 0 0 1-.94 0L5.21 8.39a.75.75 0 0 1 .02-1.18z" />
                  </svg>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openModal("Side Camera", "side")}
                className="relative w-full h-80 rounded-xl overflow-hidden bg-zinc-200 shadow-inner hover:ring-2 hover:ring-indigo-500 cursor-pointer"
                aria-label="Expand Side Camera"
              >
                <video ref={videoSideRef}
                  className="relative pointer-events-none w-full h-full object-cover scale-x-[-1]"
                  autoPlay
                  playsInline
                  muted
                />
                <div className={`absolute left-1/2 bottom-4 -translate-x-1/2 z-10 px-4 py-2 rounded-md font-semibold ${phaseCompleteText ? 'bg-white/20 backdrop-blur text-green-500' : 'hidden'}`}>
                  {phaseCompleteText}
                </div>
              </button>
            </div>
            
            <div className="w-full">
              <div className="mb-3 w-full text-center items-center gap-2">
                <label className="text-xl  place-items-center px-3 py-3 text-zinc-900">Exercise Tutorial</label>
              </div>

              <div className="relative w-full h-80 rounded-xl overflow-hidden bg-zinc-100 ring-1 ring-zinc-200">
                {tutorialSrc ? (
                  <video
                    key={tutorialSrc}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    autoPlay
                    loop
                    muted={false}
                  >
                    <source src={tutorialSrc} type="video/mp4" />
                    Sorry, your browser doesn't support embedded videos.
                  </video>
                ) : (
                  <div className="w-full h-full grid place-items-center text-zinc-500 text-sm px-4 text-center">
                    See tutorial
                  </div>
                )}
              </div>
            </div>
          </div>
        
        {/*
        * Feedback configuration content
        */}
        <div className="mt-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 text-center">Feedback</h1>
          <div className="mt-4 max-w-xl mx-auto">
            <p className="mb-1 text-sm text-zinc-500 text-center">Configuration Progress</p>
            <div className="h-2 w-full rounded-full bg-zinc-200">
              <div
                className="h-2 rounded-full bg-indigo-600 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-lg font-medium mb-3 text-center text-zinc-900">Available Phases</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {phasesData.map((phase) => {
              const isSelected = selectedPhaseNames.includes(phase.name);
              return (
                <button
                  key={phase.name}
                  onClick={() => toggleSelectPhase(phase.name)}
                  className={`h-10 w-56 rounded-xl text-sm font-medium transition
                    ${isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"}`}
                >
                  {phase.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[380px] rounded-xl border-2 border-dashed border-zinc-300 p-4">
          {selectedPhaseNames.length === 0 ? (
            <div className="flex h-[340px] flex-col items-center justify-center text-zinc-500">
              <svg width="28" height="28" viewBox="0 0 24 24" className="mb-3" aria-hidden>
                <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Click a phase card above to add it to your path.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {selectedPhaseNames.map((phaseName) => {
                const saved = configured.has(phaseName);
                const st = forms[phaseName] ?? defaultPhaseState;
                const phaseData = phasesData.find((p) => p.name === phaseName);
                const cue = phaseData?.cues?.[0] ?? "No cue available.";
                const videoSrc = `/videos/${exerciseId}-${slug(phaseName)}.mp4`;

                const fill = ((st.intensity - 0) / 2) * 100;

                return (
                  <div
                    key={phaseName}
                    className="relative rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm flex flex-col items-center text-center"
                  >
                    
                    <button
                      onClick={() => toggleSelectPhase(phaseName)}
                      className="absolute top-3 right-3 rounded-md p-2 text-zinc-500 hover:text-red-600"
                      aria-label="Remove phase"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    
                    <h3 className="text-2xl font-extrabold text-zinc-900">{phaseName}</h3>

                    <p className="mt-2 text-zinc-600 max-w-2xl">
                      <span className="font-semibold text-zinc-700">Cue:</span> {cue}
                    </p>

                    <div className="mt-5 w-full max-w-3xl">
                      <video
                        className="w-full h-full bg-zinc-200 rounded-2xl ring-1 ring-zinc-200"
                        controls
                        playsInline 
                        loop autoPlay muted 
                        poster="/videos/poster-default.jpg"
                      >
                        <source src={videoSrc} type="video/mp4" />
                        Sorry, your browser doesn't support embedded videos.
                      </video>
                    </div>

                    <div className="mt-7 text-lg font-semibold text-zinc-900">Feedback Intensity</div>

                    <div className="mt-3 w-full max-w-3xl">
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={1}
                        value={st.intensity}
                        onChange={(e) =>
                          setForms((prev) => ({ ...prev, [phaseName]: { intensity: Number(e.target.value) } }))
                        }
                        className="range-arrow w-full"
                        aria-label="Feedback intensity"
                        style={{ ["--fill" as any]: `${fill}%` }}
                      />
                      <div className="mt-2 flex justify-between w-full text-sm text-zinc-700 px-1">
                        <span>No</span>
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => handleSavePhase(phaseName)}
                        className="rounded-2xl bg-indigo-600 px-16 py-3 text-white font-semibold shadow hover:bg-indigo-700 active:translate-y-[1px]"
                      >
                        Save
                      </button>
                    </div>

                    {saved && (
                      <div className="absolute left-3 top-3 text-green-600" aria-hidden>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* End of feedback content */}
        
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleFinishConfiguration}
            disabled={configured.size !== selectedPhaseNames.length || selectedPhaseNames.length === 0}
            className="items-center gap-2 rounded-2xl bg-indigo-600 px-12 py-4 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            type="button"
          >
            Finish Session
          </button>
        </div>

        {isModalOpen && (
          <div
            className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4"
            onClick={closeModal}
            aria-modal="true"
            role="dialog"
          >
            <div
              className="relative w-full max-w-[min(96vw,1100px)] h-[90vh] bg-black rounded-2xl shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 z-20 rounded-full w-8 h-8 bg-white text-zinc-900 grid place-items-center pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); closeModal(); }}
                aria-label="Close expanded camera"
                type="button"
              >
                ✕
              </button>

              {(!modalTarget || !((modalTarget === "front" ? streamFrontRef.current : streamSideRef.current))) ? (
                <div className="relative z-0 grid place-items-center w-full h-[calc(80vh-2.5rem)] text-white/80">
                  <div className="text-center">
                    <div className="animate-pulse mb-2">Loading camera...</div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex-grow relative grid place-items-center overflow-hidden">
                  <video
                    ref={modalVideoRef}
                    className="z-0 w-full h-full object-cover rounded-lg scale-x-[-1]"
                    onPlay={() => {
                      if (modalVideoRef.current && modalCanvasRef.current) {
                        modalCanvasRef.current.width = modalVideoRef.current.videoWidth;
                        modalCanvasRef.current.height = modalVideoRef.current.videoHeight;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas
                    ref={modalCanvasRef}
                    className="absolute inset-0 pointer-events-none"
                  />
                  
                  {leftShoulderPos.visible && (
                    <div
                      className="absolute z-10 p-1 rounded-md text-white font-semibold text-lg"
                      style={{
                        left: `${leftShoulderPos.x}px`,
                        top: `${leftShoulderPos.y}px`,
                        transform: 'translate(-50%, -150%)',
                        textShadow: '1px 1px 2px #000',
                        color: leftShoulderCorrect ? '#00FF00' : '#FF0000'
                      }}
                    >
                      <p>R-Shoulder: {Math.round(leftShoulderAngle)}°</p>
                    </div>
                  )}

                  {rightShoulderPos.visible && (
                    <div
                      className="absolute z-10 p-1 rounded-md text-white font-semibold text-lg"
                      style={{
                        left: `${rightShoulderPos.x}px`,
                        top: `${rightShoulderPos.y}px`,
                        transform: 'translate(-50%, -150%)',
                        textShadow: '1px 1px 2px #000',
                        color: rightShoulderCorrect ? '#00FF00' : '#FF0000'
                      }}
                    >
                      <p>L-Shoulder: {Math.round(rightShoulderAngle)}°</p>
                    </div>
                  )}

                  {leftElbowPos.visible && (
                    <div
                      className="absolute z-10 p-1 rounded-md text-white font-semibold text-lg"
                      style={{
                        left: `${leftElbowPos.x}px`,
                        top: `${leftElbowPos.y}px`,
                        transform: 'translate(-50%, -150%)',
                        textShadow: '1px 1px 2px #000',
                        color: leftElbowCorrect ? '#00FF00' : '#FF0000'
                      }}
                    >
                      <p>R-Elbow: {Math.round(leftElbowAngle)}°</p>
                    </div>
                  )}

                  {rightElbowPos.visible && (
                    <div
                      className="absolute z-10 p-1 rounded-md text-white font-semibold text-lg"
                      style={{
                        left: `${rightElbowPos.x}px`,
                        top: `${rightElbowPos.y}px`,
                        transform: 'translate(-50%, -150%)',
                        textShadow: '1px 1px 2px #000',
                        color: rightElbowCorrect ? '#00FF00' : '#FF0000'
                      }}
                    >
                      <p>L-Elbow: {Math.round(rightElbowAngle)}°</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="absolute left-4 top-4 z-10 px-3 py-1.5 rounded-md text-white bg-white/20 backdrop-blur font-semibold">
                {modalName}
              </div>

              <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-4 py-2 rounded-md font-semibold ${phaseCompleteText ? 'bg-white/20 backdrop-blur text-green-500' : 'hidden'}`}>
                {phaseCompleteText}
              </div>

              <div className="absolute left-4 top-16 z-10 flex flex-col space-y-2 text-white bg-white/20 backdrop-blur rounded-md p-3">
                  <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowMediaPipeOverlay(!showMediaPipeOverlay)}
                        className={`w-6 h-6 rounded border-2 grid place-items-center ${showMediaPipeOverlay ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-gray-400'}`}
                        aria-label="Toggle MediaPipe Landmark Overlay"
                    >
                        {showMediaPipeOverlay && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                    <span className="text-sm font-semibold">Show MediaPipe Landmark</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowPoseOverlay(!showPoseOverlay)}
                        className={`w-6 h-6 rounded border-2 grid place-items-center ${showPoseOverlay ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-gray-400'}`}
                        aria-label="Toggle Correct Pose Overlay"
                    >
                        {showPoseOverlay && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                    <span className="text-sm font-semibold">Show Correct Pose</span>
                  </div>
              </div>


              <div className="absolute left-1/2 bottom-4 -translate-x-1/2 z-10 px-3 py-1.5 rounded-md text-white bg-white/20 backdrop-blur font-semibold text-lg">
                <p>Current Phase: {currentPhase}</p>
                <p>Reps Count: {reps}</p>
              </div>

            </div>
          </div>
        )}
      </div>

      {isCompletionDialogOpen && (
          <div
              className="fixed inset-0 z-[1001] bg-black/70 flex items-center justify-center p-4"
              aria-modal="true"
              role="dialog"
          >
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
                  <h2 className="text-3xl font-bold text-green-600 mb-4">Congratulations!</h2>
                  <p className="text-xl text-zinc-700">You've completed your exercise!</p>
                  <button
                      onClick={() => setIsCompletionDialogOpen(false)}
                      className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold shadow hover:bg-indigo-700"
                      type="button"
                  >
                      Close
                  </button>
              </div>
          </div>
      )}

      <style jsx global>{`
        :root { --font-lexend: ${lexend.style.fontFamily}; }
        .font-sans { font-family: var(--font-lexend), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }

        .monitor-root svg g.selected,
        .monitor-root svg g.selected path,
        .monitor-root svg g.selected polygon,
        .monitor-root svg g.selected rect,
        .monitor-root svg g.selected circle {
          fill: var(--heat-color) !important;
          stroke: var(--heat-color) !important;
        }

        @keyframes mp-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .mp .loading {
          display: flex;
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          align-items: center;
          backface-visibility: hidden;
          justify-content: center;
          opacity: 1;
          transition: opacity 1s;
        }
        .mp .loading .message { font-size: x-large; }
        .mp .loading .spinner {
          position: absolute;
          width: 120px; height: 120px;
          animation: mp-spin 1s linear infinite;
          border: 32px solid #bebebe;
          border-top: 32px solid #3498db;
          border-radius: 50%;
        }
        .mp.loaded .loading { opacity: 0; }
        .mp .landmark-grid-container {
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0; left: 0;
          background-color: #99999999;
        }
        .range-arrow {
          -webkit-appearance: none;
          appearance: none;
          height: 12px;
          border-radius: 9999px;
          background:
            linear-gradient(#9D98F3, #9D98F3) 0/var(--fill, 0%) 100% no-repeat,
            #e5e7eb;
          outline: none;
        }
        .range-arrow:focus { outline: none; }
        .range-arrow::-webkit-slider-runnable-track {
          height: 12px;
          background: transparent; 
          border-radius: 9999px;
        }
        .range-arrow::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 0px;
          height: 0px;
          border-left: 13px solid transparent;
          border-right: 13px solid transparent;
          border-top: 17px solid #4f46e5;
          margin-top: -2px; 
          cursor: pointer;
        }
        .range-arrow::-moz-range-track {
          height: 8px;
          background: transparent;
          border-radius: 9999px;
        }
        .range-arrow::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: #4f46e5;
          transform: rotate(45deg);
          border: none;
          border-radius: 2px;
          cursor: pointer;
        }
        .range-arrow::-moz-focus-outer { border: 0; }
      `}</style>
    </main>
  );
}

export default function FigurePage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading...</main>}>
      <FigureInner />
    </Suspense>
  );
}