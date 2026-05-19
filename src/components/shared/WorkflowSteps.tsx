"use client";

import { Check, CornerDownLeft } from "lucide-react";

interface WorkflowStepsProps {
  currentStatus: string;
}

const STEPS = [
  { key: "DRAFT", label: "Draft", number: 1 },
  { key: "SUBMITTED", label: "Submitted", number: 2 },
  { key: "APPROVED", label: "Approved", number: 3 },
] as const;

const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  APPROVED: 2,
  RETURNED: 1, // same level as SUBMITTED for ordering purposes
};

export function WorkflowSteps({ currentStatus }: WorkflowStepsProps) {
  const currentIndex = STATUS_ORDER[currentStatus] ?? 0;
  const isReturned = currentStatus === "RETURNED";

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 mb-3">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = currentIndex > index;
          const isCurrent = currentIndex === index && !isReturned;
          const isFuture = currentIndex < index;
          // For RETURNED status, "Submitted" step is not completed and not current
          const isReturnedStep = isReturned && index === 1;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {/* Circle */}
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-semibold transition-all ${
                      isCompleted
                        ? "border-blue-700 bg-blue-700 text-white"
                        : isCurrent
                          ? "border-blue-700 bg-white text-blue-700"
                          : isReturnedStep
                            ? "border-amber-500 bg-amber-50 text-amber-600"
                            : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-700 animate-ping opacity-30" />
                  )}
                </div>
                {/* Label */}
                <span
                  className={`mt-1.5 text-[11px] font-medium ${
                    isCompleted
                      ? "text-blue-700"
                      : isCurrent
                        ? "text-blue-700"
                        : isReturnedStep
                          ? "text-amber-600"
                          : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
                {/* Returned branch indicator */}
                {isReturnedStep && (
                  <div className="flex items-center gap-1 mt-1">
                    <CornerDownLeft className="h-3 w-3 text-red-500" />
                    <span className="text-[10px] font-medium text-red-600">
                      Returned
                    </span>
                  </div>
                )}
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    isCompleted && !isFuture ? "bg-blue-700" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
