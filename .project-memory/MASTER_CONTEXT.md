# AI Study Planner - Master Context

## Project Vision
To provide an intelligent, AI-driven study planner that helps students manage their schedules, track performance, and receive personalized learning recommendations.

## Project Goals
- Automate study scheduling based on user availability and goals.
- Track academic performance and provide actionable insights.
- Generate AI-powered motivational tips and study recommendations.
- Provide a responsive and intuitive user interface.

## Architecture
- **Frontend:** Next.js 16.2.9 (App Router) + React 19 + Tailwind CSS + Zustand + React Query.
- **Backend:** Spring Boot 3.2.4 (Java 17).
- **Database:** Supabase PostgreSQL (Production) / Durable File H2 (Local Development).

## Technologies
- Java 17, Spring Boot 3.2.4
- Next.js 16.2.9 (App Router, Turbopack)
- Hibernate 6 / Spring Data JPA / Flyway Migrations
- Supabase (PostgreSQL, Storage, Pooler)
- Firebase Authentication (Google OAuth & Email/Password)
- Groq AI API (`openai/gpt-oss-20b` & `llama-3.3-70b-versatile`)
- Razorpay

## Folder Structure
- `/backend`: Spring Boot application.
- `/frontend`: Next.js 16 web application.
- `/.project-memory`: Persistent agent memory and context files.

## Business Logic
- Users authenticate via Firebase; backend maps each `firebase_uid` to a single deterministic `Student` record with 0 duplication on relogin.
- Full student profile persistence (`fullName`, `collegeName`, `semester`, `department`, `phoneNumber`, `profilePictureUrl`) with phone sanitization and flexible semester string parsing.
- Subscriptions managed via Razorpay.
- Timetable scheduling is dynamically generated across the full exam deadline horizon (14d, 30d, 60d, 90d), displaying full start–end time ranges (e.g. 6:00 AM – 7:00 AM) based on student preferred study time and daily duration.
- Study slots are enriched with NLP-extracted material topics, chapters, "what to study" bullet lists, difficulty scores, and countdown exam relevance.
- Session completion history is strictly preserved (completed, missed, catch-up, pending); missed past sessions trigger next-day catch-up with urgent visual indicators (`🔴 MISSED — COMPLETE TODAY`) without overwriting history.

## AI Features
- Integration with Groq API for study tips, motivation, topic breakdown, and study planning.
- Connected academic intelligence layer grounded in real student marks, weak subjects, and upcoming exams.
- Material NLP processing pipeline: PDF extraction -> chapter segmentation -> topic & keyword extraction -> difficulty scoring -> timetable slot mapping.
- Caching applied to AI responses (`@Cacheable(key = "#date")`) to prevent quota exhaustion.

## Authentication
- Firebase Auth for client token generation.
- Backend `FirebaseTokenFilter` validates Firebase tokens and issues secure SameSite JWT cookies.
- Single user identity guaranteed across multiple logins with full data persistence.

## Current Project Status
Full stack production-ready. Backend test suite passing with 17/17 timetable tests and 145 compiled classes, Frontend Jest test suite passing 100%, Next.js 24/24 routes statically compiled cleanly. All profile details persist durably, materials filtering functions end-to-end with visual subject badges, and the Timetable module provides full multi-week calendar horizons, start-end times, rich study session details with material traceability, and non-destructive missed-session history/catch-up tracking.
