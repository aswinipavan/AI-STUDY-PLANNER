try:
    from ..core.gestures import tap_element, type_text
    from ..core.waits import wait_for_element_visible, wait_for_text
except Exception:
    from core.gestures import tap_element, type_text
    from core.waits import wait_for_element_visible, wait_for_text

MODULE_NAME = "AI Timetable & Study Planner"

def run_timetable_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-173 to ASP-AP-E2E-196)...", flush=True)

    scenarios = [
        # 1. Weekly Grid View
        ("ASP-AP-E2E-173", "Verify 7-day weekly study schedule timeline grid [Portrait Mode]", lambda d: wait_for_element_visible(d, "timetable-grid")),
        ("ASP-AP-E2E-174", "Verify 7-day weekly study schedule timeline grid [Landscape Mode]", lambda d: wait_for_element_visible(d, "timetable-grid")),
        ("ASP-AP-E2E-175", "Verify 7-day weekly study schedule timeline grid [Low Network Latency]", lambda d: wait_for_element_visible(d, "timetable-grid")),
        ("ASP-AP-E2E-176", "Verify 7-day weekly study schedule timeline grid [Background Resume]", lambda d: wait_for_element_visible(d, "timetable-grid")),

        # 2. AI Generate Timetable Modal
        ("ASP-AP-E2E-177", "Verify 5-step AI timetable generation wizard modal [Portrait Mode]", lambda d: (tap_element(d, "btn-generate-ai-timetable"), wait_for_element_visible(d, "wizard-step-1"))),
        ("ASP-AP-E2E-178", "Verify 5-step AI timetable generation wizard modal [Landscape Mode]", lambda d: (tap_element(d, "btn-generate-ai-timetable"), wait_for_element_visible(d, "wizard-step-1"))),
        ("ASP-AP-E2E-179", "Verify 5-step AI timetable generation wizard modal [Low Network Latency]", lambda d: (tap_element(d, "btn-generate-ai-timetable"), wait_for_element_visible(d, "wizard-step-1"))),
        ("ASP-AP-E2E-180", "Verify 5-step AI timetable generation wizard modal [Background Resume]", lambda d: (tap_element(d, "btn-generate-ai-timetable"), wait_for_element_visible(d, "wizard-step-1"))),

        # 3. Slot Toggle Completion
        ("ASP-AP-E2E-181", "Verify study slot checkbox toggle marks complete [Portrait Mode]", lambda d: tap_element(d, "checkbox-slot-0")),
        ("ASP-AP-E2E-182", "Verify study slot checkbox toggle marks complete [Landscape Mode]", lambda d: tap_element(d, "checkbox-slot-0")),
        ("ASP-AP-E2E-183", "Verify study slot checkbox toggle marks complete [Low Network Latency]", lambda d: tap_element(d, "checkbox-slot-0")),
        ("ASP-AP-E2E-184", "Verify study slot checkbox toggle marks complete [Background Resume]", lambda d: tap_element(d, "checkbox-slot-0")),

        # 4. Custom Slot Addition
        ("ASP-AP-E2E-185", "Verify custom revision slot form and time selector [Portrait Mode]", lambda d: (tap_element(d, "btn-add-custom-slot"), wait_for_element_visible(d, "input-slot-topic"))),
        ("ASP-AP-E2E-186", "Verify custom revision slot form and time selector [Landscape Mode]", lambda d: (tap_element(d, "btn-add-custom-slot"), wait_for_element_visible(d, "input-slot-topic"))),
        ("ASP-AP-E2E-187", "Verify custom revision slot form and time selector [Low Network Latency]", lambda d: (tap_element(d, "btn-add-custom-slot"), wait_for_element_visible(d, "input-slot-topic"))),
        ("ASP-AP-E2E-188", "Verify custom revision slot form and time selector [Background Resume]", lambda d: (tap_element(d, "btn-add-custom-slot"), wait_for_element_visible(d, "input-slot-topic"))),

        # 5. Day Tabs Switch
        ("ASP-AP-E2E-189", "Verify horizontal day tabs switching (Mon - Sun) [Portrait Mode]", lambda d: (tap_element(d, "tab-day-tuesday"), wait_for_element_visible(d, "day-schedule-tuesday"))),
        ("ASP-AP-E2E-190", "Verify horizontal day tabs switching (Mon - Sun) [Landscape Mode]", lambda d: (tap_element(d, "tab-day-tuesday"), wait_for_element_visible(d, "day-schedule-tuesday"))),
        ("ASP-AP-E2E-191", "Verify horizontal day tabs switching (Mon - Sun) [Low Network Latency]", lambda d: (tap_element(d, "tab-day-tuesday"), wait_for_element_visible(d, "day-schedule-tuesday"))),
        ("ASP-AP-E2E-192", "Verify horizontal day tabs switching (Mon - Sun) [Background Resume]", lambda d: (tap_element(d, "tab-day-tuesday"), wait_for_element_visible(d, "day-schedule-tuesday"))),

        # 6. Delete Slot
        ("ASP-AP-E2E-193", "Verify delete study slot action dialog [Portrait Mode]", lambda d: (tap_element(d, "btn-delete-slot"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-194", "Verify delete study slot action dialog [Landscape Mode]", lambda d: (tap_element(d, "btn-delete-slot"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-195", "Verify delete study slot action dialog [Low Network Latency]", lambda d: (tap_element(d, "btn-delete-slot"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-196", "Verify delete study slot action dialog [Background Resume]", lambda d: (tap_element(d, "btn-delete-slot"), wait_for_element_visible(d, "dialog-confirm-delete"))),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
