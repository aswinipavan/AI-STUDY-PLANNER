# AI Study Planner - API Endpoint Map

This document outlines all backend endpoints exposed by the Spring Boot REST API and how they map to Next.js API route handlers.

---

## 1. Authentication Endpoints (`/api/auth`)
*Managed by `AuthController.java`*

| Method | Endpoint | Auth | Request Body | Response Body | Description |
|--------|----------|------|--------------|---------------|-------------|
| **POST** | `/api/auth/login` | Public | `{ firebaseToken: String }` | `ApiResponse<AuthResponse>` | Verifies Firebase ID Token, logs in/registers user, returns JWT and user profile. |
| **POST** | `/api/auth/refresh` | Public | *None* (Header: `Firebase-Token`) | `ApiResponse<AuthResponse>` | Refreshes and returns a new session JWT. |

---

## 2. Student & Subject Endpoints (`/api/students`)
*Managed by `StudentController.java`*

| Method | Endpoint | Auth | Request Body | Response Body | Description |
|--------|----------|------|--------------|---------------|-------------|
| **GET** | `/api/students/me` | JWT | *None* | `ApiResponse<StudentResponse>` | Returns current student profile details. |
| **PUT** | `/api/students/me` | JWT | `StudentResponse` (Partial) | `ApiResponse<StudentResponse>` | Updates student profile details. |
| **PUT** | `/api/students/me/notifications` | JWT | `NotificationPreferencesRequest` | `ApiResponse<StudentResponse>` | Persists email and push notification preferences. |
| **GET** | `/api/students/me/subjects` | JWT | *None* | `Page<SubjectResponse>` | Lists all subjects registered by the student (paginated). |
| **POST** | `/api/students/me/subjects` | JWT | `SubjectRequest` | `ApiResponse<SubjectResponse>` | Registers a new study subject. |
| **PUT** | `/api/students/me/subjects/{id}` | JWT | `SubjectRequest` | `ApiResponse<SubjectResponse>` | Modifies an existing subject's details. |
| **DELETE** | `/api/students/me/subjects/{id}` | JWT | *None* | `ApiResponse<Void>` | Removes a subject and its related study slots. |

---

## 3. Timetable Endpoints (`/api/timetable`)
*Managed by `TimetableController.java`*

| Method | Endpoint | Auth | Request Body | Response Body | Description |
|--------|----------|------|--------------|---------------|-------------|
| **POST** | `/api/timetable/generate` | JWT | `TimetableRequest` | `ApiResponse<TimetableResponse>` | Generates a new active AI timetable. |
| **GET** | `/api/timetable/active` | JWT | *None* | `ApiResponse<TimetableResponse>` | Retrieves the current active timetable and its slots. |
| **PATCH** | `/api/timetable/slots/{id}/complete` | JWT | *None* | `ApiResponse<SlotResponse>` | Toggles slot completion status (updates streak). |
| **POST** | `/api/timetable/custom` | JWT | `SlotRequest` | `ApiResponse<SlotResponse>` | Manually adds a custom study slot to the active timetable. |

---

## 4. Exams & Marks Endpoints
*Managed by `ExamController.java` and `MarksController.java`*

| Method | Endpoint | Auth | Request Body | Response Body | Description |
|--------|----------|------|--------------|---------------|-------------|
| **POST** | `/api/exams` | JWT | `ExamRequest` | `ApiResponse<ExamResponse>` | Schedules an upcoming exam. |
| **GET** | `/api/exams/upcoming` | JWT | *None* | `ApiResponse<List<ExamResponse>>` | Returns all pending/future exam dates. |
| **PUT** | `/api/exams/{id}` | JWT | `ExamRequest` | `ApiResponse<ExamResponse>` | Modifies exam details. |
| **DELETE** | `/api/exams/{id}` | JWT | *None* | `ApiResponse<Void>` | Deletes a scheduled exam. |
| **POST** | `/api/marks` | JWT | `MarksRequest` | `ApiResponse<MarksResponse>` | Records test grades and marks for completed exams. |
| **GET** | `/api/marks/subject/{id}` | JWT | *None* | `ApiResponse<List<MarksResponse>>` | Returns exam marks history for a subject. |

---

## 5. Study Materials Endpoints (`/api/materials`)
*Managed by `MaterialController.java`*

| Method | Endpoint | Auth | Request Body | Response Body | Description |
|--------|----------|------|--------------|---------------|-------------|
| **POST** | `/api/materials/upload` | JWT | `MultipartFile`, `subjectId` | `ApiResponse<MaterialResponse>` | Uploads study material, triggers AI categorization and summary. |
| **GET** | `/api/materials` | JWT | *None* (Paginated) | `Page<MaterialResponse>` | Lists all uploaded materials (paginated). |
| **GET** | `/api/materials/subject/{id}` | JWT | *None* | `ApiResponse<List<MaterialResponse>>` | Lists study materials uploaded under a specific subject. |
| **DELETE** | `/api/materials/{id}` | JWT | *None* | `ApiResponse<Void>` | Deletes study material metadata and file record. |

---

## 6. AI Assistant Endpoints (`/api/ai`)
*Managed by `AiAssistantController.java`*

| Method | Endpoint | Auth | Request Body | Response Body | Description |
|--------|----------|------|--------------|---------------|-------------|
| **POST** | `/api/ai/chat` | JWT | `{ message: String, sessionId: String }` | `ApiResponse<AiChatResponse>` | Sends a message to the AI assistant (injects student context). |
| **GET** | `/api/ai/chat/history` | JWT | *None* (Param: `sessionId`) | `ApiResponse<List<ChatHistory>>` | Retrieves persistent chat history for a session. |
| **GET** | `/api/ai/chat/motivational-tip` | JWT | *None* | `ApiResponse<String>` | Returns the cached daily motivational quote/tip. |

---

## 7. Payments & Subscriptions (`/api/subscriptions` & `/api/webhooks`)
*Managed by `SubscriptionController.java` and `WebhookController.java`*

| Method | Endpoint | Auth | Request Body | Response Body | Description |
|--------|----------|------|--------------|---------------|-------------|
| **POST** | `/api/subscriptions/order` | JWT | `PaymentOrderRequest` | `ApiResponse<PaymentOrderResponse>` | Creates a Razorpay order for monthly/yearly plans. |
| **POST** | `/api/subscriptions/verify` | JWT | `PaymentVerifyRequest` | `ApiResponse<SubscriptionResponse>` | Verifies HMAC SHA-256 signature and activates Premium. |
| **GET** | `/api/subscriptions/status` | JWT | *None* | `ApiResponse<SubscriptionResponse>` | Returns current premium status. |
| **POST** | `/api/webhooks/razorpay` | Public | Razorpay payload (string) | *None* (Header: `X-Razorpay-Signature`) | Razorpay webhook receiver to sync payments automatically. |

---

## 8. Next.js Routing Proxy Maps
The Next.js frontend deploys proxy routes under `/api/` to bridge browser requests securely:

1. **`/api/auth/login` (Frontend Route)**
   - Receives Firebase token from browser, forwards to Spring Boot `POST /api/auth/login`.
   - On 200, reads JWT from `data.token` and stores it in the browser's `access_token` cookie as `httpOnly`.
2. **`/api/auth/refresh` (Frontend Route)**
   - Reads Vercel domain `refresh_token` cookie.
   - Forwards to Spring Boot `POST /api/auth/refresh` in `Firebase-Token` header.
   - Saves new JWT to Vercel domain `access_token` cookie.
3. **`/api/auth/logout` (Frontend Route)**
   - Deletes `access_token` and `refresh_token` cookies on Vercel domain.
4. **`/api/auth/[...path]` (Frontend Catch-all Proxy)**
   - Captures any client requests structured as `/api/auth/[...path]`.
   - Reads `access_token` cookie from request.
   - Forwards it as `Authorization: Bearer <jwt>` to `${ENV.BACKEND_URL}/api/[...path]`.
5. **`/api/wake` (Frontend Route)**
   - Pings Spring Boot `/actuator/health` to resolve cold-starts on Render.
