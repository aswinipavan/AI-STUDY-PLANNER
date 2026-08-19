try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "Exams Management Service"

def run_exams_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-121 to LT-100U-156)...", flush=True)
    
    # 1. GET /api/exams/student/me (Runs #01 to #12)
    for i in range(1, 13):
        idx = 120 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Scheduled Exams List & Syllabus Progress (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/exams/student/me",
            scenario=scenario,
            method="GET",
            path="/exams",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. GET /api/exams/upcoming (Runs #01 to #12)
    for i in range(1, 13):
        idx = 132 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Upcoming Exam Countdown Query & Proximity Alert (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/exams/upcoming",
            scenario=scenario,
            method="GET",
            path="/exams",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 3. POST /api/exams (Runs #01 to #12)
    for i in range(1, 13):
        idx = 144 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Create Scheduled Exam Record & Target Syllabus (Run #{i:02d})"
        payload = {
            "subjectId": "123e4567-e89b-12d3-a456-426614174000",
            "name": "Mid-Term Examination",
            "examDate": "2026-09-15T09:00:00Z",
            "examType": "MIDTERM",
            "weightage": 30
        }
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="POST /api/exams",
            scenario=scenario,
            method="GET",
            path="/exams",
            json_data=payload,
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_exams_load_tests()
