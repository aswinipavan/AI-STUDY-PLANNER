# AI Study Planner - User Journey Map

This document outlines the end-to-end path of a student using the AI Study Planner, highlighting key pages, interactions, and backend triggers.

---

## 1. Landing & Authentication
1. **Landing Page (`/`):**
   - The user lands on a premium page featuring a rotating 3D book model (`HeroSceneClient`) and call-to-action buttons.
   - User clicks **"Get Started"** or **"Sign In"**.
2. **Authentication (`/login`):**
   - User is presented with a clean login/registration card (swapping tabs smoothly).
   - User can register via Email/Password or authenticate via **Google Sign-In**.
   - On submission, client contacts Firebase Auth, receives an ID token, and exchanges it with Next.js `/api/auth/login`. Next.js stores the session JWT in an `httpOnly` cookie.

## 2. Onboarding Experience
1. **Onboarding Page (`/onboarding`):**
   - If the user has just registered, they are redirected to `/onboarding`.
   - The user experience features a dynamic **interactive textbook** UI (`BookOnboarding.tsx`) representing steps as pages that turn.
   - **Step 1:** User inputs student profile details (College Name, Department, Semester).
   - **Step 2:** User inputs daily study availability (e.g. 4.0 hours/day).
   - User clicks **"Complete Onboarding"**, which updates their student record in the database and redirects them to the dashboard.

## 3. Setup: Adding Subjects
1. **Main Dashboard (`/dashboard`):**
   - The user sees empty states for their timetable and performance because they haven't added subjects.
   - User clicks **"Add Subjects"**.
2. **Subjects Page (`/subjects`):**
   - User enters subject details: Subject Name (e.g., "Linear Algebra"), Subject Code (e.g., "MATH201"), Credits (e.g., 4), and Difficulty Level (range 1-5).
   - Click "Save Subject". Repeat for other courses.
   - The Subject Grid immediately presents the loaded subjects with nice color tags.

## 4. Timetable Generation & Study Loop
1. **Generating AI Timetable (`/timetable/generate`):**
   - User navigates to Timetable and clicks **"Generate AI Timetable"**.
   - Input preferred maximum hours per day and study style (e.g. balanced, exam-focused).
   - Click **"Generate"**.
   - **Backend Trigger:** `TimetableService.generateAiTimetable` executes. It calculates subject weights (combining difficulty and performance), divides hours proportionally, schedules slots starting at 18:00 (applying a 0.5 Sunday multiplier), and calls AI to suggest specific study topics for each slot.
2. **Timetable Weekly View (`/timetable`):**
   - User is redirected to their new weekly calendar.
   - Each study slot shows the subject, start/end time, and the AI-suggested topic (e.g., "Practice matrix multiplications").
3. **Daily Study Loop:**
   - When the student finishes a study slot, they toggle the checkbox on the calendar.
   - The slot is marked completed, and the dashboard study hours and streak counter increase.

## 5. Materials Management
1. **Materials Library (`/materials`):**
   - Student navigates to Materials and clicks **"Upload Material"**.
   - Selects a PDF textbook or assignment file and enters the subject.
   - **Backend Trigger:** File metadata is stored. The backend reads the file text preview, calls AI to categorize the subject (if unspecified), and generates a 5-bullet-point summary.
2. **Reading & Reviewing:**
   - The uploaded file appears in the Materials ledger.
   - Click "View Summary" to open the AI-generated digest, helping the student review key concepts instantly.

## 6. Exams & Analytics Tracking
1. **Scheduling an Exam (`/exams`):**
   - Student schedules a midterm or finals exam, entering the subject, date (must be in the future), and duration.
   - **Adaptive Scheduling Trigger:** The backend weights are dynamically adjusted because an exam is upcoming. The next AI Timetable generation will allocate more slots to this subject automatically.
2. **Grades Entry & Snapshot:**
   - Once the exam date passes, the student enters their marks obtained (e.g., 85 out of 100).
   - The system automatically registers a pass/fail grade and updates the overall grade percentage.
   - **Performance Page (`/performance`):** Student views graphs showing their average grades, weekly study hours, and AI-recommended priority topics (e.g., "Devote 1.5 more hours to Linear Algebra").

## 7. AI Assistant Chat
1. **AI Chat (`/chat`):**
   - Student enters the chat room.
   - Enters a question (e.g., "Help me understand eigenvalues").
   - **Backend Trigger:** `AiAssistantService` loads student context (registered subjects, upcoming exams, active slots) and sends it with the conversation history to the Gemini API.
   - AI assistant responds with a step-by-step math explanation and worked-out examples.

## 8. Premium Upgrade
1. **Subscription (`/subscription`):**
   - Free users face limits on AI generations. They click **"Go Premium"**.
   - Choose a monthly or yearly plan and click **"Subscribe"**.
   - Razorpay payment window opens. Student enters test credentials and completes payment.
   - On verification, user profile is marked `isPremium = true`, unlocking unlimited AI capabilities.
