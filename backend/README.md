# AI Study Planner Backend

An intelligent, AI-powered academic planning backend built with Spring Boot 3.2. It helps college students manage their subjects, track marks, generate personalized AI study timetables, and prepare for exams — all powered by Groq AI. The backend is secured using Firebase Authentication, backed by Supabase PostgreSQL, and supports Razorpay premium subscriptions.

---

## 🚀 Tech Stack

| Technology         | Purpose                                    |
|--------------------|--------------------------------------------|
| Spring Boot 3.2    | Core REST API framework                    |
| Java 17            | Language & runtime                         |
| Supabase PostgreSQL| Primary relational database                |
| Firebase Auth      | User authentication & identity             |
| Groq AI (Gemini)   | AI timetable generation & chat assistant   |
| Razorpay           | Premium subscription payment gateway       |
| Render             | Cloud deployment platform (Docker-based)   |
| Maven              | Build tool & dependency management         |
| Springdoc OpenAPI  | Auto-generated Swagger API documentation   |

---

## ✅ Prerequisites

- **Java 17** — [Download Temurin](https://adoptium.net/)
- **Maven 3.9+** — [Download Maven](https://maven.apache.org/download.cgi)
- **Docker** (optional, for containerized runs) — [Download Docker](https://www.docker.com/get-started)
- A **Supabase** project with the schema applied
- A **Firebase** project with Authentication enabled
- **Groq AI** API key from Google Cloud Console
- **Razorpay** account with API keys

---

## 🛠️ Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/aswinipavan/aistudyplannerbackend.git
cd aistudyplannerbackend
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Open `.env` and fill in all required values (see [Environment Variables](#-environment-variables) table below).

### 3. Run the Supabase Database Migration
- Open your [Supabase project](https://supabase.com/dashboard)
- Go to **SQL Editor**
- Paste and run the contents of `src/main/resources/db/migration/V1__initial_schema.sql`

### 4. Start the Application
```bash
mvn spring-boot:run
```
The server starts at **http://localhost:8080**

### (Optional) Run with Docker
```bash
docker build -t ai-study-planner .
docker run -p 8080:8080 --env-file .env ai-study-planner
```

---

## 📖 API Documentation

Once the server is running, visit the interactive Swagger UI at:

**[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)**

---

## 📁 Project Structure

```
src/main/java/com/aistudyplanner/
├── config/                   # Spring configuration (Security, CORS, Firebase, etc.)
├── controller/               # REST API controllers
├── exception/                # Custom exceptions & GlobalExceptionHandler
├── interceptor/              # Request/response logging interceptor
├── model/
│   ├── dto/
│   │   ├── request/          # Incoming request DTOs with validation
│   │   └── response/         # Outgoing response DTOs
│   └── entity/               # JPA entity classes
├── repository/               # Spring Data JPA repositories
├── security/                 # JWT, Firebase filter, @CurrentStudent
├── service/                  # Business logic services
└── util/                     # Utility helpers (AiPromptBuilder, etc.)

src/main/resources/
├── application.properties        # Base configuration
├── application-prod.properties   # Production overrides
└── db/migration/
    └── V1__initial_schema.sql    # Supabase PostgreSQL DDL + RLS

Dockerfile                    # Multi-stage Docker build
render.yaml                   # Render deployment blueprint
.env.example                  # Environment variable template
```

---

## 🔐 Environment Variables

| Variable                     | Description                                               | Where to Get It                                                       |
|------------------------------|-----------------------------------------------------------|-----------------------------------------------------------------------|
| `SUPABASE_DB_URL`            | JDBC connection URL for Supabase PostgreSQL               | Supabase → Project Settings → Database → Connection String (URI)     |
| `SUPABASE_DB_USER`           | Supabase DB username (typically `postgres`)               | Supabase → Project Settings → Database                               |
| `SUPABASE_DB_PASSWORD`       | Supabase database password                                | Supabase → Project Settings → Database                               |
| `FIREBASE_PROJECT_ID`        | Your Firebase project ID                                  | Firebase Console → Project Settings → General                        |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Base64-encoded Firebase service account JSON           | Firebase Console → Project Settings → Service Accounts → Generate Key, then run: `base64 -i serviceAccountKey.json` |
| `GROQ_API_KEY`               | API key for Groq/Gemini AI inference                      | Google Cloud Console → APIs & Services → Credentials                 |
| `RAZORPAY_KEY_ID`            | Razorpay publishable key ID                               | Razorpay Dashboard → Settings → API Keys                             |
| `RAZORPAY_KEY_SECRET`        | Razorpay secret key                                       | Razorpay Dashboard → Settings → API Keys                             |
| `RAZORPAY_WEBHOOK_SECRET`    | Secret used to verify Razorpay webhook signatures         | Razorpay Dashboard → Settings → Webhooks                             |
| `JWT_SECRET`                 | Minimum 32-character secret for signing internal JWTs     | Generate with: `openssl rand -hex 32`                                |
| `ALLOWED_ORIGINS`            | Comma-separated CORS origins for the frontend             | e.g., `http://localhost:3000,https://yourapp.vercel.app`             |

---

## ☁️ Deploying on Render

1. **Push this repository to GitHub.**
2. Log in to [Render](https://render.com) and click **New → Blueprint**.
3. Connect your GitHub repository — Render will automatically detect `render.yaml`.
4. In the **Environment** section of your new service, add all the secret variables from the table above (the `render.yaml` defines the keys; you supply the values).
5. Click **Apply** — Render will build the Docker image and deploy.
6. Monitor deployment health at: `https://<your-service>.onrender.com/actuator/health`

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
