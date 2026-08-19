try:
    from ..core.gestures import tap_element, type_text
    from ..core.waits import wait_for_element_visible, wait_for_text
    from ..core.test_data import TEST_SUBJECT
except Exception:
    from core.gestures import tap_element, type_text
    from core.waits import wait_for_element_visible, wait_for_text
    from core.test_data import TEST_SUBJECT

MODULE_NAME = "Subjects & Academic Performance"

def run_subjects_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-117 to ASP-AP-E2E-144)...", flush=True)

    scenarios = [
        # 1. Subjects List
        ("ASP-AP-E2E-117", "Verify enrolled academic subjects catalog list [Portrait Mode]", lambda d: wait_for_element_visible(d, "subjects-list-container")),
        ("ASP-AP-E2E-118", "Verify enrolled academic subjects catalog list [Landscape Mode]", lambda d: wait_for_element_visible(d, "subjects-list-container")),
        ("ASP-AP-E2E-119", "Verify enrolled academic subjects catalog list [Low Network Latency]", lambda d: wait_for_element_visible(d, "subjects-list-container")),
        ("ASP-AP-E2E-120", "Verify enrolled academic subjects catalog list [Background Resume]", lambda d: wait_for_element_visible(d, "subjects-list-container")),

        # 2. Add Subject Modal
        ("ASP-AP-E2E-121", "Verify add new subject modal input fields [Portrait Mode]", lambda d: (tap_element(d, "btn-add-subject"), wait_for_element_visible(d, "input-subject-name"))),
        ("ASP-AP-E2E-122", "Verify add new subject modal input fields [Landscape Mode]", lambda d: (tap_element(d, "btn-add-subject"), wait_for_element_visible(d, "input-subject-name"))),
        ("ASP-AP-E2E-123", "Verify add new subject modal input fields [Low Network Latency]", lambda d: (tap_element(d, "btn-add-subject"), wait_for_element_visible(d, "input-subject-name"))),
        ("ASP-AP-E2E-124", "Verify add new subject modal input fields [Background Resume]", lambda d: (tap_element(d, "btn-add-subject"), wait_for_element_visible(d, "input-subject-name"))),

        # 3. Difficulty Selector
        ("ASP-AP-E2E-125", "Verify subject difficulty rating selector (1-5 level) [Portrait Mode]", lambda d: tap_element(d, "star-difficulty-4")),
        ("ASP-AP-E2E-126", "Verify subject difficulty rating selector (1-5 level) [Landscape Mode]", lambda d: tap_element(d, "star-difficulty-4")),
        ("ASP-AP-E2E-127", "Verify subject difficulty rating selector (1-5 level) [Low Network Latency]", lambda d: tap_element(d, "star-difficulty-4")),
        ("ASP-AP-E2E-128", "Verify subject difficulty rating selector (1-5 level) [Background Resume]", lambda d: tap_element(d, "star-difficulty-4")),

        # 4. Marks Progress Badge
        ("ASP-AP-E2E-129", "Verify subject marks percentage and grade badge [Portrait Mode]", lambda d: wait_for_element_visible(d, "badge-subject-grade")),
        ("ASP-AP-E2E-130", "Verify subject marks percentage and grade badge [Landscape Mode]", lambda d: wait_for_element_visible(d, "badge-subject-grade")),
        ("ASP-AP-E2E-131", "Verify subject marks percentage and grade badge [Low Network Latency]", lambda d: wait_for_element_visible(d, "badge-subject-grade")),
        ("ASP-AP-E2E-132", "Verify subject marks percentage and grade badge [Background Resume]", lambda d: wait_for_element_visible(d, "badge-subject-grade")),

        # 5. Weak Subject Flag
        ("ASP-AP-E2E-133", "Verify weak subject automatic flag and priority tag [Portrait Mode]", lambda d: wait_for_element_visible(d, "tag-weak-priority")),
        ("ASP-AP-E2E-134", "Verify weak subject automatic flag and priority tag [Landscape Mode]", lambda d: wait_for_element_visible(d, "tag-weak-priority")),
        ("ASP-AP-E2E-135", "Verify weak subject automatic flag and priority tag [Low Network Latency]", lambda d: wait_for_element_visible(d, "tag-weak-priority")),
        ("ASP-AP-E2E-136", "Verify weak subject automatic flag and priority tag [Background Resume]", lambda d: wait_for_element_visible(d, "tag-weak-priority")),

        # 6. Edit Subject
        ("ASP-AP-E2E-137", "Verify edit subject form and credits modification [Portrait Mode]", lambda d: (tap_element(d, "btn-edit-subject"), wait_for_element_visible(d, "input-subject-credits"))),
        ("ASP-AP-E2E-138", "Verify edit subject form and credits modification [Landscape Mode]", lambda d: (tap_element(d, "btn-edit-subject"), wait_for_element_visible(d, "input-subject-credits"))),
        ("ASP-AP-E2E-139", "Verify edit subject form and credits modification [Low Network Latency]", lambda d: (tap_element(d, "btn-edit-subject"), wait_for_element_visible(d, "input-subject-credits"))),
        ("ASP-AP-E2E-140", "Verify edit subject form and credits modification [Background Resume]", lambda d: (tap_element(d, "btn-edit-subject"), wait_for_element_visible(d, "input-subject-credits"))),

        # 7. Delete Subject
        ("ASP-AP-E2E-141", "Verify delete subject alert dialog and item removal [Portrait Mode]", lambda d: (tap_element(d, "btn-delete-subject"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-142", "Verify delete subject alert dialog and item removal [Landscape Mode]", lambda d: (tap_element(d, "btn-delete-subject"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-143", "Verify delete subject alert dialog and item removal [Low Network Latency]", lambda d: (tap_element(d, "btn-delete-subject"), wait_for_element_visible(d, "dialog-confirm-delete"))),
        ("ASP-AP-E2E-144", "Verify delete subject alert dialog and item removal [Background Resume]", lambda d: (tap_element(d, "btn-delete-subject"), wait_for_element_visible(d, "dialog-confirm-delete"))),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
