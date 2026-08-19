try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "Academic Performance & Analytics Service"

def run_analytics_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-265 to LT-100U-288)...", flush=True)
    
    # 1. GET /api/performance/overview (Runs #01 to #12)
    for i in range(1, 13):
        idx = 264 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Overall GPA Radial Gauge & Academic Readiness (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/performance/overview",
            scenario=scenario,
            method="GET",
            path="/performance",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. GET /api/performance/trends (Runs #01 to #12)
    for i in range(1, 13):
        idx = 276 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Historical Marks Trend Curves & Subject Comparison (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/performance/trends",
            scenario=scenario,
            method="GET",
            path="/performance",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_analytics_load_tests()
