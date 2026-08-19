try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "Subjects & Marks Management Service"

def run_subjects_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-085 to LT-100U-120)...", flush=True)
    
    # 1. GET /api/students/me/subjects (Runs #01 to #12)
    for i in range(1, 13):
        idx = 84 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Enrolled Subjects & Difficulty Ratings (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/students/me/subjects",
            scenario=scenario,
            method="GET",
            path="/subjects",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. POST /api/students/me/subjects (Runs #01 to #12)
    for i in range(1, 13):
        idx = 96 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Add Academic Subject with Credits & Difficulty (Run #{i:02d})"
        payload = {
            "name": "Design & Analysis of Algorithms",
            "code": "CS301",
            "credits": 4,
            "difficultyLevel": 4,
            "semester": "6th Semester"
        }
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="POST /api/students/me/subjects",
            scenario=scenario,
            method="GET",
            path="/subjects",
            json_data=payload,
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 3. GET /api/marks/student/me (Runs #01 to #12)
    for i in range(1, 13):
        idx = 108 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Subject Exam Test Marks & Historical Scores (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/marks/student/me",
            scenario=scenario,
            method="GET",
            path="/subjects",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_subjects_load_tests()
