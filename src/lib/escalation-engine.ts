import { prisma } from "./prisma";
import { createNotification } from "./notifications";
import { differenceInDays } from "date-fns";

interface EscalationLevel {
  level: number;
  action: string;
  days: number;
}

export async function runEscalationCheck() {
  const rules = await prisma.escalationRule.findMany({
    where: { isActive: true },
  });

  const activeCycle = await prisma.goalCycle.findFirst({
    where: { status: "ACTIVE" },
  });

  if (!activeCycle) return { checked: 0, escalated: 0 };

  let escalated = 0;

  for (const rule of rules) {
    const levels: EscalationLevel[] = JSON.parse(rule.escalationLevels);

    switch (rule.type) {
      case "GOAL_NOT_SUBMITTED": {
        const employees = await prisma.user.findMany({
          where: { role: "EMPLOYEE" },
          include: {
            goalSheets: {
              where: { cycleId: activeCycle.id },
            },
            manager: true,
          },
        });

        for (const emp of employees) {
          const hasSubmitted = emp.goalSheets.some(
            (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
          );
          if (hasSubmitted) continue;

          const daysSinceOpen = differenceInDays(
            new Date(),
            activeCycle.goalSettingOpens
          );

          for (const level of levels) {
            if (daysSinceOpen >= level.days) {
              const existing = await prisma.escalation.findFirst({
                where: {
                  ruleId: rule.id,
                  targetUserId: emp.id,
                  cycleId: activeCycle.id,
                  currentLevel: { gte: level.level },
                },
              });
              if (existing) continue;

              await prisma.escalation.create({
                data: {
                  ruleId: rule.id,
                  targetUserId: emp.id,
                  cycleId: activeCycle.id,
                  currentLevel: level.level,
                },
              });

              const targetUser =
                level.action === "NOTIFY_MANAGER" && emp.manager
                  ? emp.manager
                  : emp;

              await createNotification(
                targetUser.id,
                "ESCALATION",
                "Goal Submission Overdue",
                `${emp.name} has not submitted goals for ${activeCycle.name}. ${daysSinceOpen} days since cycle opened.`,
                "/dashboard/employee/goals"
              );

              escalated++;
            }
          }
        }
        break;
      }

      case "GOAL_NOT_APPROVED": {
        const pendingSheets = await prisma.goalSheet.findMany({
          where: {
            cycleId: activeCycle.id,
            status: "SUBMITTED",
          },
          include: {
            employee: { include: { manager: true } },
          },
        });

        for (const sheet of pendingSheets) {
          if (!sheet.submittedAt) continue;
          const daysSinceSubmit = differenceInDays(
            new Date(),
            sheet.submittedAt
          );

          for (const level of levels) {
            if (daysSinceSubmit >= level.days && sheet.employee.manager) {
              const existing = await prisma.escalation.findFirst({
                where: {
                  ruleId: rule.id,
                  targetUserId: sheet.employee.managerId!,
                  cycleId: activeCycle.id,
                  currentLevel: { gte: level.level },
                },
              });
              if (existing) continue;

              await prisma.escalation.create({
                data: {
                  ruleId: rule.id,
                  targetUserId: sheet.employee.managerId!,
                  cycleId: activeCycle.id,
                  currentLevel: level.level,
                },
              });

              await createNotification(
                sheet.employee.managerId!,
                "ESCALATION",
                "Goal Approval Overdue",
                `${sheet.employee.name}'s goals have been pending approval for ${daysSinceSubmit} days.`,
                "/dashboard/manager/approve"
              );

              escalated++;
            }
          }
        }
        break;
      }

      case "CHECKIN_OVERDUE": {
        const now = new Date();
        let activeQuarter: string | null = null;
        if (now >= activeCycle.q1Opens && now <= activeCycle.q1Closes) activeQuarter = "Q1";
        else if (now >= activeCycle.q2Opens && now <= activeCycle.q2Closes) activeQuarter = "Q2";
        else if (now >= activeCycle.q3Opens && now <= activeCycle.q3Closes) activeQuarter = "Q3";
        else if (now >= activeCycle.q4Opens && now <= activeCycle.q4Closes) activeQuarter = "Q4";

        if (!activeQuarter) continue;

        const approvedSheets = await prisma.goalSheet.findMany({
          where: {
            cycleId: activeCycle.id,
            status: "APPROVED",
          },
          include: {
            employee: { include: { manager: true } },
            checkIns: { where: { quarter: activeQuarter } },
          },
        });

        const quarterOpens =
          activeCycle[`${activeQuarter.toLowerCase()}Opens` as keyof typeof activeCycle] as Date;

        for (const sheet of approvedSheets) {
          if (sheet.checkIns.length > 0) continue;

          const daysSinceOpen = differenceInDays(now, quarterOpens);

          for (const level of levels) {
            if (daysSinceOpen >= level.days) {
              await createNotification(
                sheet.employeeId,
                "ESCALATION",
                "Check-in Overdue",
                `Your ${activeQuarter} check-in for ${activeCycle.name} is overdue.`,
                "/dashboard/employee/checkins"
              );
              escalated++;
            }
          }
        }
        break;
      }
    }
  }

  return { checked: rules.length, escalated };
}
