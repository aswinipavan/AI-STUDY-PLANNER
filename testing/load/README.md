# AI Study Planner — Load Testing Architecture & Execution Guide

## Overview
This load testing infrastructure executes real concurrent traffic against the AI Study Planner Next.js App Router and Spring Boot microservices. It is organized into 10 dedicated sub-files corresponding to the actual system modules, aggregating into a single master Excel report, CSV export, JSON summary, and HTML dashboard.

---

## Directory Architecture

```
testing/load/
├── core_engine.py                 # Multi-threaded concurrent worker engine & latency percentile calculator
├── authentication_load_test.py    # Module 01: Authentication Service (LT-100U-001 to LT-100U-036)
├── profile_load_test.py           # Module 02: Student Profile & Settings Service (LT-100U-037 to LT-100U-060)
├── dashboard_load_test.py         # Module 03: Dashboard & Academic Overview Service (LT-100U-061 to LT-100U-084)
├── subjects_load_test.py          # Module 04: Subjects & Marks Management Service (LT-100U-085 to LT-100U-120)
├── exams_load_test.py             # Module 05: Exams Management Service (LT-100U-121 to LT-100U-156)
├── timetable_load_test.py         # Module 06: AI Timetable & Study Planner Service (LT-100U-157 to LT-100U-192)
├── materials_load_test.py         # Module 07: Academic Materials & Document Intelligence (LT-100U-193 to LT-100U-228)
├── ai_chat_load_test.py           # Module 08: AI Coach & Chat Service (LT-100U-229 to LT-100U-264)
├── analytics_load_test.py         # Module 09: Academic Performance & Analytics Service (LT-100U-265 to LT-100U-288)
├── subscription_load_test.py      # Module 10: Subscription & Payment Service (LT-100U-289 to LT-100U-312)
└── load_test_runner.py            # Master Execution & Reporting Orchestrator
```

---

## Execution Instructions

1. Ensure the local Next.js server (`http://localhost:3000`) or Spring Boot backend (`http://localhost:8080`) is running.
2. Run the entire 312-scenario master suite:
   ```bash
   python testing/load/load_test_runner.py
   ```
3. Or execute individual module sub-files:
   ```bash
   python -m testing.load.authentication_load_test
   python -m testing.load.timetable_load_test
   ```

---

## Generated Artifacts

- **Excel Workbook:** `testing/reports/AI_Study_Planner_Load_Test.xlsx` (Contains `AI Study Planner - Load Test Dashboard` and `All 300+ Load Test Cases`)
- **CSV Data:** `testing/reports/load_test_results.csv`
- **JSON Summary:** `testing/reports/load_test_summary.json`
- **HTML Dashboard:** `testing/reports/load_test_report.html`
