try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "Subscription & Payment Service"

def run_subscription_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-289 to LT-100U-312)...", flush=True)
    
    # 1. GET /api/subscription/status (Runs #01 to #12)
    for i in range(1, 13):
        idx = 288 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Current Student Subscription Tier & Limits (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/subscription/status",
            scenario=scenario,
            method="GET",
            path="/subscription",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. GET /api/subscription/plans (Runs #01 to #12)
    for i in range(1, 13):
        idx = 300 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Available Pricing Plans Matrix (Free vs Pro vs Premium) (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/subscription/plans",
            scenario=scenario,
            method="GET",
            path="/subscription",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_subscription_load_tests()
