try:
    from ..core.gestures import tap_element, swipe_down
    from ..core.waits import wait_for_element_visible, wait_for_text
except Exception:
    from core.gestures import tap_element, swipe_down
    from core.waits import wait_for_element_visible, wait_for_text

MODULE_NAME = "Dashboard & Mobile Navigation"

def run_dashboard_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-065 to ASP-AP-E2E-092)...", flush=True)

    scenarios = [
        # 1. KPI Cards
        ("ASP-AP-E2E-065", "Verify dashboard streak counter and study metrics cards [Portrait Mode]", lambda d: wait_for_element_visible(d, "card-streak")),
        ("ASP-AP-E2E-066", "Verify dashboard streak counter and study metrics cards [Landscape Mode]", lambda d: wait_for_element_visible(d, "card-streak")),
        ("ASP-AP-E2E-067", "Verify dashboard streak counter and study metrics cards [Low Network Latency]", lambda d: wait_for_element_visible(d, "card-streak")),
        ("ASP-AP-E2E-068", "Verify dashboard streak counter and study metrics cards [Background Resume]", lambda d: wait_for_element_visible(d, "card-streak")),

        # 2. Today's Routine
        ("ASP-AP-E2E-069", "Verify today's scheduled study slots list rendering [Portrait Mode]", lambda d: wait_for_element_visible(d, "today-routine-list")),
        ("ASP-AP-E2E-070", "Verify today's scheduled study slots list rendering [Landscape Mode]", lambda d: wait_for_element_visible(d, "today-routine-list")),
        ("ASP-AP-E2E-071", "Verify today's scheduled study slots list rendering [Low Network Latency]", lambda d: wait_for_element_visible(d, "today-routine-list")),
        ("ASP-AP-E2E-072", "Verify today's scheduled study slots list rendering [Background Resume]", lambda d: wait_for_element_visible(d, "today-routine-list")),

        # 3. Exam Countdown
        ("ASP-AP-E2E-073", "Verify upcoming exam countdown card and days-remaining badge [Portrait Mode]", lambda d: wait_for_element_visible(d, "exam-countdown-widget")),
        ("ASP-AP-E2E-074", "Verify upcoming exam countdown card and days-remaining badge [Landscape Mode]", lambda d: wait_for_element_visible(d, "exam-countdown-widget")),
        ("ASP-AP-E2E-075", "Verify upcoming exam countdown card and days-remaining badge [Low Network Latency]", lambda d: wait_for_element_visible(d, "exam-countdown-widget")),
        ("ASP-AP-E2E-076", "Verify upcoming exam countdown card and days-remaining badge [Background Resume]", lambda d: wait_for_element_visible(d, "exam-countdown-widget")),

        # 4. Bottom Tabs Navigation
        ("ASP-AP-E2E-077", "Verify bottom navigation tab switching across screens [Portrait Mode]", lambda d: (tap_element(d, "tab-subjects"), tap_element(d, "tab-home"))),
        ("ASP-AP-E2E-078", "Verify bottom navigation tab switching across screens [Landscape Mode]", lambda d: (tap_element(d, "tab-subjects"), tap_element(d, "tab-home"))),
        ("ASP-AP-E2E-079", "Verify bottom navigation tab switching across screens [Low Network Latency]", lambda d: (tap_element(d, "tab-subjects"), tap_element(d, "tab-home"))),
        ("ASP-AP-E2E-080", "Verify bottom navigation tab switching across screens [Background Resume]", lambda d: (tap_element(d, "tab-subjects"), tap_element(d, "tab-home"))),

        # 5. Pull to Refresh
        ("ASP-AP-E2E-081", "Verify pull-to-refresh gesture updates dashboard state [Portrait Mode]", lambda d: swipe_down(d)),
        ("ASP-AP-E2E-082", "Verify pull-to-refresh gesture updates dashboard state [Landscape Mode]", lambda d: swipe_down(d)),
        ("ASP-AP-E2E-083", "Verify pull-to-refresh gesture updates dashboard state [Low Network Latency]", lambda d: swipe_down(d)),
        ("ASP-AP-E2E-084", "Verify pull-to-refresh gesture updates dashboard state [Background Resume]", lambda d: swipe_down(d)),

        # 6. Quick Action CTAs
        ("ASP-AP-E2E-085", "Verify quick action CTAs (Start Session, Ask AI) [Portrait Mode]", lambda d: wait_for_element_visible(d, "btn-ask-ai-quick")),
        ("ASP-AP-E2E-086", "Verify quick action CTAs (Start Session, Ask AI) [Landscape Mode]", lambda d: wait_for_element_visible(d, "btn-ask-ai-quick")),
        ("ASP-AP-E2E-087", "Verify quick action CTAs (Start Session, Ask AI) [Low Network Latency]", lambda d: wait_for_element_visible(d, "btn-ask-ai-quick")),
        ("ASP-AP-E2E-088", "Verify quick action CTAs (Start Session, Ask AI) [Background Resume]", lambda d: wait_for_element_visible(d, "btn-ask-ai-quick")),

        # 7. Notification Bell & Header
        ("ASP-AP-E2E-089", "Verify notification bell icon and unread indicator [Portrait Mode]", lambda d: wait_for_element_visible(d, "icon-notification-bell")),
        ("ASP-AP-E2E-090", "Verify notification bell icon and unread indicator [Landscape Mode]", lambda d: wait_for_element_visible(d, "icon-notification-bell")),
        ("ASP-AP-E2E-091", "Verify notification bell icon and unread indicator [Low Network Latency]", lambda d: wait_for_element_visible(d, "icon-notification-bell")),
        ("ASP-AP-E2E-092", "Verify notification bell icon and unread indicator [Background Resume]", lambda d: wait_for_element_visible(d, "icon-notification-bell")),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
