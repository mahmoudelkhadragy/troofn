# 01 — Project overview

## What is Troofn Business Gate?

Troofn is a marketing agency. **Business Gate** is its client and operations platform:

- **Clients** follow their contracts, SOW progress, strategic plan, reports, invoices, meetings and requests.
- **Troofn staff** manage clients, projects, production files, ad leads, tasks, and their own HR self-service (salary, attendance, leave, evaluation).
- **Troofn management** runs everything from the **dashboard**.

## The three products

| Product                       | Users                                                 | Repo                        |
| ----------------------------- | ----------------------------------------------------- | --------------------------- |
| **REST API** (NestJS)         | Used by both clients below                            | this repo, `apps/api`       |
| **Admin dashboard** (Angular) | Troofn admins and managers: full CRUD over the system | this repo, `apps/dashboard` |
| **Mobile app** (Flutter)      | All 6 roles. One app whose UI adapts to the role      | separate repo               |

## Roles (summary)

| Role                     | Side   | Sees                                                                 |
| ------------------------ | ------ | -------------------------------------------------------------------- |
| Client                   | Client | Everything about their own company                                   |
| Client Marketing Officer | Client | SOW, campaigns, reports, marketing requests (no finance)             |
| Client Accountant        | Client | Contracts (value only), invoices, payments, payment card             |
| Troofn Marketing Manager | Troofn | Assigned clients: projects, tasks, leads, TAPA                       |
| Content Writer           | Troofn | Assigned projects: content tasks, production files, TAPA (read-only) |
| Regular Employee         | Troofn | Own tasks and self-service HR                                        |
| **Admin** _(dashboard)_  | Troofn | The whole system                                                     |

Full matrix in [03-roles-and-permissions.md](03-roles-and-permissions.md).

## Functional modules

1. **Identity & access**: auth, users, roles
2. **Central management**: clients, contracts, SOW and milestones, strategic plan (7 axes), T-360 index, competitors, reports
3. **Finance**: invoices, payments with receipts, payment cards (gateway token only)
4. **HR**: employees, payroll, attendance, leave requests, evaluations
5. **Marketing & production**: ad leads, projects, members, tasks, production files (7 SC), TAPA audience analysis
6. **Communication**: meetings, requests, project team chat, notifications (FCM)

## Out of scope (for now)

- The Flutter app code (separate repo)
- Real-time chat. Polling is the default, and Socket.io is optional pending client approval.
- Automatic lead webhooks (Meta/Google/TikTok). This is pending a client decision; manual entry is the default.

## Open business decisions

See [06-roadmap.md § Decisions](06-roadmap.md#decisions-required-before-starting).
