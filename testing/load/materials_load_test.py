try:
    from .core_engine import execute_load_scenario
except Exception:
    from core_engine import execute_load_scenario

CATEGORY = "Academic Materials & Document Intelligence Service"

def run_materials_load_tests():
    results = []
    print(f"[*] Executing {CATEGORY} Load Tests (LT-100U-193 to LT-100U-228)...", flush=True)
    
    # 1. GET /api/materials/student/me (Runs #01 to #12)
    for i in range(1, 13):
        idx = 192 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Fetch Uploaded Academic Materials Catalog (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/materials/student/me",
            scenario=scenario,
            method="GET",
            path="/materials",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    # 2. POST /api/materials/upload (Runs #01 to #12)
    for i in range(1, 13):
        idx = 204 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"PDF Notes Upload & NLP Extraction Trigger (Run #{i:02d})"
        payload = {
            "title": "Data Structures Lecture Notes",
            "subjectId": "123e4567-e89b-12d3-a456-426614174000",
            "fileUrl": "https://storage.supabase.co/materials/cs301_notes.pdf"
        }
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="POST /api/materials/upload",
            scenario=scenario,
            method="GET",
            path="/materials",
            json_data=payload,
            requires_auth=True,
            vus=100,
            sla_max_avg=500,
            sla_max_peak=2800
        )
        results.append(res)

    # 3. GET /api/materials/{id}/status (Runs #01 to #12)
    for i in range(1, 13):
        idx = 216 + i
        t_id = f"LT-100U-{idx:03d}"
        scenario = f"Apache PDFBox Text & Keyphrase Processing Status (Run #{i:02d})"
        res = execute_load_scenario(
            test_id=t_id,
            category=CATEGORY,
            endpoint="GET /api/materials/status",
            scenario=scenario,
            method="GET",
            path="/materials",
            requires_auth=True,
            vus=100,
            sla_max_avg=400,
            sla_max_peak=2500
        )
        results.append(res)

    print(f"[+] Completed {len(results)} {CATEGORY} load tests.", flush=True)
    return results

if __name__ == "__main__":
    run_materials_load_tests()
