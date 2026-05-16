import { PrismaClient } from "../src/generated/prisma/client.ts";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.escalationRule.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.quarterlyAchievement.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.goalSheet.deleteMany();
  await prisma.goalCycle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@atomburg.com",
      passwordHash: hash("admin123"),
      name: "Priya Sharma",
      role: "ADMIN",
      department: "Human Resources",
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: "manager1@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Rajesh Kumar",
      role: "MANAGER",
      department: "Engineering",
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: "manager2@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Anita Desai",
      role: "MANAGER",
      department: "Operations",
    },
  });

  const emp1 = await prisma.user.create({
    data: {
      email: "emp1@atomburg.com",
      passwordHash: hash("emp123"),
      name: "Amit Patel",
      role: "EMPLOYEE",
      department: "Engineering",
      managerId: manager1.id,
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      email: "emp2@atomburg.com",
      passwordHash: hash("emp123"),
      name: "Sneha Reddy",
      role: "EMPLOYEE",
      department: "Engineering",
      managerId: manager1.id,
    },
  });

  const emp3 = await prisma.user.create({
    data: {
      email: "emp3@atomburg.com",
      passwordHash: hash("emp123"),
      name: "Vikram Singh",
      role: "EMPLOYEE",
      department: "Operations",
      managerId: manager2.id,
    },
  });

  const emp4 = await prisma.user.create({
    data: {
      email: "emp4@atomburg.com",
      passwordHash: hash("emp123"),
      name: "Kavita Joshi",
      role: "EMPLOYEE",
      department: "Operations",
      managerId: manager2.id,
    },
  });

  const emp5 = await prisma.user.create({
    data: {
      email: "emp5@atomburg.com",
      passwordHash: hash("emp123"),
      name: "Rohan Mehta",
      role: "EMPLOYEE",
      department: "Engineering",
      managerId: manager1.id,
    },
  });

  const cycle = await prisma.goalCycle.create({
    data: {
      name: "FY 2025-26",
      goalSettingOpens: new Date("2025-05-01"),
      goalSettingCloses: new Date("2025-06-30"),
      q1Opens: new Date("2025-07-01"),
      q1Closes: new Date("2025-07-31"),
      q2Opens: new Date("2025-10-01"),
      q2Closes: new Date("2025-10-31"),
      q3Opens: new Date("2026-01-01"),
      q3Closes: new Date("2026-01-31"),
      q4Opens: new Date("2026-03-01"),
      q4Closes: new Date("2026-04-30"),
      status: "ACTIVE",
    },
  });

  const sheet1 = await prisma.goalSheet.create({
    data: {
      employeeId: emp1.id,
      cycleId: cycle.id,
      status: "APPROVED",
      submittedAt: new Date("2025-05-10"),
      approvedAt: new Date("2025-05-15"),
      approvedById: manager1.id,
    },
  });

  const goals1 = await Promise.all([
    prisma.goal.create({
      data: {
        goalSheetId: sheet1.id,
        sortOrder: 0,
        thrustArea: "Product Development",
        title: "Deliver Payment Gateway Integration",
        description: "Complete end-to-end payment gateway integration with Razorpay",
        uomType: "TIMELINE",
        target: "2025-09-30",
        weightage: 30,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet1.id,
        sortOrder: 1,
        thrustArea: "Quality",
        title: "Reduce Bug Density",
        description: "Reduce production bugs per sprint from 8 to 3",
        uomType: "MAX_NUMERIC",
        target: "3",
        weightage: 25,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet1.id,
        sortOrder: 2,
        thrustArea: "Revenue",
        title: "Increase API Revenue",
        description: "Grow monthly API subscription revenue",
        uomType: "MIN_NUMERIC",
        target: "500000",
        weightage: 25,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet1.id,
        sortOrder: 3,
        thrustArea: "Safety",
        title: "Zero Security Incidents",
        description: "Maintain zero critical security vulnerabilities in production",
        uomType: "ZERO",
        target: "0",
        weightage: 20,
      },
    }),
  ]);

  await Promise.all([
    prisma.quarterlyAchievement.create({
      data: { goalId: goals1[0].id, quarter: "Q1", actualValue: "2025-08-15", status: "ON_TRACK", computedScore: 100, updatedById: emp1.id },
    }),
    prisma.quarterlyAchievement.create({
      data: { goalId: goals1[1].id, quarter: "Q1", actualValue: "5", status: "ON_TRACK", computedScore: 60, updatedById: emp1.id },
    }),
    prisma.quarterlyAchievement.create({
      data: { goalId: goals1[2].id, quarter: "Q1", actualValue: "350000", status: "ON_TRACK", computedScore: 70, updatedById: emp1.id },
    }),
    prisma.quarterlyAchievement.create({
      data: { goalId: goals1[3].id, quarter: "Q1", actualValue: "0", status: "COMPLETED", computedScore: 100, updatedById: emp1.id },
    }),
  ]);

  await prisma.checkIn.create({
    data: {
      goalSheetId: sheet1.id,
      quarter: "Q1",
      employeeNotes: "Good progress on payment integration. Bug reduction is a work in progress.",
      managerComment: "Strong start on payment gateway. Need to focus more on bug reduction targets.",
      managerId: manager1.id,
    },
  });

  const sheet2 = await prisma.goalSheet.create({
    data: {
      employeeId: emp2.id,
      cycleId: cycle.id,
      status: "SUBMITTED",
      submittedAt: new Date("2025-05-12"),
    },
  });

  await Promise.all([
    prisma.goal.create({
      data: {
        goalSheetId: sheet2.id, sortOrder: 0,
        thrustArea: "Customer Success", title: "Improve NPS Score",
        description: "Increase Net Promoter Score from 45 to 65",
        uomType: "MIN_NUMERIC", target: "65", weightage: 30,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet2.id, sortOrder: 1,
        thrustArea: "Quality", title: "Achieve 95% Test Coverage",
        description: "Increase unit test coverage across all microservices",
        uomType: "MIN_PERCENT", target: "95", weightage: 25,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet2.id, sortOrder: 2,
        thrustArea: "Efficiency", title: "Reduce Deployment Time",
        description: "Reduce CI/CD pipeline time from 45 min to 15 min",
        uomType: "MAX_NUMERIC", target: "15", weightage: 25,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet2.id, sortOrder: 3,
        thrustArea: "Learning", title: "Complete AWS Certification",
        description: "Obtain AWS Solutions Architect Associate certification",
        uomType: "TIMELINE", target: "2025-12-31", weightage: 20,
      },
    }),
  ]);

  const sheet3 = await prisma.goalSheet.create({
    data: {
      employeeId: emp3.id,
      cycleId: cycle.id,
      status: "APPROVED",
      submittedAt: new Date("2025-05-08"),
      approvedAt: new Date("2025-05-12"),
      approvedById: manager2.id,
    },
  });

  const goals3 = await Promise.all([
    prisma.goal.create({
      data: {
        goalSheetId: sheet3.id, sortOrder: 0,
        thrustArea: "Operational Excellence", title: "Reduce Downtime",
        description: "Reduce unplanned downtime from 4 hrs/month to 1 hr/month",
        uomType: "MAX_NUMERIC", target: "1", weightage: 35,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet3.id, sortOrder: 1,
        thrustArea: "Cost Optimization", title: "Reduce Infrastructure Costs",
        description: "Reduce monthly cloud spend by 20%",
        uomType: "MIN_PERCENT", target: "20", weightage: 35,
      },
    }),
    prisma.goal.create({
      data: {
        goalSheetId: sheet3.id, sortOrder: 2,
        thrustArea: "Safety", title: "Zero Compliance Violations",
        description: "Maintain zero compliance audit findings",
        uomType: "ZERO", target: "0", weightage: 30,
      },
    }),
  ]);

  await Promise.all([
    prisma.quarterlyAchievement.create({
      data: { goalId: goals3[0].id, quarter: "Q1", actualValue: "2", status: "ON_TRACK", computedScore: 50, updatedById: emp3.id },
    }),
    prisma.quarterlyAchievement.create({
      data: { goalId: goals3[1].id, quarter: "Q1", actualValue: "12", status: "ON_TRACK", computedScore: 60, updatedById: emp3.id },
    }),
    prisma.quarterlyAchievement.create({
      data: { goalId: goals3[2].id, quarter: "Q1", actualValue: "0", status: "COMPLETED", computedScore: 100, updatedById: emp3.id },
    }),
  ]);

  await Promise.all([
    prisma.escalationRule.create({
      data: {
        type: "GOAL_NOT_SUBMITTED",
        daysThreshold: 7,
        escalationLevels: JSON.stringify([
          { level: 1, action: "NOTIFY_EMPLOYEE", days: 7 },
          { level: 2, action: "NOTIFY_MANAGER", days: 14 },
          { level: 3, action: "NOTIFY_HR", days: 21 },
        ]),
      },
    }),
    prisma.escalationRule.create({
      data: {
        type: "GOAL_NOT_APPROVED",
        daysThreshold: 5,
        escalationLevels: JSON.stringify([
          { level: 1, action: "NOTIFY_MANAGER", days: 5 },
          { level: 2, action: "NOTIFY_SKIP_LEVEL", days: 10 },
        ]),
      },
    }),
    prisma.escalationRule.create({
      data: {
        type: "CHECKIN_OVERDUE",
        daysThreshold: 7,
        escalationLevels: JSON.stringify([
          { level: 1, action: "NOTIFY_EMPLOYEE", days: 7 },
          { level: 2, action: "NOTIFY_MANAGER", days: 14 },
        ]),
      },
    }),
  ]);

  await prisma.appSettings.create({ data: { id: "app" } });

  await prisma.auditLog.create({
    data: {
      userId: manager1.id,
      action: "APPROVE_GOALS",
      entityType: "GoalSheet",
      entityId: sheet1.id,
      newValue: JSON.stringify({ status: "APPROVED" }),
    },
  });

  await Promise.all([
    prisma.notification.create({
      data: {
        userId: emp1.id, type: "GOAL_APPROVED", title: "Goals Approved",
        message: "Your goal sheet for FY 2025-26 has been approved by Rajesh Kumar.",
        link: "/dashboard/employee/goals", isRead: true,
      },
    }),
    prisma.notification.create({
      data: {
        userId: manager1.id, type: "GOAL_SUBMITTED", title: "Goals Submitted for Review",
        message: "Sneha Reddy has submitted goals for FY 2025-26.",
        link: "/dashboard/manager/approve",
      },
    }),
    prisma.notification.create({
      data: {
        userId: emp4.id, type: "REMINDER", title: "Goal Submission Reminder",
        message: "Please submit your goals for FY 2025-26. The deadline is approaching.",
        link: "/dashboard/employee/goals",
      },
    }),
  ]);

  console.log("Seed data created successfully!");
  console.log("\nLogin Credentials:");
  console.log("==================");
  console.log("Admin:    admin@atomburg.com / admin123");
  console.log("Manager:  manager1@atomburg.com / manager123");
  console.log("Manager:  manager2@atomburg.com / manager123");
  console.log("Employee: emp1@atomburg.com / emp123");
  console.log("Employee: emp2@atomburg.com / emp123");
  console.log("Employee: emp3@atomburg.com / emp123");
  console.log("Employee: emp4@atomburg.com / emp123");
  console.log("Employee: emp5@atomburg.com / emp123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
