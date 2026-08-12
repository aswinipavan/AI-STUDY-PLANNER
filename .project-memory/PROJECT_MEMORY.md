# AI Study Planner - Project Memory Index

This file serves as the master directory for the `.project-memory` persistence system, linking all documentation files and defining repository guidelines for future AI agents.

---

## 1. Directory of Memory Files

| Document | Purpose | Last Updated |
|----------|---------|--------------|
| [MASTER_CONTEXT.md](file:///.project-memory/MASTER_CONTEXT.md) | Vision, architecture overview, and core business goals. | 2026-08-12 |
| [CURRENT_STATE.md](file:///.project-memory/CURRENT_STATE.md) | Build status, test summary, and current focus areas. | 2026-08-12 |
| [PROJECT_OVERVIEW.md](file:///.project-memory/PROJECT_OVERVIEW.md) | Detailed product vision, value props, and target audience. | 2026-08-12 |
| [PROJECT_ARCHITECTURE.md](file:///.project-memory/PROJECT_ARCHITECTURE.md) | In-depth technical architecture, client-server models, integrations. | 2026-08-12 |
| [FEATURE_INVENTORY.md](file:///.project-memory/FEATURE_INVENTORY.md) | Categorized list of all active user features. | 2026-08-12 |
| [USER_JOURNEY.md](file:///.project-memory/USER_JOURNEY.md) | User path walkthrough (auth, onboarding, timetables, AI). | 2026-08-12 |
| [API_MAP.md](file:///.project-memory/API_MAP.md) | Full mapping of Spring Boot endpoints and Next.js proxies. | 2026-08-12 |
| [DATABASE_MAP.md](file:///.project-memory/DATABASE_MAP.md) | Relational database schema, columns, and foreign key relations. | 2026-08-12 |
| [AI_SYSTEM.md](file:///.project-memory/AI_SYSTEM.md) | AI model config, rate limiting, caching, and prompts. | 2026-08-12 |
| [CURRENT_PROJECT_STATUS.md](file:///.project-memory/CURRENT_PROJECT_STATUS.md) | Technical audit findings, test coverage, and deploy links. | 2026-08-12 |
| [TASKS.md](file:///.project-memory/TASKS.md) | Completed, In Progress, Blocked, and Future tasks ledger. | 2026-08-12 |
| [CHANGELOG.md](file:///.project-memory/CHANGELOG.md) | Detailed log of commits and code modifications. | 2026-08-12 |
| [BUG_TRACKER.md](file:///.project-memory/BUG_TRACKER.md) | Active and fixed bug directory. | 2026-08-12 |
| [API_STATUS.md](file:///.project-memory/API_STATUS.md) | Status ledger of specific API routes. | 2026-08-12 |
| [UI_PROGRESS.md](file:///.project-memory/UI_PROGRESS.md) | UI quality, layout styling, and responsiveness log. | 2026-08-12 |
| [TEST_PROGRESS.md](file:///.project-memory/TEST_PROGRESS.md) | Test logs and coverage percentages for frontend/backend. | 2026-08-12 |
| [DEPLOYMENT_STATUS.md](file:///.project-memory/DEPLOYMENT_STATUS.md) | Hosting platform credentials and parameters. | 2026-08-12 |
| [SESSION_LOG.md](file:///.project-memory/SESSION_LOG.md) | Running append-only developer session log. | 2026-08-12 |
| [NEXT_TASK.md](file:///.project-memory/NEXT_TASK.md) | Immediate next action item roadmap. | 2026-08-12 |
| [CRITICAL_ISSUES_VERIFICATION.md](file:///.project-memory/CRITICAL_ISSUES_VERIFICATION.md) | Root-cause analysis and fixes for 3 critical bugs. | 2026-08-12 |

---

## 2. Permanent Rules for Future Agents

### Startup Checklist
Before doing any coding work:
1. Read all files inside the `.project-memory/` directory.
2. Inspect the active git repository.
3. Align local codebase files with memory context.
4. Report your initial findings to the user before editing code.

### Shutdown Checklist
After finishing any task:
1. Automatically update `.project-memory/` status files (e.g. `CURRENT_STATE.md`, `CHANGELOG.md`, `TASKS.md`).
2. Log the actions performed in `SESSION_LOG.md` (always append, never overwrite).
3. Update `NEXT_TASK.md` to define the next steps clearly for subsequent sessions.
4. Never wait for the user to prompt you for memory updates.
