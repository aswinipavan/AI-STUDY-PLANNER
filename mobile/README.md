# AI Study Planner — Mobile (Android)

React Native Android application for the AI Study Planner.

## Architecture

- **Framework**: React Native 0.75 (bare workflow)
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State**: Zustand
- **Data Fetching**: TanStack React Query v5
- **HTTP Client**: Axios (direct to backend, no proxy)
- **Auth**: `@react-native-firebase/auth` + backend JWT
- **Secure Storage**: `react-native-encrypted-storage` (Android Keystore)
- **Backend URL**: `https://aistudyplannerbackend.onrender.com`

## Prerequisites

- Node.js 18+
- JDK 17
- Android Studio with SDK 34
- `ANDROID_HOME` environment variable set

## Setup

```bash
# 1. Install dependencies
cd mobile
npm install

# 2. Add Firebase Android config
# Download google-services.json from Firebase Console (project: study-planner-ec1d2)
# Place it at: mobile/android/app/google-services.json

# 3. Copy and fill environment
cp .env.example .env
# Edit .env — the BACKEND_URL is pre-filled

# 4. Run on Android
npx react-native run-android
```

## Phase 1 Features

- ✅ Firebase Email/Password Authentication
- ✅ Backend JWT session with EncryptedStorage
- ✅ Session restore on app start
- ✅ Dashboard (streak, today's slots, next exam)
- ✅ Subjects CRUD
- ✅ Timetable (weekly view, slot completion toggle)
- ✅ Exams (upcoming + all, CRUD)
- ✅ Profile (view + edit)

## Phase 2 (Coming Next)

- AI Chat (Groq integration)
- Performance analytics and charts
- Study materials upload
- Daily motivation widget

## Project Structure

```
mobile/
├── android/              # Native Android project
├── src/
│   ├── api/              # Axios API functions (one file per controller)
│   ├── auth/             # Firebase auth + JWT storage helpers
│   ├── components/       # Reusable UI components
│   ├── constants/        # Config, colors, theme, query keys
│   ├── hooks/            # React Query hooks
│   ├── navigation/       # Stack and tab navigators
│   ├── screens/          # Feature screens
│   ├── stores/           # Zustand global stores
│   ├── types/            # TypeScript interfaces (mirror backend DTOs)
│   └── utils/            # Date formatting, error handling
├── App.tsx               # Root component
└── index.js              # Entry point
```

## Notes

- The mobile app calls the Spring Boot backend **directly** (no Next.js proxy needed)
- Backend URL: `https://aistudyplannerbackend.onrender.com` (Render cold-start may take 30-60s)
- JWT is stored securely in Android Keystore via `react-native-encrypted-storage`
- Never store the JWT in `AsyncStorage`
