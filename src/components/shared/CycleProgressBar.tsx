"use client";

import { isAfter, isBefore, isWithinInterval, format } from "date-fns";

interface CycleData {
  goalSettingOpens: string;
  goalSettingCloses: string;
  q1Opens: string;
  q1Closes: string;
  q2Opens: string;
  q2Closes: string;
  q3Opens: string;
  q3Closes: string;
  q4Opens: string;
  q4Closes: string;
}

interface CycleProgressBarProps {
  cycle: CycleData;
}

interface Phase {
  label: string;
  opens: Date;
  closes: Date;
}

export function CycleProgressBar({ cycle }: CycleProgressBarProps) {
  const now = new Date();

  const phases: Phase[] = [
    {
      label: "Goal Setting",
      opens: new Date(cycle.goalSettingOpens),
      closes: new Date(cycle.goalSettingCloses),
    },
    { label: "Q1", opens: new Date(cycle.q1Opens), closes: new Date(cycle.q1Closes) },
    { label: "Q2", opens: new Date(cycle.q2Opens), closes: new Date(cycle.q2Closes) },
    { label: "Q3", opens: new Date(cycle.q3Opens), closes: new Date(cycle.q3Closes) },
    { label: "Q4", opens: new Date(cycle.q4Opens), closes: new Date(cycle.q4Closes) },
  ];

  const totalStart = phases[0].opens.getTime();
  const totalEnd = phases[phases.length - 1].closes.getTime();
  const totalDuration = totalEnd - totalStart;

  function getPhaseStatus(phase: Phase): "past" | "current" | "future" {
    if (isWithinInterval(now, { start: phase.opens, end: phase.closes })) {
      return "current";
    }
    if (isAfter(now, phase.closes)) {
      return "past";
    }
    return "future";
  }

  function getPhaseWidth(phase: Phase): number {
    if (totalDuration === 0) return 100 / phases.length;
    const phaseDuration = phase.closes.getTime() - phase.opens.getTime();
    return (phaseDuration / totalDuration) * 100;
  }

  // Calculate current position as a percentage
  const currentProgress = totalDuration > 0
    ? Math.max(0, Math.min(100, ((now.getTime() - totalStart) / totalDuration) * 100))
    : 0;

  const isBeforeStart = isBefore(now, phases[0].opens);
  const isAfterEnd = isAfter(now, phases[phases.length - 1].closes);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
          Cycle Timeline
        </span>
        <span className="text-[10px] text-gray-400">
          {format(phases[0].opens, "MMM yyyy")} - {format(phases[phases.length - 1].closes, "MMM yyyy")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="flex h-2 rounded-full overflow-hidden">
          {phases.map((phase, index) => {
            const status = getPhaseStatus(phase);
            const width = getPhaseWidth(phase);
            return (
              <div
                key={phase.label}
                className={`h-full ${
                  status === "past"
                    ? "bg-blue-100"
                    : status === "current"
                      ? "bg-blue-500"
                      : "bg-gray-100"
                } ${index === 0 ? "rounded-l-full" : ""} ${
                  index === phases.length - 1 ? "rounded-r-full" : ""
                }`}
                style={{ width: `${width}%` }}
              />
            );
          })}
        </div>

        {/* Current position marker */}
        {!isBeforeStart && !isAfterEnd && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${currentProgress}%` }}
          >
            <div className="h-3.5 w-3.5 rounded-full bg-blue-700 border-2 border-white shadow-sm" />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="flex mt-1.5">
        {phases.map((phase) => {
          const width = getPhaseWidth(phase);
          const status = getPhaseStatus(phase);
          return (
            <div
              key={phase.label}
              className="text-center"
              style={{ width: `${width}%` }}
            >
              <span
                className={`text-[10px] ${
                  status === "current"
                    ? "font-semibold text-blue-700"
                    : status === "past"
                      ? "text-blue-400"
                      : "text-gray-400"
                }`}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
