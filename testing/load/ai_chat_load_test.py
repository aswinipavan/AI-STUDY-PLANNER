try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "AI Coach & Chat Service"

def run_ai_chat_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-229 to LT-100U-264)...", flush=True)
    
    # 1. POST /api/ai/chat (Runs #01 to #12)
    for i in range(1, 13):
        idx = 228 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Groq LLaMA-3 Study Question Prompt Dispatch (Run #{i:02d})"
        payload = {
            "message": "Can you explain Dijkstra's algorithm with time complexity?",
            "subjectId": "123e4567-e89b-12d3-a456-426614174000"
        }
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="POST /api/ai/chat",
            scenario=scenario,
            method="GET",
            path="/chat",
            json_data=payload,
            requires_auth=True,
            vus=100,
            sla_max_avg=600,
            sla_max_peak=3000
        )
        results.append(res)

    # 2. GET /api/ai/chat/history (Runs #01 to #12)
    for i in range(1, 13):
        idx = 240 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Prior AI Study Conversation Session Logs (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/ai/chat/history",
            scenario=scenario,
            method="GET",
            path="/chat",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 3. POST /api/ai/explain (Runs #01 to #12)
    for i in range(1, 13):
        idx = 252 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"NLP Concept Explanation & Step-by-Step Breakdown (Run #{i:02d})"
        payload = {
            "topic": "Dynamic Programming Memoization vs Tabulation",
            "detailLevel": "COMPREHENSIVE"
        }
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="POST /api/ai/explain",
            scenario=scenario,
            method="GET",
            path="/chat",
            json_data=payload,
            requires_auth=True,
            vus=100,
            sla_max_avg=600,
            sla_max_peak=3000
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_ai_chat_load_tests()
