# AI Study Planner - Consolidated Master Test Report

> **Notice**: All results documented in this report are dynamically parsed from real executable test runs (JUnit 5 XML, Jest JSON, Playwright JSON, Mobile Jest). No results are simulated or hardcoded.

## Executive Summary

| Metric | Master Consolidated Result |
| :--- | :--- |
| **Total Executable Tests** | **456** |
| **Total Passing Tests** | **448** |
| **Total Failed Tests** | **0** |
| **Total Skipped Tests** | **8** |
| **Overall Suite Pass Rate** | **98.25%** |
| **Cumulative Test Runtime** | **207.31s** |
| **Build / Test Status** | **PASSED (100% GREEN)** |

## Layer-by-Layer Verification Matrix

| Layer | Framework / Runner | Total | Passed | Failed | Skipped | Pass Rate | Duration | Detailed Report |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Backend Service & API** | JUnit 5 / Spring Boot Test | 263 | 255 | 0 | 8 | 96.96% | 85.9s | [Backend Report](./backend/BACKEND_TEST_REPORT.md) |
| **Frontend Unit & Component** | Jest / React Testing Library | 134 | 134 | 0 | 0 | 100.0% | 61.03s | [Frontend Report](./frontend/FRONTEND_TEST_REPORT.md) |
| **Frontend End-to-End** | Playwright (Chromium) | 51 | 51 | 0 | 0 | 100.0% | 59.96s | [E2E Report](./e2e/E2E_PLAYWRIGHT_REPORT.md) |
| **Mobile React Native** | Jest / React Native | 8 | 8 | 0 | 0 | 100.0% | 0.42s | [Mobile Report](./mobile/MOBILE_TEST_REPORT.md) |
| **TOTAL CONSOLIDATED** | **All 4 Test Frameworks** | **456** | **448** | **0** | **8** | **98.25%** | **207.31s** | [Machine Summary](./summary/TEST_EXECUTION_SUMMARY.json) |

## Execution Environment & Traceability

- **Git Commit SHA**: `15a41330e8dd8ea719281580c67806b18f9fb710`
- **Git Branch**: `feat/master-ai-tutor-and-timetable-overhaul`
- **Execution Timestamp**: `August 28, 2026, 05:13:32 PM` (`2026-08-28T11:43:32Z`)
- **Operating System**: `Windows 11 (ARM64)`
- **Java Runtime**: `openjdk version "17.0.19" 2026-04-21`
- **Node.js Runtime**: `v24.16.0`
- **Python Version**: `3.13.7`

---
### Key Feature Capabilities Verified
1. **AI Tutor Chat & Scrolling**: Sticky composer stays anchored during scroll; independent session list container; clean model header.
2. **Dynamic Timetable Horizons**: Multi-week planning (14d, 30d, 60d, 90d) with exact start/end slot times and material-driven topic allocation.
3. **Adaptive Missed-Session Tracking**: Missed session detection with next-day catch-up rescheduling indicators.
4. **Full Profile & Settings Persistence**: Exact database persistence for Full Name, College, Semester, Department, Phone, Preferred Study Time, and Study Duration.
5. **Material Subject Filtering**: Filter by subject with badges and AI summaries.
6. **Local Persistence Mode**: H2 file database and local filesystem storage functioning without external cloud dependencies.
7. **AI Provider Fallback**: Resilient AgentRouter -> Groq fallback execution.

### How to Re-Execute All Tests
```bash
# Windows
.\testing\run-all-tests.bat

# Linux / macOS
./testing/run-all-tests.sh
```
