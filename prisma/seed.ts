import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const hash = (pw: string) => bcrypt.hashSync(pw, 10);

const DEPARTMENTS = [
  "Engineering",
  "Operations",
  "Sales",
  "Marketing",
  "Finance",
  "Product",
  "Design",
  "Human Resources",
];

const EMPLOYEE_DATA: {
  name: string;
  dept: string;
  managerKey: string;
}[] = [
  // Engineering (12)
  { name: "Amit Patel", dept: "Engineering", managerKey: "m1" },
  { name: "Sneha Reddy", dept: "Engineering", managerKey: "m1" },
  { name: "Rohan Mehta", dept: "Engineering", managerKey: "m1" },
  { name: "Priyanka Sharma", dept: "Engineering", managerKey: "m1" },
  { name: "Karthik Rajan", dept: "Engineering", managerKey: "m1" },
  { name: "Nisha Agarwal", dept: "Engineering", managerKey: "m1" },
  { name: "Arjun Nair", dept: "Engineering", managerKey: "m1" },
  { name: "Divya Menon", dept: "Engineering", managerKey: "m1" },
  { name: "Rahul Verma", dept: "Engineering", managerKey: "m1" },
  { name: "Suman Das", dept: "Engineering", managerKey: "m1" },
  { name: "Tanvi Kulkarni", dept: "Engineering", managerKey: "m1" },
  { name: "Harsh Trivedi", dept: "Engineering", managerKey: "m1" },
  // Operations (8)
  { name: "Vikram Singh", dept: "Operations", managerKey: "m2" },
  { name: "Kavita Joshi", dept: "Operations", managerKey: "m2" },
  { name: "Manoj Tiwari", dept: "Operations", managerKey: "m2" },
  { name: "Rekha Pillai", dept: "Operations", managerKey: "m2" },
  { name: "Sanjay Dubey", dept: "Operations", managerKey: "m2" },
  { name: "Pallavi Rao", dept: "Operations", managerKey: "m2" },
  { name: "Nitin Bhatt", dept: "Operations", managerKey: "m2" },
  { name: "Swati Saxena", dept: "Operations", managerKey: "m2" },
  // Sales (7)
  { name: "Aditya Kapoor", dept: "Sales", managerKey: "m3" },
  { name: "Megha Srinivasan", dept: "Sales", managerKey: "m3" },
  { name: "Ravi Chauhan", dept: "Sales", managerKey: "m3" },
  { name: "Pooja Malhotra", dept: "Sales", managerKey: "m3" },
  { name: "Deepak Yadav", dept: "Sales", managerKey: "m3" },
  { name: "Anjali Bose", dept: "Sales", managerKey: "m3" },
  { name: "Vivek Pandey", dept: "Sales", managerKey: "m3" },
  // Marketing (6)
  { name: "Neha Gupta", dept: "Marketing", managerKey: "m4" },
  { name: "Sameer Khan", dept: "Marketing", managerKey: "m4" },
  { name: "Isha Banerjee", dept: "Marketing", managerKey: "m4" },
  { name: "Gaurav Choudhary", dept: "Marketing", managerKey: "m4" },
  { name: "Ritika Dutta", dept: "Marketing", managerKey: "m4" },
  { name: "Ashwin Hegde", dept: "Marketing", managerKey: "m4" },
  // Finance (6)
  { name: "Sunil Mishra", dept: "Finance", managerKey: "m5" },
  { name: "Bhavna Thakur", dept: "Finance", managerKey: "m5" },
  { name: "Ramesh Iyer", dept: "Finance", managerKey: "m5" },
  { name: "Lakshmi Venkat", dept: "Finance", managerKey: "m5" },
  { name: "Pankaj Shetty", dept: "Finance", managerKey: "m5" },
  { name: "Vandana Jain", dept: "Finance", managerKey: "m5" },
  // Product (6)
  { name: "Akash Goyal", dept: "Product", managerKey: "m6" },
  { name: "Shruti Mohan", dept: "Product", managerKey: "m6" },
  { name: "Tarun Bhat", dept: "Product", managerKey: "m6" },
  { name: "Meghna Roy", dept: "Product", managerKey: "m6" },
  { name: "Kunal Sethi", dept: "Product", managerKey: "m6" },
  { name: "Ananya Pillai", dept: "Product", managerKey: "m6" },
  // Design (5)
  { name: "Siddharth Nair", dept: "Design", managerKey: "m7" },
  { name: "Kriti Rawat", dept: "Design", managerKey: "m7" },
  { name: "Varun Khanna", dept: "Design", managerKey: "m7" },
  { name: "Mansi Patil", dept: "Design", managerKey: "m7" },
  { name: "Dhruv Ahuja", dept: "Design", managerKey: "m7" },
];

// Status distribution: 12 DRAFT, 13 SUBMITTED, 15 APPROVED, 10 RETURNED
const STATUS_ASSIGNMENTS: (
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "RETURNED"
)[] = [
  // Engineering (12)
  "APPROVED",
  "SUBMITTED",
  "APPROVED",
  "DRAFT",
  "APPROVED",
  "RETURNED",
  "SUBMITTED",
  "APPROVED",
  "DRAFT",
  "RETURNED",
  "SUBMITTED",
  "APPROVED",
  // Operations (8)
  "APPROVED",
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "RETURNED",
  "SUBMITTED",
  "APPROVED",
  "DRAFT",
  // Sales (7)
  "APPROVED",
  "SUBMITTED",
  "RETURNED",
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "RETURNED",
  // Marketing (6)
  "SUBMITTED",
  "APPROVED",
  "DRAFT",
  "RETURNED",
  "APPROVED",
  "SUBMITTED",
  // Finance (6)
  "APPROVED",
  "SUBMITTED",
  "DRAFT",
  "APPROVED",
  "RETURNED",
  "SUBMITTED",
  // Product (6)
  "SUBMITTED",
  "APPROVED",
  "RETURNED",
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  // Design (5)
  "DRAFT",
  "APPROVED",
  "SUBMITTED",
  "RETURNED",
  "DRAFT",
];

const GOAL_TEMPLATES: Record<
  string,
  {
    thrustArea: string;
    title: string;
    description: string;
    uomType: string;
    target: string;
  }[]
> = {
  Engineering: [
    { thrustArea: "Product Development", title: "Deliver Payment Gateway Integration", description: "Complete end-to-end payment gateway integration with Razorpay", uomType: "TIMELINE", target: "2025-09-30" },
    { thrustArea: "Quality", title: "Reduce Bug Density", description: "Reduce production bugs per sprint from 8 to 3", uomType: "MAX_NUMERIC", target: "3" },
    { thrustArea: "Revenue", title: "Increase API Revenue", description: "Grow monthly API subscription revenue to 5L", uomType: "MIN_NUMERIC", target: "500000" },
    { thrustArea: "Safety", title: "Zero Security Incidents", description: "Maintain zero critical security vulnerabilities in production", uomType: "ZERO", target: "0" },
    { thrustArea: "Quality", title: "Achieve 95% Test Coverage", description: "Increase unit test coverage across all microservices", uomType: "MIN_PERCENT", target: "95" },
    { thrustArea: "Efficiency", title: "Reduce Deployment Time", description: "Reduce CI/CD pipeline time from 45 min to 15 min", uomType: "MAX_NUMERIC", target: "15" },
    { thrustArea: "Learning", title: "Complete AWS Certification", description: "Obtain AWS Solutions Architect Associate certification", uomType: "TIMELINE", target: "2025-12-31" },
    { thrustArea: "Product Development", title: "Launch Mobile App v2.0", description: "Ship mobile app redesign with new UX features", uomType: "TIMELINE", target: "2025-11-30" },
    { thrustArea: "Efficiency", title: "Reduce API Latency", description: "Reduce p95 API response time to under 200ms", uomType: "MAX_NUMERIC", target: "200" },
    { thrustArea: "Quality", title: "Automate Regression Suite", description: "Build automated regression test suite covering 80% of critical paths", uomType: "MIN_PERCENT", target: "80" },
  ],
  Operations: [
    { thrustArea: "Operational Excellence", title: "Reduce Downtime", description: "Reduce unplanned downtime from 4 hrs/month to 1 hr/month", uomType: "MAX_NUMERIC", target: "1" },
    { thrustArea: "Cost Optimization", title: "Reduce Infrastructure Costs", description: "Reduce monthly cloud spend by 20%", uomType: "MIN_PERCENT", target: "20" },
    { thrustArea: "Safety", title: "Zero Compliance Violations", description: "Maintain zero compliance audit findings", uomType: "ZERO", target: "0" },
    { thrustArea: "Efficiency", title: "Improve SLA Adherence", description: "Achieve 99.9% SLA adherence for all production services", uomType: "MIN_PERCENT", target: "99.9" },
    { thrustArea: "Process", title: "Implement ITIL Framework", description: "Roll out ITIL v4 processes across all service teams", uomType: "TIMELINE", target: "2025-10-31" },
    { thrustArea: "Operational Excellence", title: "Reduce MTTR", description: "Reduce mean time to recovery from 2 hrs to 30 min", uomType: "MAX_NUMERIC", target: "30" },
  ],
  Sales: [
    { thrustArea: "Revenue", title: "Achieve Quarterly Revenue Target", description: "Hit INR 2Cr quarterly revenue target", uomType: "MIN_NUMERIC", target: "20000000" },
    { thrustArea: "Customer Success", title: "Improve Client Retention", description: "Achieve 95% client retention rate", uomType: "MIN_PERCENT", target: "95" },
    { thrustArea: "Growth", title: "Onboard 15 New Enterprise Clients", description: "Acquire 15 new enterprise accounts", uomType: "MIN_NUMERIC", target: "15" },
    { thrustArea: "Revenue", title: "Increase Average Deal Size", description: "Increase ACV from 5L to 8L per deal", uomType: "MIN_NUMERIC", target: "800000" },
    { thrustArea: "Process", title: "Reduce Sales Cycle", description: "Reduce average sales cycle from 90 to 60 days", uomType: "MAX_NUMERIC", target: "60" },
    { thrustArea: "Customer Success", title: "Improve NPS Score", description: "Increase Net Promoter Score from 45 to 65", uomType: "MIN_NUMERIC", target: "65" },
  ],
  Marketing: [
    { thrustArea: "Brand Awareness", title: "Increase Website Traffic", description: "Grow monthly unique visitors from 50K to 100K", uomType: "MIN_NUMERIC", target: "100000" },
    { thrustArea: "Lead Generation", title: "Generate 500 MQLs per Month", description: "Consistently generate 500+ marketing qualified leads monthly", uomType: "MIN_NUMERIC", target: "500" },
    { thrustArea: "Content", title: "Publish 20 Thought Leadership Articles", description: "Publish 20 articles in industry publications", uomType: "MIN_NUMERIC", target: "20" },
    { thrustArea: "Brand Awareness", title: "Increase Social Media Engagement", description: "Grow social media engagement rate by 40%", uomType: "MIN_PERCENT", target: "40" },
    { thrustArea: "Efficiency", title: "Reduce CAC by 25%", description: "Reduce customer acquisition cost by 25% through organic channels", uomType: "MIN_PERCENT", target: "25" },
    { thrustArea: "Events", title: "Execute 4 Webinars", description: "Plan and execute 4 high-impact webinars with 200+ attendees", uomType: "MIN_NUMERIC", target: "4" },
  ],
  Finance: [
    { thrustArea: "Compliance", title: "Complete SOX Compliance Audit", description: "Successfully complete SOX compliance audit with zero findings", uomType: "ZERO", target: "0" },
    { thrustArea: "Efficiency", title: "Reduce Month-End Close Time", description: "Reduce month-end close from 10 to 5 business days", uomType: "MAX_NUMERIC", target: "5" },
    { thrustArea: "Cost Optimization", title: "Reduce Operational Expenses", description: "Reduce overall OpEx by 15% through process optimization", uomType: "MIN_PERCENT", target: "15" },
    { thrustArea: "Process", title: "Implement ERP Module", description: "Deploy advanced analytics module in ERP system", uomType: "TIMELINE", target: "2025-09-30" },
    { thrustArea: "Revenue", title: "Improve Collections Rate", description: "Achieve 98% collections rate within 60 days", uomType: "MIN_PERCENT", target: "98" },
    { thrustArea: "Quality", title: "Zero Financial Restatements", description: "Maintain zero financial restatements during the fiscal year", uomType: "ZERO", target: "0" },
  ],
  Product: [
    { thrustArea: "Product Development", title: "Launch Feature Roadmap Q3", description: "Ship all planned Q3 features by deadline", uomType: "TIMELINE", target: "2025-09-30" },
    { thrustArea: "Customer Success", title: "Increase Feature Adoption", description: "Achieve 70% adoption rate for new features within 30 days of launch", uomType: "MIN_PERCENT", target: "70" },
    { thrustArea: "Quality", title: "Reduce Customer Support Tickets", description: "Reduce product-related support tickets by 30%", uomType: "MIN_PERCENT", target: "30" },
    { thrustArea: "Growth", title: "Improve User Onboarding Completion", description: "Increase onboarding completion rate from 60% to 85%", uomType: "MIN_PERCENT", target: "85" },
    { thrustArea: "Research", title: "Conduct 30 User Interviews", description: "Complete 30 structured user research interviews", uomType: "MIN_NUMERIC", target: "30" },
    { thrustArea: "Efficiency", title: "Reduce Time to Market", description: "Reduce average feature development time by 20%", uomType: "MIN_PERCENT", target: "20" },
  ],
  Design: [
    { thrustArea: "Design System", title: "Launch Design System v2.0", description: "Complete and launch the unified design system for all products", uomType: "TIMELINE", target: "2025-10-31" },
    { thrustArea: "Quality", title: "Improve Usability Score", description: "Increase SUS (System Usability Scale) score from 72 to 85", uomType: "MIN_NUMERIC", target: "85" },
    { thrustArea: "Efficiency", title: "Reduce Design Handoff Time", description: "Reduce average design-to-dev handoff from 5 to 2 days", uomType: "MAX_NUMERIC", target: "2" },
    { thrustArea: "Accessibility", title: "Achieve WCAG AA Compliance", description: "Ensure all products meet WCAG 2.1 AA accessibility standards", uomType: "MIN_PERCENT", target: "100" },
    { thrustArea: "Brand", title: "Rebrand Marketing Collateral", description: "Complete redesign of all marketing materials to new brand guidelines", uomType: "TIMELINE", target: "2025-08-31" },
  ],
  "Human Resources": [
    { thrustArea: "Talent", title: "Reduce Attrition Rate", description: "Reduce voluntary attrition from 18% to 12%", uomType: "MAX_NUMERIC", target: "12" },
    { thrustArea: "Culture", title: "Improve Employee Satisfaction", description: "Increase eNPS from 30 to 50", uomType: "MIN_NUMERIC", target: "50" },
    { thrustArea: "Efficiency", title: "Reduce Hiring TAT", description: "Reduce time-to-hire from 45 to 25 days", uomType: "MAX_NUMERIC", target: "25" },
    { thrustArea: "Compliance", title: "Complete Policy Updates", description: "Update all HR policies to reflect new labor law amendments", uomType: "TIMELINE", target: "2025-07-31" },
  ],
};

const RETURN_COMMENTS = [
  "Goals need to be more specific with measurable targets. Please revise the descriptions.",
  "Weightage distribution is unbalanced. Please ensure weights total 100% and reflect priority.",
  "Missing alignment with department OKRs. Please map goals to team objectives.",
  "Target values are too conservative. Please set stretch targets based on last quarter's performance.",
  "Some goals overlap with other team members. Please differentiate or merge with shared goals.",
  "Description lacks clarity on success criteria. Please define clear acceptance criteria.",
  "Timeline targets need adjustment — some deadlines conflict with project milestones.",
  "Please add at least one quality-related goal as per the company goal-setting policy.",
  "The goals don't cover all required thrust areas. Add goals for safety and learning.",
  "Targets are not aligned with the updated business plan. Please review and resubmit.",
];

const CHECKIN_EMPLOYEE_NOTES = [
  "Good progress this quarter. Completed 2 of 4 milestones ahead of schedule.",
  "Facing some blockers with vendor integration but overall on track.",
  "Strong start — exceeded Q1 target by 15%. Focusing on sustainability.",
  "Making steady progress. Needed additional resources which have been approved.",
  "Completed the foundational work. Next quarter will show significant progress.",
  "Slightly behind on timeline due to scope change. Revised plan in place.",
  "All metrics trending positive. Confident about hitting annual targets.",
  "Had to pivot approach mid-quarter but recovered well. Lessons documented.",
  "Exceeded expectations on quality metrics. Revenue targets need more push.",
  "Great collaboration with cross-functional teams drove early completion.",
  "Encountered technical challenges but found innovative workarounds.",
  "Training completed ahead of schedule. Applying learnings to current projects.",
  "Client feedback has been overwhelmingly positive this quarter.",
  "Infrastructure improvements showing 30% efficiency gain already.",
  "Process automation reducing manual effort by 40%. Team morale is high.",
];

const CHECKIN_MANAGER_COMMENTS = [
  "Excellent progress. Keep up the momentum. Consider mentoring junior team members.",
  "Good work overall. Let's discuss resource allocation for next quarter.",
  "Strong execution. The vendor blocker needs escalation — I'll help coordinate.",
  "Impressive results. Let's set more ambitious targets for next quarter.",
  "Solid foundation laid. I expect acceleration in Q2. Support available as needed.",
  "Appreciate the proactive approach to the scope change. Well handled.",
  "Continue the great work. Consider documenting best practices for the team.",
  "The pivot was the right call. Let's ensure we capture these learnings.",
  "Quality work is commendable. Let's create a focused plan for revenue targets.",
  "Cross-team collaboration has been noticed by leadership. Well done.",
  "Technical challenges handled well. Consider presenting at the next tech talk.",
  "Proactive learning is appreciated. Let's identify opportunities to apply new skills.",
  "Client satisfaction improvements are directly tied to your efforts. Great job.",
  "The infrastructure gains are significant. Let's plan the next optimization phase.",
  "Automation initiative is a model for other teams. Consider sharing at all-hands.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function main() {
  console.log("Clearing existing data...");
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

  // --- Admin ---
  const admin = await prisma.user.create({
    data: {
      email: "admin@atomburg.com",
      passwordHash: hash("admin123"),
      name: "Priya Sharma",
      role: "ADMIN",
      department: "Human Resources",
    },
  });

  // --- Managers ---
  const m1 = await prisma.user.create({
    data: {
      email: "manager1@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Rajesh Kumar",
      role: "MANAGER",
      department: "Engineering",
    },
  });
  const m2 = await prisma.user.create({
    data: {
      email: "manager2@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Anita Desai",
      role: "MANAGER",
      department: "Operations",
    },
  });
  const m3 = await prisma.user.create({
    data: {
      email: "manager3@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Suresh Menon",
      role: "MANAGER",
      department: "Sales",
    },
  });
  const m4 = await prisma.user.create({
    data: {
      email: "manager4@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Deepa Nair",
      role: "MANAGER",
      department: "Marketing",
    },
  });
  const m5 = await prisma.user.create({
    data: {
      email: "manager5@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Arun Gupta",
      role: "MANAGER",
      department: "Finance",
    },
  });
  const m6 = await prisma.user.create({
    data: {
      email: "manager6@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Meera Iyer",
      role: "MANAGER",
      department: "Product",
    },
  });
  const m7 = await prisma.user.create({
    data: {
      email: "manager7@atomburg.com",
      passwordHash: hash("manager123"),
      name: "Vikrant Deshpande",
      role: "MANAGER",
      department: "Design",
    },
  });

  const managerMap: Record<string, typeof m1> = {
    m1,
    m2,
    m3,
    m4,
    m5,
    m6,
    m7,
  };

  // --- Goal Cycle ---
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

  // --- Create Employees & Goal Sheets ---
  console.log("Creating 50 employees with goal sheets...");

  const allEmployees: { user: typeof m1; status: string; index: number }[] = [];

  for (let i = 0; i < EMPLOYEE_DATA.length; i++) {
    const empData = EMPLOYEE_DATA[i];
    const status = STATUS_ASSIGNMENTS[i];
    const manager = managerMap[empData.managerKey];
    const emailNum = i + 1;

    const user = await prisma.user.create({
      data: {
        email: `emp${emailNum}@atomburg.com`,
        passwordHash: hash("emp123"),
        name: empData.name,
        role: "EMPLOYEE",
        department: empData.dept,
        managerId: manager.id,
      },
    });

    allEmployees.push({ user, status, index: i });
  }

  let returnCommentIdx = 0;
  let checkinNoteIdx = 0;
  let checkinCommentIdx = 0;

  for (const { user, status, index } of allEmployees) {
    const dept = EMPLOYEE_DATA[index].dept;
    const manager = managerMap[EMPLOYEE_DATA[index].managerKey];

    const submittedAt =
      status !== "DRAFT"
        ? randomDate(new Date("2025-05-05"), new Date("2025-05-25"))
        : null;

    const approvedAt =
      status === "APPROVED"
        ? randomDate(new Date("2025-05-15"), new Date("2025-06-01"))
        : null;

    const returnComment =
      status === "RETURNED"
        ? RETURN_COMMENTS[returnCommentIdx++ % RETURN_COMMENTS.length]
        : null;

    const sheet = await prisma.goalSheet.create({
      data: {
        employeeId: user.id,
        cycleId: cycle.id,
        status,
        submittedAt,
        approvedAt,
        approvedById: status === "APPROVED" ? manager.id : null,
        returnComment,
      },
    });

    // Pick 3-4 goals from the department templates
    const deptGoals = GOAL_TEMPLATES[dept] || GOAL_TEMPLATES["Engineering"];
    const numGoals = 3 + (index % 2); // alternates between 3 and 4
    const selectedGoals = pickN(deptGoals, numGoals);

    // Distribute weightage to total 100
    const baseWeight = Math.floor(100 / numGoals);
    const remainder = 100 - baseWeight * numGoals;

    const createdGoals = await Promise.all(
      selectedGoals.map((g, gi) =>
        prisma.goal.create({
          data: {
            goalSheetId: sheet.id,
            sortOrder: gi,
            thrustArea: g.thrustArea,
            title: g.title,
            description: g.description,
            uomType: g.uomType,
            target: g.target,
            weightage: baseWeight + (gi < remainder ? 1 : 0),
          },
        })
      )
    );

    // For APPROVED sheets: add Q1 achievements and check-ins
    if (status === "APPROVED") {
      await Promise.all(
        createdGoals.map((goal) => {
          const achievementStatus = pickRandom([
            "ON_TRACK",
            "ON_TRACK",
            "COMPLETED",
            "NOT_STARTED",
          ]);
          const score =
            achievementStatus === "COMPLETED"
              ? 100
              : achievementStatus === "ON_TRACK"
                ? 40 + Math.floor(Math.random() * 50)
                : null;
          const actualValue =
            achievementStatus !== "NOT_STARTED"
              ? String(Math.floor(Math.random() * 100))
              : null;

          return prisma.quarterlyAchievement.create({
            data: {
              goalId: goal.id,
              quarter: "Q1",
              actualValue,
              status: achievementStatus,
              computedScore: score,
              updatedById: user.id,
            },
          });
        })
      );

      // Add Q1 check-in for most approved sheets
      if (index % 3 !== 0) {
        await prisma.checkIn.create({
          data: {
            goalSheetId: sheet.id,
            quarter: "Q1",
            employeeNotes:
              CHECKIN_EMPLOYEE_NOTES[
                checkinNoteIdx++ % CHECKIN_EMPLOYEE_NOTES.length
              ],
            managerComment:
              CHECKIN_MANAGER_COMMENTS[
                checkinCommentIdx++ % CHECKIN_MANAGER_COMMENTS.length
              ],
            managerId: manager.id,
          },
        });
      }

      // Audit log for approval
      await prisma.auditLog.create({
        data: {
          userId: manager.id,
          action: "APPROVE_GOALS",
          entityType: "GoalSheet",
          entityId: sheet.id,
          previousValue: JSON.stringify({ status: "SUBMITTED" }),
          newValue: JSON.stringify({ status: "APPROVED" }),
        },
      });
    }

    // For RETURNED sheets: audit log
    if (status === "RETURNED") {
      await prisma.auditLog.create({
        data: {
          userId: manager.id,
          action: "RETURN_GOALS",
          entityType: "GoalSheet",
          entityId: sheet.id,
          previousValue: JSON.stringify({ status: "SUBMITTED" }),
          newValue: JSON.stringify({
            status: "RETURNED",
            returnComment,
          }),
        },
      });
    }

    // For SUBMITTED sheets: audit log
    if (status === "SUBMITTED") {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBMIT_GOALS",
          entityType: "GoalSheet",
          entityId: sheet.id,
          previousValue: JSON.stringify({ status: "DRAFT" }),
          newValue: JSON.stringify({ status: "SUBMITTED" }),
        },
      });
    }
  }

  // --- Notifications ---
  console.log("Creating notifications...");

  const notificationData: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string;
    isRead: boolean;
  }[] = [];

  for (const { user, status, index } of allEmployees) {
    const dept = EMPLOYEE_DATA[index].dept;
    const manager = managerMap[EMPLOYEE_DATA[index].managerKey];

    if (status === "APPROVED") {
      notificationData.push({
        userId: user.id,
        type: "GOAL_APPROVED",
        title: "Goals Approved",
        message: `Your goal sheet for FY 2025-26 has been approved by ${manager.name}.`,
        link: "/dashboard/employee/goals",
        isRead: index % 2 === 0,
      });
    }

    if (status === "SUBMITTED") {
      notificationData.push({
        userId: manager.id,
        type: "GOAL_SUBMITTED",
        title: "Goals Submitted for Review",
        message: `${user.name} has submitted goals for FY 2025-26.`,
        link: "/dashboard/manager/approve",
        isRead: false,
      });
    }

    if (status === "RETURNED") {
      notificationData.push({
        userId: user.id,
        type: "GOAL_RETURNED",
        title: "Goals Returned for Revision",
        message: `Your goal sheet for FY 2025-26 has been returned by ${manager.name}. Please review the comments and resubmit.`,
        link: "/dashboard/employee/goals",
        isRead: false,
      });
    }

    if (status === "DRAFT") {
      notificationData.push({
        userId: user.id,
        type: "REMINDER",
        title: "Goal Submission Reminder",
        message:
          "Please submit your goals for FY 2025-26. The deadline is approaching.",
        link: "/dashboard/employee/goals",
        isRead: false,
      });
    }
  }

  await Promise.all(
    notificationData.map((n) => prisma.notification.create({ data: n }))
  );

  // --- Escalation Rules ---
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

  // --- App Settings ---
  await prisma.appSettings.create({ data: { id: "app" } });

  // --- Summary ---
  const sheetCounts = {
    DRAFT: STATUS_ASSIGNMENTS.filter((s) => s === "DRAFT").length,
    SUBMITTED: STATUS_ASSIGNMENTS.filter((s) => s === "SUBMITTED").length,
    APPROVED: STATUS_ASSIGNMENTS.filter((s) => s === "APPROVED").length,
    RETURNED: STATUS_ASSIGNMENTS.filter((s) => s === "RETURNED").length,
  };

  console.log("\nSeed data created successfully!");
  console.log("================================");
  console.log(`Total employees: ${EMPLOYEE_DATA.length}`);
  console.log(`Total managers: 7`);
  console.log(`Total admin: 1`);
  console.log(
    `\nGoal sheet distribution:`
  );
  console.log(`  DRAFT:     ${sheetCounts.DRAFT}`);
  console.log(`  SUBMITTED: ${sheetCounts.SUBMITTED}`);
  console.log(`  APPROVED:  ${sheetCounts.APPROVED}`);
  console.log(`  RETURNED:  ${sheetCounts.RETURNED}`);
  console.log(
    `\nDepartments: ${[...new Set(EMPLOYEE_DATA.map((e) => e.dept))].join(", ")}`
  );
  console.log("\nLogin Credentials:");
  console.log("==================");
  console.log("Admin:    admin@atomburg.com / admin123");
  console.log("Managers: manager1@atomburg.com through manager7@atomburg.com / manager123");
  console.log("Employees: emp1@atomburg.com through emp50@atomburg.com / emp123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
