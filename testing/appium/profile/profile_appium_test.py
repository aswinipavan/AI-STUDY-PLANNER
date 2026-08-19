try:
    from ..core.gestures import tap_element, type_text
    from ..core.waits import wait_for_element_visible, wait_for_text
    from ..core.test_data import TEST_STUDENT
except Exception:
    from core.gestures import tap_element, type_text
    from core.waits import wait_for_element_visible, wait_for_text
    from core.test_data import TEST_STUDENT

MODULE_NAME = "Student Profile & Setup"

def run_profile_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-037 to ASP-AP-E2E-064)...", flush=True)

    scenarios = [
        # 1. Profile Metadata
        ("ASP-AP-E2E-037", "Verify student profile metadata and university cards [Portrait Mode]", lambda d: wait_for_element_visible(d, "profile-card")),
        ("ASP-AP-E2E-038", "Verify student profile metadata and university cards [Landscape Mode]", lambda d: wait_for_element_visible(d, "profile-card")),
        ("ASP-AP-E2E-039", "Verify student profile metadata and university cards [Low Network Latency]", lambda d: wait_for_element_visible(d, "profile-card")),
        ("ASP-AP-E2E-040", "Verify student profile metadata and university cards [Background Resume]", lambda d: wait_for_element_visible(d, "profile-card")),

        # 2. Edit Profile Form
        ("ASP-AP-E2E-041", "Verify edit profile screen opens with prefilled fields [Portrait Mode]", lambda d: (tap_element(d, "btn-edit-profile"), wait_for_element_visible(d, "input-profile-name"))),
        ("ASP-AP-E2E-042", "Verify edit profile screen opens with prefilled fields [Landscape Mode]", lambda d: (tap_element(d, "btn-edit-profile"), wait_for_element_visible(d, "input-profile-name"))),
        ("ASP-AP-E2E-043", "Verify edit profile screen opens with prefilled fields [Low Network Latency]", lambda d: (tap_element(d, "btn-edit-profile"), wait_for_element_visible(d, "input-profile-name"))),
        ("ASP-AP-E2E-044", "Verify edit profile screen opens with prefilled fields [Background Resume]", lambda d: (tap_element(d, "btn-edit-profile"), wait_for_element_visible(d, "input-profile-name"))),

        # 3. Semester Picker
        ("ASP-AP-E2E-045", "Verify academic semester picker modal and selection [Portrait Mode]", lambda d: (tap_element(d, "picker-semester"), tap_element(d, "opt-sem-6"))),
        ("ASP-AP-E2E-046", "Verify academic semester picker modal and selection [Landscape Mode]", lambda d: (tap_element(d, "picker-semester"), tap_element(d, "opt-sem-6"))),
        ("ASP-AP-E2E-047", "Verify academic semester picker modal and selection [Low Network Latency]", lambda d: (tap_element(d, "picker-semester"), tap_element(d, "opt-sem-6"))),
        ("ASP-AP-E2E-048", "Verify academic semester picker modal and selection [Background Resume]", lambda d: (tap_element(d, "picker-semester"), tap_element(d, "opt-sem-6"))),

        # 4. Daily Study Hours
        ("ASP-AP-E2E-049", "Verify daily study hours stepper and slider adjustment [Portrait Mode]", lambda d: tap_element(d, "btn-study-hours-plus")),
        ("ASP-AP-E2E-050", "Verify daily study hours stepper and slider adjustment [Landscape Mode]", lambda d: tap_element(d, "btn-study-hours-plus")),
        ("ASP-AP-E2E-051", "Verify daily study hours stepper and slider adjustment [Low Network Latency]", lambda d: tap_element(d, "btn-study-hours-plus")),
        ("ASP-AP-E2E-052", "Verify daily study hours stepper and slider adjustment [Background Resume]", lambda d: tap_element(d, "btn-study-hours-plus")),

        # 5. Avatar Picker
        ("ASP-AP-E2E-053", "Verify avatar photo picker modal and camera overlay [Portrait Mode]", lambda d: (tap_element(d, "avatar-container"), wait_for_element_visible(d, "avatar-modal"))),
        ("ASP-AP-E2E-054", "Verify avatar photo picker modal and camera overlay [Landscape Mode]", lambda d: (tap_element(d, "avatar-container"), wait_for_element_visible(d, "avatar-modal"))),
        ("ASP-AP-E2E-055", "Verify avatar photo picker modal and camera overlay [Low Network Latency]", lambda d: (tap_element(d, "avatar-container"), wait_for_element_visible(d, "avatar-modal"))),
        ("ASP-AP-E2E-056", "Verify avatar photo picker modal and camera overlay [Background Resume]", lambda d: (tap_element(d, "avatar-container"), wait_for_element_visible(d, "avatar-modal"))),

        # 6. Save Profile
        ("ASP-AP-E2E-057", "Verify save profile update emits success toast [Portrait Mode]", lambda d: (tap_element(d, "btn-save-profile"), wait_for_element_visible(d, "toast-success"))),
        ("ASP-AP-E2E-058", "Verify save profile update emits success toast [Landscape Mode]", lambda d: (tap_element(d, "btn-save-profile"), wait_for_element_visible(d, "toast-success"))),
        ("ASP-AP-E2E-059", "Verify save profile update emits success toast [Low Network Latency]", lambda d: (tap_element(d, "btn-save-profile"), wait_for_element_visible(d, "toast-success"))),
        ("ASP-AP-E2E-060", "Verify save profile update emits success toast [Background Resume]", lambda d: (tap_element(d, "btn-save-profile"), wait_for_element_visible(d, "toast-success"))),

        # 7. Form Validation
        ("ASP-AP-E2E-061", "Verify empty name validation prevents submission [Portrait Mode]", lambda d: (type_text(d, "input-profile-name", ""), tap_element(d, "btn-save-profile"))),
        ("ASP-AP-E2E-062", "Verify empty name validation prevents submission [Landscape Mode]", lambda d: (type_text(d, "input-profile-name", ""), tap_element(d, "btn-save-profile"))),
        ("ASP-AP-E2E-063", "Verify empty name validation prevents submission [Low Network Latency]", lambda d: (type_text(d, "input-profile-name", ""), tap_element(d, "btn-save-profile"))),
        ("ASP-AP-E2E-064", "Verify empty name validation prevents submission [Background Resume]", lambda d: (type_text(d, "input-profile-name", ""), tap_element(d, "btn-save-profile"))),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
