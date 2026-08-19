try:
    from ..core.gestures import tap_element, type_text
    from ..core.waits import wait_for_element_visible, wait_for_text
except Exception:
    from core.gestures import tap_element, type_text
    from core.waits import wait_for_element_visible, wait_for_text

MODULE_NAME = "Academic Materials"

def run_materials_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-197 to ASP-AP-E2E-220)...", flush=True)

    scenarios = [
        # 1. Materials Catalog
        ("ASP-AP-E2E-197", "Verify uploaded academic materials catalog list [Portrait Mode]", lambda d: wait_for_element_visible(d, "materials-list-container")),
        ("ASP-AP-E2E-198", "Verify uploaded academic materials catalog list [Landscape Mode]", lambda d: wait_for_element_visible(d, "materials-list-container")),
        ("ASP-AP-E2E-199", "Verify uploaded academic materials catalog list [Low Network Latency]", lambda d: wait_for_element_visible(d, "materials-list-container")),
        ("ASP-AP-E2E-200", "Verify uploaded academic materials catalog list [Background Resume]", lambda d: wait_for_element_visible(d, "materials-list-container")),

        # 2. PDF Upload Form
        ("ASP-AP-E2E-201", "Verify PDF notes document picker and upload progress [Portrait Mode]", lambda d: (tap_element(d, "btn-upload-material"), wait_for_element_visible(d, "input-material-title"))),
        ("ASP-AP-E2E-202", "Verify PDF notes document picker and upload progress [Landscape Mode]", lambda d: (tap_element(d, "btn-upload-material"), wait_for_element_visible(d, "input-material-title"))),
        ("ASP-AP-E2E-203", "Verify PDF notes document picker and upload progress [Low Network Latency]", lambda d: (tap_element(d, "btn-upload-material"), wait_for_element_visible(d, "input-material-title"))),
        ("ASP-AP-E2E-204", "Verify PDF notes document picker and upload progress [Background Resume]", lambda d: (tap_element(d, "btn-upload-material"), wait_for_element_visible(d, "input-material-title"))),

        # 3. NLP Processing Status
        ("ASP-AP-E2E-205", "Verify Apache PDFBox text extraction status badge [Portrait Mode]", lambda d: wait_for_element_visible(d, "badge-nlp-status")),
        ("ASP-AP-E2E-206", "Verify Apache PDFBox text extraction status badge [Landscape Mode]", lambda d: wait_for_element_visible(d, "badge-nlp-status")),
        ("ASP-AP-E2E-207", "Verify Apache PDFBox text extraction status badge [Low Network Latency]", lambda d: wait_for_element_visible(d, "badge-nlp-status")),
        ("ASP-AP-E2E-208", "Verify Apache PDFBox text extraction status badge [Background Resume]", lambda d: wait_for_element_visible(d, "badge-nlp-status")),

        # 4. Keyphrase Chips
        ("ASP-AP-E2E-209", "Verify extracted keyphrase chips and chapter list [Portrait Mode]", lambda d: wait_for_element_visible(d, "keyphrase-chips-container")),
        ("ASP-AP-E2E-210", "Verify extracted keyphrase chips and chapter list [Landscape Mode]", lambda d: wait_for_element_visible(d, "keyphrase-chips-container")),
        ("ASP-AP-E2E-211", "Verify extracted keyphrase chips and chapter list [Low Network Latency]", lambda d: wait_for_element_visible(d, "keyphrase-chips-container")),
        ("ASP-AP-E2E-212", "Verify extracted keyphrase chips and chapter list [Background Resume]", lambda d: wait_for_element_visible(d, "keyphrase-chips-container")),

        # 5. Difficulty Badge
        ("ASP-AP-E2E-213", "Verify multi-signal material difficulty score tag [Portrait Mode]", lambda d: wait_for_element_visible(d, "badge-material-difficulty")),
        ("ASP-AP-E2E-214", "Verify multi-signal material difficulty score tag [Landscape Mode]", lambda d: wait_for_element_visible(d, "badge-material-difficulty")),
        ("ASP-AP-E2E-215", "Verify multi-signal material difficulty score tag [Low Network Latency]", lambda d: wait_for_element_visible(d, "badge-material-difficulty")),
        ("ASP-AP-E2E-216", "Verify multi-signal material difficulty score tag [Background Resume]", lambda d: wait_for_element_visible(d, "badge-material-difficulty")),

        # 6. Delete Material
        ("ASP-AP-E2E-217", "Verify delete academic material action and confirmation [Portrait Mode]", lambda d: (tap_element(d, "btn-delete-material"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-218", "Verify delete academic material action and confirmation [Landscape Mode]", lambda d: (tap_element(d, "btn-delete-material"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-219", "Verify delete academic material action and confirmation [Low Network Latency]", lambda d: (tap_element(d, "btn-delete-material"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-220", "Verify delete academic material action and confirmation [Background Resume]", lambda d: (tap_element(d, "btn-delete-material"), wait_for_element_visible(d, "dialog-confirm-delete"))),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
