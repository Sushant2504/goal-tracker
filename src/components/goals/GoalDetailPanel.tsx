"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { GoalAccordion } from "./GoalAccordion";
import { ActivityTimeline, Activity } from "./ActivityTimeline";
import { CommentSection } from "./CommentSection";
import { Loader2, Calendar, FileText, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GoalSheetDetail {
  id: string;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  returnComment: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    managerId: string | null;
  };
  cycle: {
    id: string;
    name: string;
    status: string;
  };
  approvedBy: { id: string; name: string } | null;
  goals: {
    id: string;
    title: string;
    description: string | null;
    thrustArea: string;
    uomType: string;
    target: string;
    weightage: number;
    sortOrder: number;
    achievements: {
      id: string;
      quarter: string;
      actualValue: string | null;
      status: string;
      computedScore: number | null;
    }[];
  }[];
  checkIns: {
    id: string;
    quarter: string;
    employeeNotes: string | null;
    managerComment: string | null;
    checkedInAt: string;
    manager: { id: string; name: string };
  }[];
}

interface GoalDetailPanelProps {
  sheetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalDetailPanel({
  sheetId,
  open,
  onOpenChange,
}: GoalDetailPanelProps) {
  const [sheet, setSheet] = useState<GoalSheetDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("goals");

  const fetchSheet = useCallback(async () => {
    if (!sheetId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/goal-sheets/${sheetId}`);
      if (res.ok) {
        const data = await res.json();
        setSheet(data);
      }
    } catch (error) {
      console.error("Failed to fetch goal sheet:", error);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  const fetchActivities = useCallback(async () => {
    if (!sheetId) return;
    try {
      const res = await fetch(`/api/goal-sheets/${sheetId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    }
  }, [sheetId]);

  useEffect(() => {
    if (open && sheetId) {
      setActiveTab("goals");
      fetchSheet();
      fetchActivities();
    } else {
      setSheet(null);
      setActivities([]);
    }
  }, [open, sheetId, fetchSheet, fetchActivities]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-lg overflow-y-auto"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sheet ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <UserAvatar name={sheet.employee.name} size="md" />
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-[15px] truncate">
                    {sheet.employee.name}
                  </SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-0.5 text-[12px]">
                    <span>{sheet.cycle.name}</span>
                    <span className="text-gray-300">|</span>
                    <StatusBadge status={sheet.status} />
                  </SheetDescription>
                </div>
              </div>

              {sheet.employee.department && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {sheet.employee.department}
                </p>
              )}

              {sheet.returnComment && sheet.status === "RETURNED" && (
                <div className="mt-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700">
                  <span className="font-medium">Return comment:</span>{" "}
                  {sheet.returnComment}
                </div>
              )}
            </SheetHeader>

            <div className="px-4 pb-4 flex-1">
              <Tabs
                value={activeTab}
                onValueChange={(val: string | number | null) =>
                  setActiveTab(String(val))
                }
              >
                <TabsList variant="line" className="mb-3">
                  <TabsTrigger value="goals">
                    <Target className="h-3.5 w-3.5" />
                    Goals ({sheet.goals.length})
                  </TabsTrigger>
                  <TabsTrigger value="checkins">
                    <Calendar className="h-3.5 w-3.5" />
                    Check-ins ({sheet.checkIns.length})
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    <FileText className="h-3.5 w-3.5" />
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="goals">
                  {sheet.goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Target className="h-8 w-8 mb-2" />
                      <p className="text-[13px]">No goals added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sheet.goals.map((goal) => (
                        <GoalAccordion key={goal.id} goal={goal} />
                      ))}
                      <div className="text-[11px] text-gray-400 text-right pt-1">
                        Total weightage:{" "}
                        {sheet.goals.reduce((sum, g) => sum + g.weightage, 0)}%
                      </div>
                    </div>
                  )}

                  {/* Comments section under goals */}
                  <div className="mt-4 border-t pt-3">
                    <h4 className="text-[13px] font-medium text-gray-700 mb-2">
                      Comments
                    </h4>
                    <CommentSection sheetId={sheet.id} />
                  </div>
                </TabsContent>

                <TabsContent value="checkins">
                  {sheet.checkIns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Calendar className="h-8 w-8 mb-2" />
                      <p className="text-[13px]">No check-ins yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sheet.checkIns.map((checkin) => (
                        <div
                          key={checkin.id}
                          className="rounded-md border bg-white p-3 text-[13px]"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-gray-900">
                              {checkin.quarter} Check-in
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {formatDistanceToNow(
                                new Date(checkin.checkedInAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          {checkin.employeeNotes && (
                            <div className="mb-1.5">
                              <span className="text-[11px] text-gray-400 font-medium">
                                Employee Notes
                              </span>
                              <p className="text-gray-600 mt-0.5">
                                {checkin.employeeNotes}
                              </p>
                            </div>
                          )}
                          {checkin.managerComment && (
                            <div>
                              <span className="text-[11px] text-gray-400 font-medium">
                                Manager ({checkin.manager.name})
                              </span>
                              <p className="text-gray-600 mt-0.5">
                                {checkin.managerComment}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity">
                  <ActivityTimeline activities={activities} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p className="text-[13px]">Select a goal sheet to view details</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
