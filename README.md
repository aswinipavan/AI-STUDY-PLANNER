# 🎓 AI Study Planner

An intelligent, AI-powered study planner that helps college students manage their schedules, track academic performance, and receive personalized AI-generated study recommendations.

---

## 🚀 Tech Stack

### Backend
| Technology         | Purpose                                    |
|--------------------|---------------------------------------------|
| Spring Boot 3.2    | Core REST API framework                     |
| Java 17            | Language & runtime                          |
| Supabase PostgreSQL| Primary relational database                 |
| Firebase Auth      | User authentication & identity              |
| Groq AI            | AI timetable generation & chat assistant    |
| Razorpay           | Premium subscription payment gateway        |
| Render             | Cloud deployment (Docker-based)             |

### Frontend
| Technology     | Purpose                          |
|----------------|----------------------------------|
| Next.js 16     | React 19 framework with App Router & Turbopack |
| TypeScript     | Type-safe development            |
| Tailwind CSS   | Utility-first styling            |
| Firebase Auth  | Client-side authentication       |
| Vercel         | Frontend deployment              |

---

## 📁 Project Structure

```
AI-Study-Planner/
├── backend/          # Spring Boot 3.2 REST API (Java 17, Groq AI, Supabase)
│   ├── src/          # Java source code
│   ├── Dockerfile    # Docker build config
│   ├── render.yaml   # Render deployment blueprint
│   └── pom.xml       # Maven build file
│
└── frontend/         # Next.js 16 web app (React 19, TypeScript, Tailwind)
    ├── src/          # TypeScript source code
    ├── public/       # Static assets
    └── package.json  # Node dependencies
```

---

## ⚙️ Local Development

### Backend Setup

```bash
cd backend
cp .env.example .env   # Fill in your credentials
mvn spring-boot:run
# Server starts at http://localhost:8080
# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local   # Fill in your credentials
npm install
npm run dev
# App starts at http://localhost:3000
```

---

## 🔐 Environment Variables

Copy the example files and fill in your credentials:
- **Backend:** `backend/.env.example` → `backend/.env`
- **Frontend:** `frontend/.env.local.example` → `frontend/.env.local`

> ⚠️ **Never commit `.env` or `.env.local` files** — they are git-ignored.

---

## ☁️ Deployment

- **Backend:** Deployed on [Render](https://render.com) via Docker (`backend/render.yaml`)
- **Frontend:** Deployed on [Vercel](https://vercel.com)

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).
