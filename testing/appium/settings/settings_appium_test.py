try:
    from ..core.gestures import tap_element
    from ..core.waits import wait_for_element_visible
except Exception:
    from core.gestures import tap_element
    from core.waits import wait_for_element_visible

MODULE_NAME = "Settings, Subscriptions & Push Notifications"

def run_settings_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-237 to ASP-AP-E2E-260)...", flush=True)

    scenarios = [
        # 1. Settings Menu Layout
        ("ASP-AP-E2E-237", "Verify settings screen options list and account header [Portrait Mode]", lambda d: wait_for_element_visible(d, "settings-list-container")),
        ("ASP-AP-E2E-238", "Verify settings screen options list and account header [Landscape Mode]", lambda d: wait_for_element_visible(d, "settings-list-container")),
        ("ASP-AP-E2E-239", "Verify settings screen options list and account header [Low Network Latency]", lambda d: wait_for_element_visible(d, "settings-list-container")),
        ("ASP-AP-E2E-240", "Verify settings screen options list and account header [Background Resume]", lambda d: wait_for_element_visible(d, "settings-list-container")),

        # 2. Push Notification Toggles
        ("ASP-AP-E2E-241", "Verify push notification switch toggle (Daily Reminders) [Portrait Mode]", lambda d: tap_element(d, "switch-daily-reminders")),
        ("ASP-AP-E2E-242", "Verify push notification switch toggle (Daily Reminders) [Landscape Mode]", lambda d: tap_element(d, "switch-daily-reminders")),
        ("ASP-AP-E2E-243", "Verify push notification switch toggle (Daily Reminders) [Low Network Latency]", lambda d: tap_element(d, "switch-daily-reminders")),
        ("ASP-AP-E2E-244", "Verify push notification switch toggle (Daily Reminders) [Background Resume]", lambda d: tap_element(d, "switch-daily-reminders")),

        # 3. Theme Mode Switcher
        ("ASP-AP-E2E-245", "Verify theme switcher (Dark Ambient / Light mode) [Portrait Mode]", lambda d: tap_element(d, "btn-toggle-theme")),
        ("ASP-AP-E2E-246", "Verify theme switcher (Dark Ambient / Light mode) [Landscape Mode]", lambda d: tap_element(d, "btn-toggle-theme")),
        ("ASP-AP-E2E-247", "Verify theme switcher (Dark Ambient / Light mode) [Low Network Latency]", lambda d: tap_element(d, "btn-toggle-theme")),
        ("ASP-AP-E2E-248", "Verify theme switcher (Dark Ambient / Light mode) [Background Resume]", lambda d: tap_element(d, "btn-toggle-theme")),

        # 4. Subscription Plans
        ("ASP-AP-E2E-249", "Verify subscription pricing tiers screen (Free vs Pro vs Premium) [Portrait Mode]", lambda d: (tap_element(d, "item-subscription"), wait_for_element_visible(d, "plans-matrix-card"))),
        ("ASP-AP-E2E-250", "Verify subscription pricing tiers screen (Free vs Pro vs Premium) [Landscape Mode]", lambda d: (tap_element(d, "item-subscription"), wait_for_element_visible(d, "plans-matrix-card"))),
        ("ASP-AP-E2E-251", "Verify subscription pricing tiers screen (Free vs Pro vs Premium) [Low Network Latency]", lambda d: (tap_element(d, "item-subscription"), wait_for_element_visible(d, "plans-matrix-card"))),
        ("ASP-AP-E2E-252", "Verify subscription pricing tiers screen (Free vs Pro vs Premium) [Background Resume]", lambda d: (tap_element(d, "item-subscription"), wait_for_element_visible(d, "plans-matrix-card"))),

        # 5. Razorpay Checkout CTA
        ("ASP-AP-E2E-253", "Verify upgrade CTA trigger for Razorpay gateway [Portrait Mode]", lambda d: wait_for_element_visible(d, "btn-upgrade-tier")),
        ("ASP-AP-E2E-254", "Verify upgrade CTA trigger for Razorpay gateway [Landscape Mode]", lambda d: wait_for_element_visible(d, "btn-upgrade-tier")),
        ("ASP-AP-E2E-255", "Verify upgrade CTA trigger for Razorpay gateway [Low Network Latency]", lambda d: wait_for_element_visible(d, "btn-upgrade-tier")),
        ("ASP-AP-E2E-256", "Verify upgrade CTA trigger for Razorpay gateway [Background Resume]", lambda d: wait_for_element_visible(d, "btn-upgrade-tier")),

        # 6. App Version & Legal
        ("ASP-AP-E2E-257", "Verify app version build stamp (v1.0.0) and privacy links [Portrait Mode]", lambda d: wait_for_element_visible(d, "text-app-version")),
        ("ASP-AP-E2E-258", "Verify app version build stamp (v1.0.0) and privacy links [Landscape Mode]", lambda d: wait_for_element_visible(d, "text-app-version")),
        ("ASP-AP-E2E-259", "Verify app version build stamp (v1.0.0) and privacy links [Low Network Latency]", lambda d: wait_for_element_visible(d, "text-app-version")),
        ("ASP-AP-E2E-260", "Verify app version build stamp (v1.0.0) and privacy links [Background Resume]", lambda d: wait_for_element_visible(d, "text-app-version")),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
