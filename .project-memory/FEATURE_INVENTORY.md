# AI Study Planner - Feature Inventory

This document maps all implemented features in the application, categorized by system modules.

---

## 1. Authentication & Onboarding
- **Firebase Authentication Integration:** Supports traditional Email/Password registration/login and Google OAuth sign-in.
- **Client Session Exchange:** Synchronizes Firebase ID tokens to the server-side, returning custom JWT session tokens mapped to `httpOnly` secure cookies.
- **Premium Book Onboarding Experience:** Interactive wizard (`BookOnboarding.tsx`) introducing the platform, prompting for college details, and collecting study hour configurations.
- **Automated Profile Creation:** Backend automatically upserts user profiles on the first login via `AuthService`.
- **Dynamic Session Wake-up:** Checks backend status (`/api/wake`) during client loading to warm up Render instances.

## 2. Subjects Management
- **Subject CRUD Operations:** Add, view, modify, and delete subjects with details including code, credits, and difficulty level.
- **Difficulty Mapping:** Integer-based scale (1-5) representing subject complexity, utilized in timetable weighting.
- **Subject Grid UI:** Visually pleasing grid layouts presenting credit totals and syllabus progression.

## 3. Timetable & Scheduling
- **AI-Powered Timetable Generator:** Dynamically allocates study slots based on subject difficulty, exam proximity, and grade averages.
- **Weekly Schedule Layout:** 7-day grid displaying start/end times, allocated subjects, and specific study topics.
- **Sunday Study Scaling:** Automatically scales down study slot durations on Sundays by a multiplier of 0.5.
- **AI Slot Topic Suggestion:** Requests specific study topics from AI for each scheduled slot, customized to the session duration and subject performance.
- **Interactive Progress Checklists:** Toggle slot completion state, updating study streaks and dashboard metrics in real time.
- **Custom Slots:** Add manual study slots for specific days/times, bypassing automated generation.

## 4. Exams & Marks Tracking
- **Exam CRUD Operations:** Create, edit, and delete exams with name, date, time, type, duration, and syllabus.
- **Upcoming Exams Countdown:** Dashboard widget displaying time remaining until the next exam.
- **Marks Ledger:** Enter grades and marks obtained (obtained/total) for completed exams.
- **Automatic Score Evaluation:** Auto-calculates percentages and determines pass/fail status.
- **Performance Feed:** Visual feeds listing past exam history and trends.

## 5. Study Materials Library
- **Multipart Upload Support:** Securely upload files (PDF, DOC, DOCX, images) to storage.
- **AI Subject Categorization:** AI analyzes file names and text contents to identify the subject name automatically.
- **AI File Summarization:** Generates a structured 5-bullet-point summary of long documents (max 10,000 characters).
- **Metadata Management:** Visual lists presenting upload dates, file formats, and file sizes.
- **Material Deletion:** Delete documents from storage and metadata from the database in one click.

## 6. Performance Analytics
- **Overall Grade Percentage:** Visual circle progress tracking the overall average across all marks.
- **Study Hours Tracker:** Progress bars indicating total study hours completed during the week.
- **Subject-wise Performance Breakdown:** Graphical representation of averages for each subject.
- **AI Study Recommendations:** Actionable advice on which subjects require immediate focus and study hour allocations.
- **Performance Snapshots:** Automated snapshots storing weekly progress for trend lines.

## 7. AI Chat Assistant
- **Context-Aware Student Counselor:** Conversational chat interface responding to student doubts, explaining concepts step-by-step.
- **Dynamic Context Injection:** Automatically injects the user's subjects, exams, and timetables into the AI prompt.
- **Conversation History:** Persists chat sessions in PostgreSQL, limiting context length to 500 words to respect API token caps.
- **Markdown Rendering:** Displays code blocks, mathematical formulas, and formatting nicely in chat windows.

## 8. Subscriptions & Payments
- **Razorpay Checkout Integration:** Native integration supporting subscription creation (Monthly vs. Yearly plans).
- **Payment Verification:** Backend verifies the payment signature securely using SHA-256 HMAC before activating Premium accounts.
- **Webhook Handlers:** Receives `payment.authorized`, `payment.captured`, and `payment.failed` webhook events to sync user status automatically.
- **Expiry Scheduler:** Daily cron job checking and expiring user premium status if the subscription date has passed.
