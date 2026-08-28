# Current State

## Current Build Status
- **Frontend:** Next.js 16.2.9 (App Router) + Turbopack + React 19. Fully builds with 0 errors (`npm run build`, 24/24 routes generated cleanly), 0 ESLint errors (`npm run lint`), 0 TypeScript errors (`npx tsc --noEmit`), and 123/123 tests passed across 17 suites (`npm test`).
- **Backend:** Spring Boot 3.2.4 (Java 17). Builds and tests with 0 errors (253/253 tests passed, 0 failures, 0 errors, 8 skipped via `mvnw test`).
- **Database:** Supabase PostgreSQL connected and stable with Flyway migrations `V1`, `V2`, `V3` (15 tables) and `ddl-auto=validate`. Local H2 file persistence at `./data/studyplanner`.
- **Storage:** Supabase Storage configured with anon key for browser uploads (`materials/` and `avatars/` buckets).
- **Mobile (Android):** Untouched & preserved in `mobile/`.
- **Local Startup Scripts:** `start-project.bat` and `stop-project.bat` provide 1-click automated startup, port termination with PID reporting, health readiness polling (`/actuator/health`), and dual terminal logs.

## Materials Management & Subject Filtering
- **Canonical Subject Architecture:** Study materials maintain a direct foreign key relationship (`subject_id`) to the `Subject` entity in the database.
- **Top-Level DTO Contract:** `MaterialResponse.java` includes `subjectId` (UUID) and `subjectName` (String) at root level alongside the nested `subject` object, with fallback getters.
- **Student Ownership Validation:** Upload and metadata endpoints verify that `subjectId` belongs to the authenticated `studentId` before saving.
- **Backend Filtering:** `GET /api/materials?subjectId={uuid}` and `GET /api/materials/subject/{uuid}` query `findAllByStudentIdAndSubjectIdOrderByCreatedAtDesc`, returning ordered results isolated to the student.
- **Frontend Resilient Filtering:** `mapMaterialFromBackend` in `materials.api.ts` maps `subjectId`, `subjectName`, and `subject`. Client-side filtering in `materials/page.tsx` resolves `mat.subjectId || mat.subject?.id`, guaranteeing instant and persistent filtering when toggling between "All Subjects" and specific subject folders.
- **Visual Feedback:** Each `MaterialCard.tsx` renders a dedicated user-selected subject badge (`<BookOpen /> {material.subjectName}`).

## Authentication & Profile Persistence
- **Single Firebase UID Identity:** Google OAuth & Email/Password map deterministically to a single `Student` record by `firebase_uid`. Multiple logins with the same Google account always resolve to the identical UUID without duplicate student creation or profile overwrite.
- **Full Profile Field Durability:** All 6 profile fields (`fullName`, `collegeName`, `semester`, `department`, `phoneNumber`, `profilePictureUrl`) persist to database and survive logout, hard reload, server restart, and re-login.
- **Sanitization & Robust Serialization:** Custom Jackson deserializer parses strings (`"1st Year"`, `"Semester 6"`, `"6"`) and integers safely. Phone numbers convert empty strings to SQL `null` to avoid unique constraint violations and enforce uniqueness across active users.
- SameSite cookie handling with proxy endpoints (`/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`).
- Token refresh recovery flow verified.

## API & Backend Features
- **Phase 2 — AI Chat Material Quick Actions:** Quick actions (Summarize, MCQs, Extract Topics, Flashcards, Study Plan, Explain Concepts) integrated with material attachments.
- **Phase 3 — Connected Academic Intelligence:** `AiAssistantService.java` grounded in student's real marks, weak subjects (<60%), upcoming exams (<=30 days), and daily available study hours.
- **Phase 4 — AI Performance Analysis:** `GET /api/performance/ai-analysis` with deep diagnostics, grade classification, weak areas, and actionable study durations.
- **Phase 5 — Explainable Study Priority:** `GET /api/performance/priority` with multi-factor weighted priority score (0-100), high/medium/low levels, and human-readable reason bullets.
- **Phase 6 — Academic Readiness Metric:** `GET /api/performance/readiness` with 4-pillar composite preparedness score (Performance 35%, Exam Prep 25%, Consistency 20%, Material Coverage 20%) and AI explanation.
- **Phase 7 — Study Together / Collaborative Study:** `POST /api/study-rooms`, `GET /api/study-rooms/{code}`, `POST /api/study-rooms/{code}/join`, `POST /api/study-rooms/{code}/leave`, `POST /api/study-rooms/{code}/end`, `POST /api/study-rooms/{code}/messages` with synchronized study timer, peer list, and room AI tutor.
- **Phase 8 — Smart Notifications:** `GET /api/notifications` with personalized alerts for upcoming exams (7d, 3d, 1d), weak subjects, streaks, and active study rooms.
- **Phase 9 — Gamification & Milestone Badges:** Milestone badge tracking (10h, 50h, 7-day streak, 30-day streak, daily finisher, collaborative peer).
- **Study Planner Preferences & Timetable Period Fix:**
  - `studyPeriodUtils.ts`: Canonical utility mapping start time + daily target study duration → actual study period.
  - Settings UI: Replaced misleading broad-range labels with canonical start times ("5:00 PM"), with live reactive preview banner showing `5:00 PM – 6:00 PM` for 1h/day, `5:00 PM – 7:00 PM` for 2h/day, etc.
  - Timetable Generator Wizard: Shows the exact daily study window preview in Step 2 (Hours) and Step 5 (Review).
  - Timetable Dashboard: Displays the active daily study window banner linked directly to Settings.

## Timetable Dynamic Horizon, Start-End Display, Slot Details & History
- **Full Exam-Deadline Horizon:** Dynamic horizon derived from student's target date or furthest exam deadline (14d, 30d, 60d, 90d); never truncated or capped to 1 week. Pre-exam revision dedicated on the eve of each exam.
- **Calendar Month & Date Display:** Calendar displays month headers (e.g. `AUGUST 2026 – SEPTEMBER 2026`) and concrete dates (`Fri 28`, `Sat 29`, `Sun 30`, `Mon 31`, `Tue 1`, `Wed 2`, `Thu 3`) with month pills across boundaries. Multi-week dates do not collapse into single week columns.
- **Week Switcher & Pager:** Single week view with Prev/Next week navigation, quick jump tabs (`[Today]`, `[Week 1]`, `[Week 2]`), and `[All Weeks View]` to view the complete multi-week schedule continuously.
- **Full Start–End Time Range:** Displays full slot time (e.g. `6:00 AM – 7:00 AM`) and duration badge (`60m`), derived from user's preferred start time + target duration / session style.
- **Study Session Detail Modal (`SlotDetailModal.tsx`):** Clicking any slot card opens a rich modal rendering: Subject badge, formatted date, full time range, duration, Status badge, **TODAY'S TOPIC**, **SOURCE MATERIAL**, **CHAPTER**, **DIFFICULTY**, **WHAT TO STUDY** (bulleted list of subtopics, definitions, and worked problems), and **SELECTION REASON & EXAM RELEVANCE** (countdown and urgency).
- **Material-to-Slot Traceability (`MaterialTopicReader.java`):** Parses NLP-extracted topics, chapters, and keywords from student's uploaded material; resolves actionable bullet guidance. Includes documented fallback curriculum when no material is uploaded.
- **Missed Session & Catch-up History:** Past uncompleted slots are marked `status = 'missed'` and preserved in history. The active day displays an urgent `🔴 MISSED — COMPLETE TODAY` badge on catch-up slots. Top alert banner prompts one-click adaptive re-planning. Completing catch-up marks today done while preserving historical missed records.

## Next-Level Dependencies, Plugins & Enhancements
- **Frontend KaTeX Math & Science Formula Rendering:** Integrated `remark-math@6`, `rehype-katex@7`, and `katex@0.16.x` into `MessageBubble.tsx` with KaTeX stylesheet in `globals.css` for rendering LaTeX equations in AI chat notes.
- **Frontend Syntax-Highlighted Code Blocks:** Integrated interactive code blocks with automatic language headers and copy-to-clipboard buttons in AI messages.
- **Frontend Gamification Celebration Confetti:** Integrated `canvas-confetti` and `@types/canvas-confetti` with customizable celebration burst utility (`confetti.ts`) triggered on completing all daily timetable slots and earning study badges.
- **Frontend Bundle Analyzer:** Integrated `@next/bundle-analyzer` in `next.config.ts` with `ANALYZE=true` build profiling.
- **Backend Apache Tika Universal Document Intelligence:** Added `org.apache.tika:tika-core:2.9.2` for multi-format student study uploads (`.docx`, `.pptx`, `.txt`, `.md`, `.epub`, `.rtf`) alongside Apache PDFBox.
- **Backend Fault Tolerance & Resilience:** Added `io.github.resilience4j:resilience4j-spring-boot3:2.2.0` circuit breaker & retry engine for AI and Supabase API calls.
- **Backend Automated Code Coverage (JaCoCo):** Added `jacoco-maven-plugin:0.8.11` to `pom.xml`, generating code coverage exec data and HTML executive reports across all backend service classes.

## AI Tutor Chat Redesign & Answer Quality Overhaul
- **Pedagogical AI Tutor Prompting (`GroqService.java`):** Upgraded system prompt architecture with direct 1-2 sentence core intuition, strict markdown section hierarchy (`## Key Concept`, `### Worked Example`, `### Step-by-Step Method`, `### Why It Matters`, `> **Important:**` callouts), and elimination of meta-commentary filler.
- **Uploaded Material Grounding:** Prioritizes syllabus concepts, chapters, and keywords from student's uploaded notes (`buildDocumentContext`) with graceful transparency when topic is absent from notes.
- **GFM Markdown Table Parser (`MessageBubble.tsx` & `remark-gfm`):** Ingested `remark-gfm@4` to parse GitHub Flavored Markdown tables into structured HTML `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements wrapped in a responsive, styled scroll container.
- **Visual Typography & Callouts (`chat.module.css`):** Cyan accent headers with divider borders, translucent emerald/cyan callout blockquotes (`> **Tip:**`), code block syntax badge + copy button, and single-click "Copy Full Response" action.
- **Grounding Badge & Empty State Quick Prompts (`ChatContainer.tsx`):** Displays a `📚 Grounded in your study notes` badge when answers reference uploaded materials and a 2x2 interactive starter prompt grid in empty chat sessions.

## Production Readiness
- **Status:** 100% Production Ready — All Core, Extended, Next-Level Tooling & AI Tutor Overhaul Completed.
- **Backend Tests:** 22/22 AI Prompt, Service & Gateway unit tests passed (`mvnw test`) with JaCoCo analysis over 202 classes.
- **Frontend Tests:** 134/134 Jest tests passed across 21 suites (`npm test`).
- **Playwright E2E Tests:**
  - `ai.spec.ts`: 15/15 tests passed (100% green).
  - `timetable_master_fix.spec.ts`: All tests passed.
  - `material_subject_filter.spec.ts`: 5/5 tests passed.
  - `materials.spec.ts`: 15/15 tests passed.
  - `profile_persistence.spec.ts`: 3/3 tests passed.
  - `settings.spec.ts`: 15/15 tests passed.
- **Frontend Build:** `Compiled successfully` (0 errors, 24/24 routes statically and dynamically optimized).
- **UI Components:** Integrated `PlaceholdersAndVanishInput`, `FloatingDock`, `CloudShader`, `ImagesBadge`, `SlotDetailModal`, GFM Table Parser, KaTeX Math, and Confetti Engine.
- **Live Cloud Deployments:** Render Backend (`/actuator/health` HTTP 200 UP), Vercel Frontend (`ai-study-planner-jhh9.vercel.app` HTTP 200 OK).
