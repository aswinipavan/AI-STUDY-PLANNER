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
- **Backend URL**: `https://ai-study-planner-hp0e.onrender.com`

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

## Quick Start Launcher (`run-mobile.bat`)

A robust Windows batch launcher is provided at the repository root and in `mobile/` to automate device checks, Metro management, ADB port forwarding, APK installation, and app launch.

### Prerequisites for Running
1. **USB Debugging**: Must be enabled in phone settings (*Settings -> Developer options -> USB debugging*).
2. **Phone Connected**: Connect your physical Android phone via USB cable (or start an Android emulator).
3. **ADB Authorization**: When prompted on your phone, tap **"Allow USB debugging"**.
4. **Metro Bundler**: React Native debug builds require the Metro bundler on port 8081 to serve JavaScript bundles. The script automatically launches Metro in a separate terminal if not already active and reuses it safely on subsequent runs.

### How to Run the Launcher
From the project root or the `mobile/` folder:
```cmd
run-mobile.bat
```

### Launcher Progress Flow
- `[1/6] Checking ADB...` — Verifies ADB executable from Android SDK / PATH.
- `[2/6] Checking Android device...` — Confirms connected device and authorized USB debugging status.
- `[3/6] Checking Metro...` — Reuses existing Metro bundler on port 8081 or launches a new dedicated window and waits for readiness.
- `[4/6] Configuring ADB reverse...` — Executes `adb reverse tcp:8081 tcp:8081` and verifies mapping.
- `[5/6] Installing debug APK...` — Runs `gradlew.bat app:installDebug` on the connected device.
- `[6/6] Launching StudyPlanner...` — Launches `com.study.planner/.MainActivity`.

### How to Stop Metro
- In the dedicated Metro terminal window, press `Ctrl + C` or close the window.
- Alternatively, stop any process listening on port 8081 via PowerShell:
```powershell
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
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
- Backend URL: `https://ai-study-planner-hp0e.onrender.com` (Render cold-start may take 30-60s)
- JWT is stored securely in Android Keystore via `react-native-encrypted-storage`
- Never store the JWT in `AsyncStorage`
