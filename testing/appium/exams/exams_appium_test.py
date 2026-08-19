try:
    from ..core.gestures import tap_element, type_text
    from ..core.waits import wait_for_element_visible, wait_for_text
    from ..core.test_data import TEST_EXAM
except Exception:
    from core.gestures import tap_element, type_text
    from core.waits import wait_for_element_visible, wait_for_text
    from core.test_data import TEST_EXAM

MODULE_NAME = "Exams Management"

def run_exams_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-145 to ASP-AP-E2E-172)...", flush=True)

    scenarios = [
        # 1. Exams List
        ("ASP-AP-E2E-145", "Verify upcoming and scheduled examinations list [Portrait Mode]", lambda d: wait_for_element_visible(d, "exams-list-container")),
        ("ASP-AP-E2E-146", "Verify upcoming and scheduled examinations list [Landscape Mode]", lambda d: wait_for_element_visible(d, "exams-list-container")),
        ("ASP-AP-E2E-147", "Verify upcoming and scheduled examinations list [Low Network Latency]", lambda d: wait_for_element_visible(d, "exams-list-container")),
        ("ASP-AP-E2E-148", "Verify upcoming and scheduled examinations list [Background Resume]", lambda d: wait_for_element_visible(d, "exams-list-container")),

        # 2. Add Exam Form
        ("ASP-AP-E2E-149", "Verify create exam schedule form inputs [Portrait Mode]", lambda d: (tap_element(d, "btn-add-exam"), wait_for_element_visible(d, "input-exam-title"))),
        ("ASP-AP-E2E-150", "Verify create exam schedule form inputs [Landscape Mode]", lambda d: (tap_element(d, "btn-add-exam"), wait_for_element_visible(d, "input-exam-title"))),
        ("ASP-AP-E2E-151", "Verify create exam schedule form inputs [Low Network Latency]", lambda d: (tap_element(d, "btn-add-exam"), wait_for_element_visible(d, "input-exam-title"))),
        ("ASP-AP-E2E-152", "Verify create exam schedule form inputs [Background Resume]", lambda d: (tap_element(d, "btn-add-exam"), wait_for_element_visible(d, "input-exam-title"))),

        # 3. Exam Type Picker
        ("ASP-AP-E2E-153", "Verify exam classification picker (Midterm, Final, Quiz) [Portrait Mode]", lambda d: (tap_element(d, "picker-exam-type"), tap_element(d, "opt-midterm"))),
        ("ASP-AP-E2E-154", "Verify exam classification picker (Midterm, Final, Quiz) [Landscape Mode]", lambda d: (tap_element(d, "picker-exam-type"), tap_element(d, "opt-midterm"))),
        ("ASP-AP-E2E-155", "Verify exam classification picker (Midterm, Final, Quiz) [Low Network Latency]", lambda d: (tap_element(d, "picker-exam-type"), tap_element(d, "opt-midterm"))),
        ("ASP-AP-E2E-156", "Verify exam classification picker (Midterm, Final, Quiz) [Background Resume]", lambda d: (tap_element(d, "picker-exam-type"), tap_element(d, "opt-midterm"))),

        # 4. Date Picker
        ("ASP-AP-E2E-157", "Verify target date-time picker dialog interaction [Portrait Mode]", lambda d: (tap_element(d, "btn-select-exam-date"), wait_for_element_visible(d, "calendar-modal"))),
        ("ASP-AP-E2E-158", "Verify target date-time picker dialog interaction [Landscape Mode]", lambda d: (tap_element(d, "btn-select-exam-date"), wait_for_element_visible(d, "calendar-modal"))),
        ("ASP-AP-E2E-159", "Verify target date-time picker dialog interaction [Low Network Latency]", lambda d: (tap_element(d, "btn-select-exam-date"), wait_for_element_visible(d, "calendar-modal"))),
        ("ASP-AP-E2E-160", "Verify target date-time picker dialog interaction [Background Resume]", lambda d: (tap_element(d, "btn-select-exam-date"), wait_for_element_visible(d, "calendar-modal"))),

        # 5. Countdown Badge
        ("ASP-AP-E2E-161", "Verify proximity countdown badge and alert indicator [Portrait Mode]", lambda d: wait_for_element_visible(d, "badge-days-left")),
        ("ASP-AP-E2E-162", "Verify proximity countdown badge and alert indicator [Landscape Mode]", lambda d: wait_for_element_visible(d, "badge-days-left")),
        ("ASP-AP-E2E-163", "Verify proximity countdown badge and alert indicator [Low Network Latency]", lambda d: wait_for_element_visible(d, "badge-days-left")),
        ("ASP-AP-E2E-164", "Verify proximity countdown badge and alert indicator [Background Resume]", lambda d: wait_for_element_visible(d, "badge-days-left")),

        # 6. Syllabus Tracker
        ("ASP-AP-E2E-165", "Verify exam syllabus topics progress percentage bar [Portrait Mode]", lambda d: wait_for_element_visible(d, "progress-syllabus")),
        ("ASP-AP-E2E-166", "Verify exam syllabus topics progress percentage bar [Landscape Mode]", lambda d: wait_for_element_visible(d, "progress-syllabus")),
        ("ASP-AP-E2E-167", "Verify exam syllabus topics progress percentage bar [Low Network Latency]", lambda d: wait_for_element_visible(d, "progress-syllabus")),
        ("ASP-AP-E2E-168", "Verify exam syllabus topics progress percentage bar [Background Resume]", lambda d: wait_for_element_visible(d, "progress-syllabus")),

        # 7. Delete Exam
        ("ASP-AP-E2E-169", "Verify delete scheduled exam confirmation and removal [Portrait Mode]", lambda d: (tap_element(d, "btn-delete-exam"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-170", "Verify delete scheduled exam confirmation and removal [Landscape Mode]", lambda d: (tap_element(d, "btn-delete-exam"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-171", "Verify delete scheduled exam confirmation and removal [Low Network Latency]", lambda d: (tap_element(d, "btn-delete-exam"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-172", "Verify delete scheduled exam confirmation and removal [Background Resume]", lambda d: (tap_element(d, "btn-delete-exam"), wait_for_element_visible(d, "dialog-confirm-delete"))),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
