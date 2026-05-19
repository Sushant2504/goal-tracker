"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getUomLabel, formatTarget } from "@/lib/scoring";

interface QuarterlyAchievement {
  id: string;
  quarter: string;
  actualValue: string | null;
  status: string;
  computedScore: number | null;
}

interface GoalData {
  id: string;
  title: string;
  description: string | null;
  thrustArea: string;
  uomType: string;
  target: string;
  weightage: number;
  achievements?: QuarterlyAchievement[];
}

interface GoalAccordionProps {
  goal: GoalData;
}

export function GoalAccordion({ goal }: GoalAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-md bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50/80 transition-colors"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        />
        <span className="flex-1 font-medium text-gray-900 truncate">
          {goal.title}
        </span>
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0 h-4 shrink-0"
        >
          {goal.thrustArea}
        </Badge>
        <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
          {goal.weightage}%
        </span>
      </button>

      {expanded && (
        <div className="border-t px-3 py-2.5 space-y-2 text-[12px] animate-slide-down">
          {goal.description && (
            <div>
              <span className="text-gray-400 font-medium">Description</span>
              <p className="text-gray-600 mt-0.5">{goal.description}</p>
            </div>
          )}

          <div className="flex gap-4">
            <div>
              <span className="text-gray-400 font-medium">Measure</span>
              <p className="text-gray-600 mt-0.5">
                {getUomLabel(goal.uomType)}
              </p>
            </div>
            <div>
              <span className="text-gray-400 font-medium">Target</span>
              <p className="text-gray-600 mt-0.5">
                {formatTarget(goal.uomType, goal.target)}
              </p>
            </div>
          </div>

          {goal.achievements && goal.achievements.length > 0 && (
            <div>
              <span className="text-gray-400 font-medium">
                Quarterly Scores
              </span>
              <div className="mt-1 grid grid-cols-4 gap-1.5">
                {["Q1", "Q2", "Q3", "Q4"].map((q) => {
                  const achievement = goal.achievements?.find(
                    (a) => a.quarter === q
                  );
                  return (
                    <div
                      key={q}
                      className="rounded bg-gray-50 px-2 py-1 text-center"
                    >
                      <span className="text-[10px] text-gray-400 block">
                        {q}
                      </span>
                      <span className="text-[12px] font-medium text-gray-700">
                        {achievement?.computedScore != null
                          ? `${Math.round(achievement.computedScore)}%`
                          : "-"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
