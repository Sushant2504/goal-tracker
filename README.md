# AtomBurg Nexus

Performance Goal Management System built for the AtomQuest Hackathon 1.0.

## Getting Started

### Install dependencies

```bash
npm install
```

### Seed the database

```bash
npx tsx prisma/seed.ts
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Login Credentials

### Admin

| Email | Password |
|---|---|
| admin@atomburg.com | admin123 |

### Managers

| Email | Password | Department |
|---|---|---|
| manager1@atomburg.com | manager123 | Engineering |
| manager2@atomburg.com | manager123 | Operations |
| manager3@atomburg.com | manager123 | Sales |
| manager4@atomburg.com | manager123 | Marketing |
| manager5@atomburg.com | manager123 | Finance |
| manager6@atomburg.com | manager123 | Product |
| manager7@atomburg.com | manager123 | Design |

### Employees

| Email | Password |
|---|---|
| emp1@atomburg.com through emp50@atomburg.com | emp123 |

50 employees across 7 departments with a mix of goal sheet statuses: DRAFT (10), SUBMITTED (14), APPROVED (17), RETURNED (9).

## Tech Stack

- Next.js (App Router)
- Prisma + SQLite
- NextAuth.js
- Tailwind CSS + shadcn/ui
- Recharts
- TypeScript
