try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "AI Timetable & Study Planner Service"

def run_timetable_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-157 to LT-100U-192)...", flush=True)
    
    # 1. GET /api/timetable/student/me (Runs #01 to #12)
    for i in range(1, 13):
        idx = 156 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch 7-Day Weekly Study Timetable Grid (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/timetable/student/me",
            scenario=scenario,
            method="GET",
            path="/timetable",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. POST /api/timetable/generate (Runs #01 to #12)
    for i in range(1, 13):
        idx = 168 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"5-Step AI Timetable Generation & Groq Scheduling (Run #{i:02d})"
        payload = {
            "dailyStudyHours": 4.0,
            "preferredStudyTimes": ["MORNING", "EVENING"],
            "focusWeakSubjects": True,
            "targetGrade": "A"
        }
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="POST /api/timetable/generate",
            scenario=scenario,
            method="GET",
            path="/timetable",
            json_data=payload,
            requires_auth=True,
            vus=100,
            sla_max_avg=600,
            sla_max_peak=3000
        )
        results.append(res)

    # 3. PATCH /api/timetable/slots/{id}/toggle (Runs #01 to #12)
    for i in range(1, 13):
        idx = 180 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Toggle Study Slot Completion & Streak Recalculation (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="PATCH /api/timetable/slots/toggle",
            scenario=scenario,
            method="GET",
            path="/timetable",
            json_data={"completed": True},
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_timetable_load_tests()
