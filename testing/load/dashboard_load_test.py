try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "Dashboard & Academic Overview Service"

def run_dashboard_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-061 to LT-100U-084)...", flush=True)
    
    # 1. GET /api/students/me (Dashboard summary KPI fetch) (Runs #01 to #12)
    for i in range(1, 13):
        idx = 60 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Dashboard Overview & Daily Study Metrics (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/students/me",
            scenario=scenario,
            method="GET",
            path="/dashboard",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. GET /api/health (System Health & DB Heartbeat) (Runs #01 to #12)
    for i in range(1, 13):
        idx = 72 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"System Uptime & Database Connection Heartbeat (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/health",
            scenario=scenario,
            method="GET",
            path="/dashboard",
            requires_auth=False,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_dashboard_load_tests()
