"use client";

import { Lexend } from "next/font/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Stepper from "../app/components/Stepper";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

const CARD_SHELL =
  "mx-auto max-w-5xl rounded-3xl bg-white p-5 sm:p-8 shadow-xl ring-1 ring-black/5 " +
  "min-h-[640px] md:min-h-[620px]";

type Exercise = { id: string; title: string; muscles: string; imageUrl: string };
const EXERCISES: Exercise[] = [
  { id: "db-front-hold", title: "Dumbbell Front Hold", muscles: "Shoulders, Traps", imageUrl: "https://static.strengthlevel.com/images/exercises/dumbbell-front-raise/dumbbell-front-raise-800.avif" },
  { id: "db-incline-fly", title: "Dumbbell Incline Fly", muscles: "Chest, Biceps", imageUrl: "https://static.strengthlevel.com/images/exercises/incline-dumbbell-fly/incline-dumbbell-fly-800.avif" },
  { id: "bench-press", title: "Bench Press", muscles: "Chest, Shoulders, Triceps", imageUrl: "https://static.strengthlevel.com/images/exercises/bench-press/bench-press-800.avif" },
  { id: "lat-raise", title: "Lateral Raise", muscles: "Shoulders", imageUrl: "https://static.strengthlevel.com/images/exercises/dumbbell-lateral-raise/dumbbell-lateral-raise-800.avif" },
  { id: "arnold-press", title: "Arnold Press", muscles: "Biceps, Triceps", imageUrl: "https://static.strengthlevel.com/images/exercises/arnold-press/arnold-press-800.avif" },
];

export default function ExercisePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className={`${lexend.variable} font-sans min-h-screen bg-zinc-100 p-4 sm:p-6`}>
      <div className={CARD_SHELL}>
        <div className="mb-6">
          <Stepper activeIndex={0} />
        </div>

        <h1 className="mb-6 text-2xl sm:text-3xl font-extrabold text-zinc-900">Select Exercise</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {EXERCISES.map((ex) => {
            const active = selected === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => setSelected(active ? null : ex.id)}
                className={`text-left rounded-2xl overflow-hidden transition ring-1
                  ${active ? "ring-indigo-500" : "ring-zinc-200 hover:ring-zinc-300"}`}
              >
                <div className={`flex ${active ? "bg-indigo-600 text-white" : "bg-zinc-50 text-zinc-900"}`}>
                  <img
                    src={ex.imageUrl}
                    alt={ex.title}
                    className={`w-20 shrink-0 object-cover ${active ? "bg-indigo-700" : "bg-zinc-200"}`}
                  />
                  <div className="flex-1 px-5 py-4 sm:py-5">
                    <div className={`text-lg sm:text-xl font-semibold ${active ? "text-white" : "text-zinc-900"}`}>
                      {ex.title}
                    </div>
                    <div className={`mt-1 text-sm ${active ? "text-indigo-100" : "text-zinc-500"}`}>
                      {ex.muscles}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-end">
          {/* <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-200 px-5 py-2.5 text-zinc-900 shadow-sm hover:bg-zinc-300 active:translate-y-[1px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button> */}

          <button
            onClick={() => router.push(`/muscle?exercise=${selected}`)}
            disabled={!selected}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 active:translate-y-[1px] disabled:opacity-60"
          >
            Next
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
