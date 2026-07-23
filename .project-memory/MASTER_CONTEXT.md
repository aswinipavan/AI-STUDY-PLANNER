# AI Study Planner - Master Context

## Project Vision
To provide an intelligent, AI-driven study planner that helps students manage their schedules, track performance, and receive personalized learning recommendations.

## Project Goals
- Automate study scheduling based on user availability and goals.
- Track academic performance and provide actionable insights.
- Generate AI-powered motivational tips and study recommendations.
- Provide a responsive and intuitive user interface.

## Architecture
- **Frontend:** React / Next.js (To be confirmed/developed).
- **Backend:** Spring Boot (Java 17+).
- **Database:** PostgreSQL (hosted on Supabase).

## Technologies
- Java 17, Spring Boot 3.x
- Hibernate / Spring Data JPA
- Supabase (Postgres, Database Pooler)
- Firebase Authentication
- Groq AI API
- Razorpay

## Folder Structure
- `/backend`: Spring Boot application.
- `/.project-memory`: Persistent agent memory and context files.

## Business Logic
- Users must authenticate via Firebase.
- Subscriptions managed via Razorpay.
- Timetable scheduling is dynamically adjusted based on tasks and exams.

## AI Features
- Integration with Groq API for study tips and motivation.
- Caching applied to AI responses (`@Cacheable(key = "#date")`) to prevent quota exhaustion and stale data.

## Authentication
- Firebase Auth for token generation.
- Spring Security filter (`FirebaseTokenFilter`) validates JWTs.

## Current Project Status
Backend is bootstrapped, running on port 8080, connected to Supabase. Pagination and caching are implemented. Frontend integration is pending.
