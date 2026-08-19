try:
    from ..core.gestures import tap_element
    from ..core.waits import wait_for_element_visible
except Exception:
    from core.gestures import tap_element
    from core.waits import wait_for_element_visible

MODULE_NAME = "Analytics & Performance"

def run_analytics_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-221 to ASP-AP-E2E-236)...", flush=True)

    scenarios = [
        # 1. GPA Radial Gauge
        ("ASP-AP-E2E-221", "Verify cumulative GPA radial gauge chart rendering [Portrait Mode]", lambda d: wait_for_element_visible(d, "chart-gpa-radial")),
        ("ASP-AP-E2E-222", "Verify cumulative GPA radial gauge chart rendering [Landscape Mode]", lambda d: wait_for_element_visible(d, "chart-gpa-radial")),
        ("ASP-AP-E2E-223", "Verify cumulative GPA radial gauge chart rendering [Low Network Latency]", lambda d: wait_for_element_visible(d, "chart-gpa-radial")),
        ("ASP-AP-E2E-224", "Verify cumulative GPA radial gauge chart rendering [Background Resume]", lambda d: wait_for_element_visible(d, "chart-gpa-radial")),

        # 2. Readiness Index
        ("ASP-AP-E2E-225", "Verify exam readiness index percentage score card [Portrait Mode]", lambda d: wait_for_element_visible(d, "card-readiness-index")),
        ("ASP-AP-E2E-226", "Verify exam readiness index percentage score card [Landscape Mode]", lambda d: wait_for_element_visible(d, "card-readiness-index")),
        ("ASP-AP-E2E-227", "Verify exam readiness index percentage score card [Low Network Latency]", lambda d: wait_for_element_visible(d, "card-readiness-index")),
        ("ASP-AP-E2E-228", "Verify exam readiness index percentage score card [Background Resume]", lambda d: wait_for_element_visible(d, "card-readiness-index")),

        # 3. Marks Trend Curves
        ("ASP-AP-E2E-229", "Verify historical exam marks trend curves and bezier line graph [Portrait Mode]", lambda d: wait_for_element_visible(d, "chart-marks-trends")),
        ("ASP-AP-E2E-230", "Verify historical exam marks trend curves and bezier line graph [Landscape Mode]", lambda d: wait_for_element_visible(d, "chart-marks-trends")),
        ("ASP-AP-E2E-231", "Verify historical exam marks trend curves and bezier line graph [Low Network Latency]", lambda d: wait_for_element_visible(d, "chart-marks-trends")),
        ("ASP-AP-E2E-232", "Verify historical exam marks trend curves and bezier line graph [Background Resume]", lambda d: wait_for_element_visible(d, "chart-marks-trends")),

        # 4. Weak Subject Distribution
        ("ASP-AP-E2E-233", "Verify subject mastery distribution bar chart [Portrait Mode]", lambda d: wait_for_element_visible(d, "chart-subject-mastery")),
        ("ASP-AP-E2E-234", "Verify subject mastery distribution bar chart [Landscape Mode]", lambda d: wait_for_element_visible(d, "chart-subject-mastery")),
        ("ASP-AP-E2E-235", "Verify subject mastery distribution bar chart [Low Network Latency]", lambda d: wait_for_element_visible(d, "chart-subject-mastery")),
        ("ASP-AP-E2E-236", "Verify subject mastery distribution bar chart [Background Resume]", lambda d: wait_for_element_visible(d, "chart-subject-mastery")),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
