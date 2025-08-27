'use client';

import { Suspense, useEffect, useState } from "react";
import { Lexend } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import Stepper from "../components/Stepper";
import AnteriorBody from "../components/AnteriorBody";
import PosteriorBody from "../components/PosteriorBody";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

type Exercise = { id: string; title: string; muscles: string; imageUrl: string };
const EXERCISES: Exercise[] = [
  { id: "db-front-hold", title: "Dumbbell Front Hold", muscles: "Shoulders, Traps", imageUrl: "https://static.strengthlevel.com/images/exercises/dumbbell-front-raise/dumbbell-front-raise-800.avif" },
  { id: "db-incline-fly", title: "Dumbbell Incline Fly", muscles: "Chest, Biceps", imageUrl: "https://static.strengthlevel.com/images/exercises/incline-dumbbell-fly/incline-dumbbell-fly-800.avif" },
  { id: "bench-press", title: "Bench Press", muscles: "Chest, Shoulders, Triceps", imageUrl: "https://static.strengthlevel.com/images/exercises/bench-press/bench-press-800.avif" },
  { id: "lat-raise", title: "Lateral Raise", muscles: "Shoulders", imageUrl: "https://static.strengthlevel.com/images/exercises/dumbbell-lateral-raise/dumbbell-lateral-raise-800.avif" },
  { id: "arnold-press", title: "Arnold Press", muscles: "Biceps, Triceps", imageUrl: "https://static.strengthlevel.com/images/exercises/arnold-press/arnold-press-800.avif" },
];

function MuscleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedExerciseId = searchParams.get("exercise") || "";
  const selectedExercise = EXERCISES.find(ex => ex.id === selectedExerciseId);

  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);

  useEffect(() => {
    const muscleMap: Record<string, string[]> = {
      "db-front-hold": ["Shoulders", "Traps"],
      "db-incline-fly": ["Chest", "Biceps"],
      "bench-press": ["Chest", "Shoulders", "Triceps"],
      "lat-raise": ["Shoulders"],
      "arnold-press": ["Biceps", "Triceps"],
    };
    setSelectedMuscles(selectedExerciseId && muscleMap[selectedExerciseId] ? muscleMap[selectedExerciseId] : []);
  }, [selectedExerciseId]);

  const handleMuscleSelect = (muscleName: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscleName) ? prev.filter(m => m !== muscleName) : [...prev, muscleName]
    );
  };

  const goNext = () => {
    const musclesParam = encodeURIComponent(selectedMuscles.join(","));
    const exParam = encodeURIComponent(selectedExerciseId || "");
    router.push(`/feedback?exercise=${exParam}&muscles=${musclesParam}`);
  };

  return (
    <main className="font-sans min-h-screen bg-zinc-100 p-4 sm:p-6" style={{ fontFamily: `var(--font-lexend)` }}>
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 sm:p-8 shadow-xl ring-1 ring-black/5 min-h-[640px] md:min-h-[620px]">
        <div className="mb-6">
          <Stepper activeIndex={1} />
        </div>

        {selectedExercise ? (
          <h1 className="mb-1 text-xl sm:text-xl font-extrabold text-zinc-900">
            Muscles for: <span className="text-indigo-600">{selectedExercise.title}</span>
          </h1>
        ) : (
          <h1 className="mb-1 text-2xl sm:text-3xl font-extrabold text-zinc-900">Select Muscle to Train</h1>
        )}
        <p className="text-zinc-500 mb-6">Primary muscles are pre-selected. Adjust as needed.</p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="flex flex-col items-center gap-3">
            <AnteriorBody selectedMuscles={selectedMuscles} onSelect={handleMuscleSelect} />
            <span className="text-zinc-600">Front</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <PosteriorBody selectedMuscles={selectedMuscles} onSelect={handleMuscleSelect} />
            <span className="text-zinc-600">Back</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-200 px-5 py-2.5 text-zinc-800 hover:bg-zinc-300"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          <button
            onClick={goNext}
            disabled={selectedMuscles.length === 0 || !selectedExerciseId}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
          >
            Next
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      <style jsx global>{`
        :root { --font-lexend: ${lexend.style.fontFamily}; }
        .font-sans { font-family: var(--font-lexend), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
      `}</style>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading...</main>}>
      <MuscleInner />
    </Suspense>
  );
}
