"use client";

import React from "react";

export function Step({
  step,
  label,
  active,
}: {
  step: number;
  label: string;
  active: boolean;
}) {
  return (
    <div className="relative flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors
          ${active ? "border-indigo-600 text-white bg-indigo-600" : "border-gray-300 text-gray-500 bg-white"}`}
      >
        {step}
      </div>
      <span className={`text-base font-semibold ${active ? "text-indigo-700" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}

export default function Stepper({ activeIndex }: { activeIndex: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center justify-between">
      <Step step={1} label="Exercise" active={activeIndex === 0} />
      <div className="flex-1 px-3">
        <div className={`h-0.5 ${activeIndex > 0 ? "bg-indigo-300" : "bg-gray-200"}`} />
      </div>
      <Step step={2} label="Muscle" active={activeIndex === 1} />
      <div className="flex-1 px-3">
        <div className={`h-0.5 ${activeIndex > 1 ? "bg-indigo-300" : "bg-gray-200"}`} />
      </div>
      <Step step={3} label="Feedback" active={activeIndex === 2} />
    </div>
  );
}
