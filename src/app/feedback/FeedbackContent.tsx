'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import Stepper from "../components/Stepper";
import { Lexend } from "next/font/google";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

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

type PhaseFormState = { intensity: number };
const defaultPhaseState: PhaseFormState = { intensity: 0 };

export default function FeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const exerciseId = searchParams.get("exercise") || "";
  const musclesRaw = searchParams.get("muscles") || "";

  const selectedExercise = EXERCISES.find((ex) => ex.id === exerciseId);
  const phases = selectedExercise?.phases || [];

  const [selectedPhaseNames, setSelectedPhaseNames] = useState<string[]>([]);
  const [configured, setConfigured] = useState<Set<string>>(new Set());
  const [forms, setForms] = useState<Record<string, PhaseFormState>>({});

  useEffect(() => {
    setSelectedPhaseNames([]);
    setForms({});
    setConfigured(new Set());
  }, [exerciseId]);

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

  const goBack = () => {
    const exParam = encodeURIComponent(exerciseId);
    router.push(`/muscle?exercise=${exParam}`);
  };

  const goFinish = () => {
    const exParam = encodeURIComponent(exerciseId);
    const musclesParam = encodeURIComponent(musclesRaw || "");
    const phasesParam = encodeURIComponent(selectedPhaseNames.join(","));
    
    const intensityValues = selectedPhaseNames.map(phaseName => {
      return forms[phaseName]?.intensity || 0;
    });
    const intensityParam = encodeURIComponent(intensityValues.join(","));

    router.push(`/monitor?exercise=${exParam}&muscles=${musclesParam}&phases=${phasesParam}&intensity=${intensityParam}`);
  };

  return (
    <main className={`${lexend.variable} font-sans min-h-screen bg-zinc-100 p-6 sm:p-8`}>
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 sm:p-8 shadow-xl ring-1 ring-black/5">
        <div className="mb-6">
          <Stepper activeIndex={2} />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 text-center">Build Your Feedback Path</h1>
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
            {phases.map((phase) => {
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
                const phaseData = phases.find((p) => p.name === phaseName);
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

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-200 px-5 py-2.5 text-zinc-800 hover:bg-zinc-300"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

        <button
          onClick={goFinish}
          disabled={configured.size !== selectedPhaseNames.length || selectedPhaseNames.length === 0}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
        >
          Finish
          {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg> */}
        </button>
        </div>
      </div>

      <style jsx global>{`
        :root { --font-lexend: ${lexend.style.fontFamily}; }
        .font-sans { font-family: var(--font-lexend), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }

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

        /* WebKit track/thumb */
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
          border-top: 17px solid #4f46e5; /* indigo-600 */
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