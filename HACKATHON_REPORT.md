# AtomBurg Nexus - Performance Goal Management Platform

## AtomQuest Hackathon 1.0 Submission Report

---

## 1. Executive Summary

**AtomBurg Nexus** is a full-featured, enterprise-grade Performance Goal Management Platform built for organizations to set, track, review, and report on employee goals across quarterly cycles. Inspired by Atlassian Jira's design language, it delivers a familiar and professional UX with role-based workflows for Employees, Managers, and Administrators.

Built entirely with modern, open-source technologies and designed for **zero infrastructure cost**, AtomBurg Nexus demonstrates that a production-quality HR tool can be deployed and operated at $0/month while delivering enterprise-level features including drag-and-drop Kanban boards, real-time notifications, dark mode, keyboard shortcuts, and Azure AD SSO integration.

---

## 2. Tech Stack & Architecture

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 16 (App Router) | Full-stack in single deployable unit; React Server Components for performance |
| **Frontend** | React 19, TypeScript (strict mode) | Latest stable React with full type safety |
| **Styling** | Tailwind CSS v4, shadcn/ui | Utility-first CSS with accessible component primitives |
| **Database** | SQLite via Prisma ORM | Zero-cost, zero-config, embedded database |
| **Authentication** | NextAuth.js v4 | Credentials + Azure AD SSO support |
| **Charts** | Recharts | Declarative charting for analytics dashboard |
| **Drag & Drop** | @hello-pangea/dnd | Accessible drag-and-drop for Kanban board |
| **Command Palette** | cmdk | Cmd+K global search and navigation |
| **Export** | xlsx | Excel/CSV report export |
| **Email** | Nodemailer | SMTP-based email notifications |
| **Teams** | Webhook API | Microsoft Teams adaptive card notifications |

### Architecture Diagram

```
+--------------------------------------------------+
|                   Next.js App                     |
|  +----------+  +------------+  +---------------+ |
|  | React 19 |  | API Routes |  | Server        | |
|  | Client   |  | (23 routes)|  | Components    | |
|  | Components|  |            |  |               | |
|  +-----+----+  +-----+------+  +-------+-------+ |
|        |              |                |          |
|        +--------------+----------------+          |
|                       |                           |
|              +--------+--------+                  |
|              | Prisma ORM      |                  |
|              | (11 models)     |                  |
|              +--------+--------+                  |
|                       |                           |
|              +--------+--------+                  |
|              | SQLite Database |                  |
|              +-----------------+                  |
+--------------------------------------------------+
```

---

## 3. Feature Matrix (BRD Compliance)

### Phase 1: Goal Creation & Approval

| Requirement | Status | Implementation |
|------------|--------|---------------|
| Goal Sheet creation with dynamic rows | Done | Employee goals page with add/remove goals |
| Thrust area selector | Done | Dropdown with configurable thrust areas |
| UoM type per goal (Min/Max/Timeline/Zero) | Done | 6 UoM types with dynamic input adaptation |
| Target input based on UoM | Done | Number, percentage, or date picker per type |
| Weightage validation (total=100%, min 10%, max 8 goals) | Done | Real-time client-side + server-side validation |
| Submit to manager | Done | Status transition DRAFT → SUBMITTED |
| Manager review with inline edit | Done | Approve/Return with comments |
| Shared goals (read-only push) | Done | Admin creates, pushes to employees |
| Goal cycle management | Done | Admin configures open/close windows |
| Goal unlock capability | Done | Admin can unlock approved sheets |

### Phase 2: Achievement Tracking & Check-ins

| Requirement | Status | Implementation |
|------------|--------|---------------|
| Quarterly achievement input | Done | Per-goal actual value entry |
| Auto-computed progress score | Done | MIN, MAX, TIMELINE, ZERO formulas |
| Status tracking (Not Started/On Track/Completed) | Done | Per-goal status selection |
| Manager check-in with comments | Done | Structured check-in form |
| Check-in history log | Done | Chronological check-in records |

### Reporting & Governance

| Requirement | Status | Implementation |
|------------|--------|---------------|
| Achievement report with filters | Done | Department, cycle, employee filters |
| Export to Excel/CSV | Done | XLSX library export |
| Completion dashboard | Done | Real-time completion rates |
| Audit trail | Done | Searchable audit log with who/what/when |

---

## 4. All Pages (17 Total)

### Authentication
| # | Page | Path | Description |
|---|------|------|-------------|
| 1 | Login | `/login` | Credential-based login with Azure AD SSO option |

### Employee Views
| # | Page | Path | Description |
|---|------|------|-------------|
| 2 | Dashboard | `/dashboard` | Role-specific overview with stats and quick actions |
| 3 | Board | `/dashboard/board` | Kanban board with drag-and-drop goal sheets |
| 4 | My Goals | `/dashboard/employee/goals` | Create, edit, submit goal sheets |
| 5 | Check-ins | `/dashboard/employee/checkins` | Quarterly achievement updates |

### Manager Views
| # | Page | Path | Description |
|---|------|------|-------------|
| 6 | My Team | `/dashboard/manager/team` | Team member overview with goal sheet status |
| 7 | Approve Goals | `/dashboard/manager/approve` | Review, approve, or return goal sheets |
| 8 | Team Check-ins | `/dashboard/manager/checkins` | Conduct and review team check-ins |

### Admin Views
| # | Page | Path | Description |
|---|------|------|-------------|
| 9 | Employees | `/dashboard/admin/employees` | Organization hierarchy management |
| 10 | Cycles | `/dashboard/admin/cycles` | Goal cycle configuration with date windows |
| 11 | Shared Goals | `/dashboard/admin/shared-goals` | Create and push shared goals |
| 12 | Reports | `/dashboard/admin/reports` | Achievement reports with export capability |
| 13 | Analytics | `/dashboard/admin/analytics` | Visual charts: trends, distribution, department performance |
| 14 | Escalations | `/dashboard/admin/escalations` | Escalation rules and triggered escalation log |
| 15 | Audit Log | `/dashboard/admin/audit-log` | Complete audit trail of all system changes |
| 16 | Settings | `/dashboard/admin/settings` | SMTP, Teams webhook, Azure AD configuration |

### Shared Views
| # | Page | Path | Description |
|---|------|------|-------------|
| 17 | Root | `/` | Auto-redirect to dashboard or login |

---

## 5. Bonus Features (8 Enterprise Features)

### 5.1 Kanban Board with Drag & Drop
- **Jira-style board** with four columns: Draft, Submitted, Approved, Returned
- **Drag-and-drop** goal sheets between columns to update status
- **Cycle filter** to view boards for different goal cycles
- **Click-to-open** detail panel from any card
- Built with `@hello-pangea/dnd` for accessible, performant DnD

### 5.2 Command Palette (Cmd+K)
- **Global search** across employees, goals, and cycles
- **Quick navigation** to any page via keyboard
- **Quick actions** like toggling dark mode
- **Debounced API search** with results from `/api/search`
- Built with `cmdk` library

### 5.3 Dark Mode
- **Three modes**: Light, Dark, System (auto-detect)
- **No flash of unstyled content** — inline script sets theme before hydration
- **Full coverage** across all 17 pages and components
- **CSS custom properties** with oklch color space for precise dark palette
- Theme persists in localStorage across sessions

### 5.4 Keyboard Shortcuts
- `?` — Show keyboard shortcuts reference
- `Cmd+K` / `Ctrl+K` — Open command palette
- `d` — Go to dashboard
- `b` — Go to board
- `j/k` — Navigate list items
- `Enter` — Open selected item
- `Esc` — Close panels and dialogs

### 5.5 Activity Timeline
- **Chronological feed** of all actions on a goal sheet
- **Action-specific icons** and color coding (create, update, approve, return, comment)
- **Relative timestamps** with full date on hover
- **User attribution** for every action
- Powered by existing AuditLog model — zero schema changes

### 5.6 Real-time Notifications
- **Bell icon** with unread count badge in header
- **Dropdown panel** with notification list, mark-as-read
- **Auto-refresh** every 30 seconds
- **Click-to-navigate** with deep links to relevant pages
- **Mark all as read** bulk action

### 5.7 Goal Detail Side Panel
- **Slide-in panel** from right side (Jira issue detail style)
- **Three tabs**: Goals (accordion list), Check-ins (history), Activity (timeline)
- **Comment section** for threaded discussions
- **Full goal details**: UoM type, target, weightage, quarterly scores
- Accessible from board cards, team page, and reports

### 5.8 Comments System
- **Threaded comments** on goal sheets
- **User avatars** with timestamps
- **Ctrl+Enter** to submit
- **Stored in AuditLog** — no schema changes needed
- Appears in both Comments section and Activity Timeline

---

## 6. Additional Bonus Features

### 6.1 Analytics Dashboard
- **Quarterly Score Trend** — Line chart showing QoQ performance
- **Completion Distribution** — Donut chart by performance ranges (Excellent/Good/Average/Below/Poor)
- **Department Performance** — Horizontal bar chart comparing departments
- **Thrust Area Analysis** — Top 10 thrust areas by average score
- **Top Performers** — Ranked list with progress bars
- Built with Recharts

### 6.2 Escalation Engine
- **Configurable rules**: Goal not submitted, not approved, check-in overdue
- **Multi-level escalation chain**: Employee → Manager → Skip-level/HR
- **Automated triggers** with configurable day thresholds
- **Escalation log** visible to Admin with resolution tracking

### 6.3 Email Notifications (Nodemailer)
- Goal submitted, approved, returned notifications
- Check-in reminders
- Escalation alerts
- Configurable SMTP settings in Admin panel
- Test email functionality

### 6.4 Microsoft Teams Integration
- Incoming webhook notifications
- Adaptive card format for rich notifications
- Deep-link back to AtomBurg Nexus pages
- Configurable webhook URL in Admin panel

### 6.5 Azure AD SSO
- Microsoft Entra ID integration via NextAuth.js
- Auto-user creation on first SSO login
- Configurable tenant/client in Admin settings
- Fallback to credential login when Azure AD not configured

### 6.6 Excel Export
- Full achievement report export to `.xlsx`
- Includes all goals, scores, quarterly data
- Filterable by department, cycle, employee before export

### 6.7 Sortable Table Columns
- **Click-to-sort** on any column header across all table pages
- **Tri-state sorting**: ascending, descending, and default order
- **Visual indicators**: Arrow icons showing current sort direction
- **Sticky table headers**: Headers stay visible while scrolling large datasets
- Applied to Reports, Employees, Team, Escalations, and Audit Log pages

### 6.8 Board Quick Filters
- **Department filter chips** above Kanban columns
- **Assignee quick filters** for fast team member isolation
- **Visual feedback**: Active filters highlighted in blue
- **Clear all** link to reset filters instantly

### 6.9 Status Workflow Visualization
- **Visual step indicator**: DRAFT → SUBMITTED → APPROVED workflow
- **Progress tracking**: Completed steps shown with checkmarks
- **Current step highlight**: Active step with pulse animation
- **Return branch**: Visual indicator for RETURNED status
- Displayed in Goal Detail Panel and goal sheet editor

### 6.10 Cycle Progress Timeline
- **Timeline bar** showing all cycle phases (Goal Setting, Q1-Q4)
- **Current position marker** indicating where we are in the cycle
- **Color coding**: Past (blue), Current (active blue), Future (gray)
- Displayed on Dashboard and Board pages

### 6.11 Quick Create Floating Action Button
- **Role-adaptive FAB** in bottom-right corner
- **Context-aware actions**: Different options per role (Employee/Manager/Admin)
- **Smooth animation**: Scale-in on mount
- One-click access to most common actions

### 6.12 NProgress Loading Bar
- **Thin animated bar** at top of viewport during navigation
- **GitHub/Jira-style** loading indicator
- **Automatic detection** of route changes
- Professional perceived-performance improvement

### 6.13 Bulk Actions
- **Checkbox selection** on Manager Approve page
- **Select all** for batch operations
- **Floating action bar**: Approve/Return multiple goal sheets at once
- **Toast confirmations** for all bulk operations

### 6.14 Enhanced Avatars & Hover Cards
- **Tooltip-enabled avatars** showing name, department, role on hover
- **Hover preview cards** on employee names for quick context
- Zero-click information discovery

---

## 7. Cost Analysis

| Component | Provider | Cost |
|-----------|----------|------|
| **Application Hosting** | Vercel Free Tier / Local | $0/month |
| **Database** | SQLite (embedded) | $0/month |
| **Authentication** | NextAuth.js (self-hosted) | $0/month |
| **Email** | Existing SMTP / Gmail | $0/month |
| **Teams Integration** | Incoming Webhook (free) | $0/month |
| **Azure AD SSO** | Azure free tier | $0/month |
| **Domain** | Optional | $0-12/year |
| **SSL Certificate** | Included with Vercel | $0/month |
| **CDN** | Included with Vercel | $0/month |
| **Total Monthly Cost** | | **$0/month** |

### Why SQLite?
- **Zero infrastructure**: No database server to provision, configure, or maintain
- **Zero cost**: Embedded in the application, no separate hosting
- **Performance**: Faster than network-round-trip to external DB for read-heavy workloads
- **Portability**: Single file, easy backup, easy migration
- **Sufficient scale**: Handles thousands of concurrent users for enterprise HR use cases

---

## 8. Security & Authentication

### Authentication
- **NextAuth.js v4** with server-side session validation
- **Credential provider**: bcryptjs password hashing (cost factor 10)
- **Azure AD provider**: Microsoft Entra ID SSO with PKCE flow
- **Session management**: JWT-based with secure httpOnly cookies

### Authorization
- **Role-based access control**: Three roles (Admin, Manager, Employee)
- **API-level guards**: Every API route validates session and role
- **Resource-level checks**: Users can only access their own data (or team data for managers)
- **Admin override**: Admins can access all resources

### Audit & Compliance
- **Complete audit trail**: Every create, update, delete, approve, return action logged
- **Immutable logs**: AuditLog entries include userId, action, entityType, entityId, previousValue, newValue, timestamp
- **Searchable**: Admin audit log page with text search and filtering
- **Non-repudiation**: Every action tied to authenticated user

### Data Protection
- **Server-side rendering**: Sensitive data never exposed in client bundles
- **Input validation**: Both client-side and server-side validation
- **SQL injection prevention**: Prisma ORM with parameterized queries
- **XSS prevention**: React's built-in JSX escaping + Next.js security headers

---

## 9. API Reference (23 Endpoints)

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth.js authentication handler |

### Goal Sheets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goal-sheets` | List goal sheets (filtered by role) |
| POST | `/api/goal-sheets` | Create new goal sheet |
| GET | `/api/goal-sheets/[id]` | Get goal sheet with goals and check-ins |
| PUT | `/api/goal-sheets/[id]` | Update goals in a sheet |
| DELETE | `/api/goal-sheets/[id]` | Delete a draft sheet |
| POST | `/api/goal-sheets/[id]/submit` | Submit sheet to manager |
| POST | `/api/goal-sheets/[id]/approve` | Approve a submitted sheet |
| POST | `/api/goal-sheets/[id]/return` | Return sheet for rework |
| PATCH | `/api/goal-sheets/[id]/status` | Update sheet status (admin/manager) |
| GET | `/api/goal-sheets/[id]/activity` | Get activity timeline |
| GET/POST | `/api/goal-sheets/[id]/comments` | Get/add comments |

### Goals & Achievements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/goals` | List/create goals |
| GET/POST | `/api/achievements` | List/update quarterly achievements |

### Check-ins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/checkins` | List/create check-ins |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/cycles` | Manage goal cycles |
| GET/POST | `/api/admin/users` | Manage users |
| GET/POST | `/api/admin/shared-goals` | Manage shared goals |
| GET/POST | `/api/admin/settings` | App settings (SMTP, Teams, Azure AD) |
| POST | `/api/admin/settings/test-smtp` | Send test email |

### Reports & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | Achievement reports with filters |
| GET | `/api/reports/export` | Export report to Excel |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-log` | Searchable audit log |
| GET/POST | `/api/escalations` | Escalation rules and checks |
| GET/PATCH | `/api/notifications` | User notifications |
| GET | `/api/search` | Global search across entities |

---

## 10. Database Schema (11 Models)

```
User ──────────── GoalSheet ──────── Goal ──────── QuarterlyAchievement
  │ (managerId)       │                  │
  │                   │                  └── SharedGoals (self-relation)
  │                   │
  │                   ├── CheckIn
  │                   │
  │                   └── (linked via AuditLog for activity/comments)
  │
  ├── AuditLog
  ├── Notification
  ├── Escalation ──── EscalationRule
  │
  └── GoalCycle ──── GoalSheet
                     Escalation

AppSettings (singleton)
```

---

## 11. UI/UX Design

### Design Language
- **Atlassian Jira-inspired** — familiar enterprise UI patterns
- **Blue color scheme** (#0052CC primary) matching Atlassian brand
- **Compact layout** — 13px body text, 48px header, 224px sidebar
- **Dark mode** — full theme support with system preference detection
- **Responsive** — mobile sidebar, adaptive grid layouts

### Key UI Patterns
- **Kanban Board** — drag-and-drop with colored status columns
- **Side Panel** — slide-in detail view (Jira issue panel)
- **Command Palette** — Cmd+K global search and navigation
- **Breadcrumbs** — hierarchical navigation with `/` separators
- **Status Badges** — color-coded lozenge-style badges
- **Toast Notifications** — sonner-based feedback system
- **Loading Skeletons** — shimmer placeholders during data fetch
- **Empty States** — helpful messaging when no data

### Shared Component Library
- `StatusBadge` — unified status coloring across all entities
- `PageHeader` — breadcrumbs + title + actions pattern
- `StatCard` — metric cards with icons
- `UserAvatar` — initials-based avatar with size variants
- `FilterBar` + `FilterSelect` — search and filter controls
- `EmptyState` — centered call-to-action
- `LoadingSkeleton` — table, card, and page skeleton presets

---

## 12. Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@atomburg.com | admin123 |
| **Manager 1** | manager1@atomburg.com | manager123 |
| **Manager 2** | manager2@atomburg.com | manager123 |
| **Employee 1** | emp1@atomburg.com | emp123 |
| **Employee 2** | emp2@atomburg.com | emp123 |
| **Employee 3** | emp3@atomburg.com | emp123 |

### Quick Start
```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push
npx prisma db seed

# Start development server
npm run dev

# Open in browser
open http://localhost:3000
```

---

## 13. Project Statistics

| Metric | Value |
|--------|-------|
| **Total Pages** | 17 |
| **API Endpoints** | 23 |
| **Prisma Models** | 11 |
| **React Components** | 40+ |
| **Shared UI Components** | 7 |
| **Enterprise Features** | 16 (Kanban Board, Command Palette, Dark Mode, Keyboard Shortcuts, Activity Timeline, Notifications, Comments, Detail Panel, Sortable Tables, Board Quick Filters, Workflow Visualization, Cycle Progress, Quick Create FAB, Loading Bar, Bulk Actions, Hover Cards) |
| **Bonus Features** | 6 (Analytics, Escalation Engine, Email, Teams, Azure AD SSO, Excel Export) |
| **Monthly Cost** | $0 |
| **Lines of Code** | ~8,000+ |
| **TypeScript Coverage** | 100% (strict mode) |

---

*Built for AtomQuest Hackathon 1.0 by Team AtomBurg*
