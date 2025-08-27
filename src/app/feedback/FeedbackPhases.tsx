"use client";

import { Lexend } from "next/font/google";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Stepper from "../components/Stepper";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

type PhaseKey = "pre" | "mid" | "transition" | "post";

const PHASE_LABEL: Record<PhaseKey, string> = {
  pre: "Pre-Movement",
  mid: "Mid-rep",
  transition: "Transition",
  post: "Post-Movement",
};


function Seg({
  name,
  options,
  value,
  onChange,
  colorMap,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => {
        const id = `${name}-${opt.replace(/\s+/g, "-").toLowerCase()}`;
        const selected = value === opt;
        const custom = selected && colorMap?.[opt] ? colorMap[opt] : "";
        return (
          <label
            key={opt}
            htmlFor={id}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition
              ${selected ? "text-white shadow" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"}`}
            style={
              selected && custom
                ? { backgroundColor: custom }
                : selected
                ? { backgroundColor: "#4f46e5" }
                : {}
            }
          >
            <input
              id={id}
              className="sr-only"
              type="radio"
              name={name}
              value={opt}
              checked={selected}
              onChange={() => onChange(opt)}
            />
            {opt}
          </label>
        );
      })}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-sm text-zinc-700">
        {label}: <span className="font-semibold">{value}%</span>
      </p>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-indigo-600"
      />
    </div>
  );
}

type PhaseFormState = {
  granularity: "" | "Discrete" | "Continuous";
  direction: "" | "Global" | "Opposing" | "Reinforcing";
  intent: "" | "Warning" | "Correction" | "Information";
  trigger: "" | "Excessive Angle" | "Asymmetry";
  threshold: number;
  control: "" | "User-Defined" | "System-Detected";
  sensitivity: number;
};

const defaultPhaseState: PhaseFormState = {
  granularity: "",
  direction: "",
  intent: "",
  trigger: "",
  threshold: 50,
  control: "",
  sensitivity: 50,
};

function PhaseForm({
  state,
  onChange,
}: {
  state: PhaseFormState;
  onChange: (s: PhaseFormState) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-[220px_1fr] items-center gap-4">
        <label className="font-semibold text-zinc-900">Feedback Granularity</label>
        <Seg
          name="granularity"
          options={["Discrete", "Continuous"]}
          value={state.granularity}
          onChange={(v) => onChange({ ...state, granularity: v as PhaseFormState["granularity"] })}
        />
      </div>

      <div className="grid grid-cols-[220px_1fr] items-center gap-4">
        <label className="font-semibold text-zinc-900">Feedback Direction</label>
        <Seg
          name="direction"
          options={["Global", "Opposing", "Reinforcing"]}
          value={state.direction}
          onChange={(v) => onChange({ ...state, direction: v as PhaseFormState["direction"] })}
        />
      </div>

      <div className="grid grid-cols-[220px_1fr] items-center gap-4">
        <label className="font-semibold text-zinc-900">Feedback Intent</label>
        <Seg
          name="intent"
          options={["Warning", "Correction", "Information"]}
          value={state.intent}
          onChange={(v) => onChange({ ...state, intent: v as PhaseFormState["intent"] })}
          colorMap={{
            Warning: "#FF0F0F",
            Correction: "#FA8B0C",
            Information: "#00AAFF",
          }}
        />
      </div>

      <div className="grid grid-cols-[220px_1fr] items-start gap-4">
        <label className="mt-2 font-semibold text-zinc-900">Triggering Condition</label>
        <div>
          <Seg
            name="trigger"
            options={["Excessive Angle", "Asymmetry"]}
            value={state.trigger}
            onChange={(v) => onChange({ ...state, trigger: v as PhaseFormState["trigger"] })}
          />
          {state.trigger === "Excessive Angle" && (
            <Slider
              label="Excessive Angle Threshold"
              value={state.threshold}
              onChange={(n) => onChange({ ...state, threshold: n })}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-[220px_1fr] items-start gap-4">
        <label className="mt-2 font-semibold text-zinc-900">User Control</label>
        <div>
          <Seg
            name="control"
            options={["User-Defined", "System-Detected"]}
            value={state.control}
            onChange={(v) => onChange({ ...state, control: v as PhaseFormState["control"] })}
          />
          {state.control === "User-Defined" && (
            <Slider
              label="Sensitivity"
              value={state.sensitivity}
              onChange={(n) => onChange({ ...state, sensitivity: n })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPhases() {
  const router = useRouter();

  const [selected, setSelected] = useState<PhaseKey[]>([]);
  const [configured, setConfigured] = useState<Set<PhaseKey>>(new Set());
  const [forms, setForms] = useState<Record<PhaseKey, PhaseFormState>>({
    pre: { ...defaultPhaseState },
    mid: { ...defaultPhaseState },
    transition: { ...defaultPhaseState },
    post: { ...defaultPhaseState },
  });

  const progress = useMemo(() => {
    if (selected.length === 0) return 0;
    return Math.round((configured.size / selected.length) * 100);
  }, [selected, configured]);

  const addPhase = (p: PhaseKey) => {
    if (selected.includes(p)) return;
    setSelected((s) => [...s, p]);
  };

  const removePhase = (p: PhaseKey) => {
    setSelected((s) => s.filter((x) => x !== p));
    setConfigured((s) => {
      const next = new Set(s);
      next.delete(p);
      return next;
    });
  };

  const savePhase = (p: PhaseKey) => {
    setConfigured((s) => new Set(s).add(p));
  };

  return (
    <main className={`${lexend.variable} font-sans min-h-screen bg-zinc-100 p-6 sm:p-8`}>
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-6 sm:p-8 shadow-xl ring-1 ring-black/5">
        <div className="mb-6">
          <Stepper activeIndex={2} />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">Build Your Feedback Path</h1>
          <div className="mt-4">
            <p className="mb-1 text-sm text-zinc-500">Configuration Progress</p>
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
            {(Object.keys(PHASE_LABEL) as PhaseKey[]).map((k) => {
              const isSelected = selected.includes(k);
              return (
                <button
                  key={k}
                  onClick={() => addPhase(k)}
                  disabled={isSelected}
                  className={`h-10 w-40 rounded-xl text-sm font-medium transition
                    ${isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"}`}
                >
                  {PHASE_LABEL[k]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[380px] rounded-xl border-2 border-dashed border-zinc-300 p-4">
          {selected.length === 0 ? (
            <div className="flex h-[340px] flex-col items-center justify-center text-zinc-500">
              <svg width="28" height="28" viewBox="0 0 24 24" className="mb-3" aria-hidden>
                <path
                  d="M12 5v14m-7-7h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Click a phase card above to add it to your path.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {selected.map((k) => {
                const saved = configured.has(k);
                const st = forms[k];
                return (
                  <div key={k} className="relative rounded-xl border border-zinc-200 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-zinc-900">{PHASE_LABEL[k]}</span>
                        {saved && (
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            className="text-green-600"
                            fill="none"
                            aria-hidden
                          >
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <button
                        onClick={() => removePhase(k)}
                        className="rounded-md p-2 text-zinc-500 hover:text-red-600"
                        aria-label="Remove phase"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                          <path
                            d="M6 18L18 6M6 6l12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>

                    <PhaseForm
                      state={st}
                      onChange={(ns) => setForms((prev) => ({ ...prev, [k]: ns }))}
                    />

                    <div className="mt-5 flex justify-end">
                      <button
                        onClick={() => savePhase(k)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => router.push("/muscle")}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-200 px-5 py-2.5 text-zinc-800 hover:bg-zinc-300"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <button
            onClick={() => router.push("/monitor")}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-white shadow hover:bg-indigo-700"
          >
            Finish
            {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg> */}
          </button>
        </div>
      </div>

      <style jsx global>{`
        :root {
          --font-lexend: ${lexend.style.fontFamily};
        }
        .font-sans {
          font-family: var(--font-lexend), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu,
            Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        }
      `}</style>
    </main>
  );
}
