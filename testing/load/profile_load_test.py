try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "Student Profile & Settings Service"

def run_profile_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-037 to LT-100U-060)...", flush=True)
    
    # 1. GET /api/students/me (Runs #01 to #12)
    for i in range(1, 13):
        idx = 36 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Student Metadata & Semester Details (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/students/me",
            scenario=scenario,
            method="GET",
            path="/settings",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. PUT /api/students/me (Runs #01 to #12)
    for i in range(1, 13):
        idx = 48 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Update Daily Available Study Hours & Preferences (Run #{i:02d})"
        payload = {
            "name": "Aswini Pavan",
            "collegeName": "National Institute of Technology",
            "department": "Computer Science & Engineering",
            "semester": "6th Semester",
            "dailyStudyHours": 4.5
        }
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="PUT /api/students/me",
            scenario=scenario,
            method="GET",
            path="/settings",
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
    run_profile_load_tests()
