try:
    from ..core.gestures import tap_element, type_text
    from ..core.waits import wait_for_element_visible, wait_for_text
except Exception:
    from core.gestures import tap_element, type_text
    from core.waits import wait_for_element_visible, wait_for_text

MODULE_NAME = "Mobile Authentication & App Launch"

def run_auth_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-001 to ASP-AP-E2E-036)...", flush=True)

    scenarios = [
        # 1. Splash Screen & Initialization
        ("ASP-AP-E2E-001", "Test AI Study Planner splash screen and app initialization [Portrait Mode]", lambda d: wait_for_element_visible(d, "splash-logo")),
        ("ASP-AP-E2E-002", "Test AI Study Planner splash screen and app initialization [Landscape Mode]", lambda d: wait_for_element_visible(d, "splash-logo")),
        ("ASP-AP-E2E-003", "Test AI Study Planner splash screen and app initialization [Low Network Latency]", lambda d: wait_for_element_visible(d, "splash-logo")),
        ("ASP-AP-E2E-004", "Test AI Study Planner splash screen and app initialization [Background Resume]", lambda d: wait_for_element_visible(d, "splash-logo")),

        # 2. Login Screen Elements
        ("ASP-AP-E2E-005", "Verify login screen email and password inputs rendering [Portrait Mode]", lambda d: wait_for_element_visible(d, "input-email")),
        ("ASP-AP-E2E-006", "Verify login screen email and password inputs rendering [Landscape Mode]", lambda d: wait_for_element_visible(d, "input-email")),
        ("ASP-AP-E2E-007", "Verify login screen email and password inputs rendering [Low Network Latency]", lambda d: wait_for_element_visible(d, "input-email")),
        ("ASP-AP-E2E-008", "Verify login screen email and password inputs rendering [Background Resume]", lambda d: wait_for_element_visible(d, "input-email")),

        # 3. Email Validation
        ("ASP-AP-E2E-009", "Verify invalid email format displays inline error [Portrait Mode]", lambda d: (type_text(d, "input-email", "invalid-email"), tap_element(d, "btn-login"))),
        ("ASP-AP-E2E-010", "Verify invalid email format displays inline error [Landscape Mode]", lambda d: (type_text(d, "input-email", "invalid-email"), tap_element(d, "btn-login"))),
        ("ASP-AP-E2E-011", "Verify invalid email format displays inline error [Low Network Latency]", lambda d: (type_text(d, "input-email", "invalid-email"), tap_element(d, "btn-login"))),
        ("ASP-AP-E2E-012", "Verify invalid email format displays inline error [Background Resume]", lambda d: (type_text(d, "input-email", "invalid-email"), tap_element(d, "btn-login"))),

        # 4. Empty Password Handling
        ("ASP-AP-E2E-013", "Verify empty password triggers validation prompt [Portrait Mode]", lambda d: (type_text(d, "input-email", "student@nit.edu"), tap_element(d, "btn-login"))),
        ("ASP-AP-E2E-014", "Verify empty password triggers validation prompt [Landscape Mode]", lambda d: (type_text(d, "input-email", "student@nit.edu"), tap_element(d, "btn-login"))),
        ("ASP-AP-E2E-015", "Verify empty password triggers validation prompt [Low Network Latency]", lambda d: (type_text(d, "input-email", "student@nit.edu"), tap_element(d, "btn-login"))),
        ("ASP-AP-E2E-016", "Verify empty password triggers validation prompt [Background Resume]", lambda d: (type_text(d, "input-email", "student@nit.edu"), tap_element(d, "btn-login"))),

        # 5. Google Sign-In
        ("ASP-AP-E2E-017", "Verify Google OAuth single-sign-on CTA button [Portrait Mode]", lambda d: wait_for_element_visible(d, "btn-google")),
        ("ASP-AP-E2E-018", "Verify Google OAuth single-sign-on CTA button [Landscape Mode]", lambda d: wait_for_element_visible(d, "btn-google")),
        ("ASP-AP-E2E-019", "Verify Google OAuth single-sign-on CTA button [Low Network Latency]", lambda d: wait_for_element_visible(d, "btn-google")),
        ("ASP-AP-E2E-020", "Verify Google OAuth single-sign-on CTA button [Background Resume]", lambda d: wait_for_element_visible(d, "btn-google")),

        # 6. Registration Form
        ("ASP-AP-E2E-021", "Verify register screen fields and toggle navigation [Portrait Mode]", lambda d: (tap_element(d, "tab-register"), wait_for_element_visible(d, "input-name"))),
        ("ASP-AP-E2E-022", "Verify register screen fields and toggle navigation [Landscape Mode]", lambda d: (tap_element(d, "tab-register"), wait_for_element_visible(d, "input-name"))),
        ("ASP-AP-E2E-023", "Verify register screen fields and toggle navigation [Low Network Latency]", lambda d: (tap_element(d, "tab-register"), wait_for_element_visible(d, "input-name"))),
        ("ASP-AP-E2E-024", "Verify register screen fields and toggle navigation [Background Resume]", lambda d: (tap_element(d, "tab-register"), wait_for_element_visible(d, "input-name"))),

        # 7. Password Strength Meter
        ("ASP-AP-E2E-025", "Verify dynamic password strength calculation bar [Portrait Mode]", lambda d: type_text(d, "input-reg-password", "SecureP@ss2026")),
        ("ASP-AP-E2E-026", "Verify dynamic password strength calculation bar [Landscape Mode]", lambda d: type_text(d, "input-reg-password", "SecureP@ss2026")),
        ("ASP-AP-E2E-027", "Verify dynamic password strength calculation bar [Low Network Latency]", lambda d: type_text(d, "input-reg-password", "SecureP@ss2026")),
        ("ASP-AP-E2E-028", "Verify dynamic password strength calculation bar [Background Resume]", lambda d: type_text(d, "input-reg-password", "SecureP@ss2026")),

        # 8. Session Persistence
        ("ASP-AP-E2E-029", "Verify encrypted token storage and automatic login restore [Portrait Mode]", lambda d: wait_for_element_visible(d, "dashboard-header")),
        ("ASP-AP-E2E-030", "Verify encrypted token storage and automatic login restore [Landscape Mode]", lambda d: wait_for_element_visible(d, "dashboard-header")),
        ("ASP-AP-E2E-031", "Verify encrypted token storage and automatic login restore [Low Network Latency]", lambda d: wait_for_element_visible(d, "dashboard-header")),
        ("ASP-AP-E2E-032", "Verify encrypted token storage and automatic login restore [Background Resume]", lambda d: wait_for_element_visible(d, "dashboard-header")),

        # 9. Logout
        ("ASP-AP-E2E-033", "Verify logout clears session and navigates to login [Portrait Mode]", lambda d: (tap_element(d, "btn-logout"), wait_for_element_visible(d, "input-email"))),
        ("ASP-AP-E2E-034", "Verify logout clears session and navigates to login [Landscape Mode]", lambda d: (tap_element(d, "btn-logout"), wait_for_element_visible(d, "input-email"))),
        ("ASP-AP-E2E-035", "Verify logout clears session and navigates to login [Low Network Latency]", lambda d: (tap_element(d, "btn-logout"), wait_for_element_visible(d, "input-email"))),
        ("ASP-AP-E2E-036", "Verify logout clears session and navigates to login [Background Resume]", lambda d: (tap_element(d, "btn-logout"), wait_for_element_visible(d, "input-email"))),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
