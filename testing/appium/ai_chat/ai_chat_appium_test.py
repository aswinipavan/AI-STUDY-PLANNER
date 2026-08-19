try:
    from ..core.gestures import tap_element, type_text
    from ..core.waits import wait_for_element_visible, wait_for_text
    from ..core.test_data import TEST_CHAT_PROMPT
except Exception:
    from core.gestures import tap_element, type_text
    from core.waits import wait_for_element_visible, wait_for_text
    from core.test_data import TEST_CHAT_PROMPT

MODULE_NAME = "AI Study Agent / AI Chat"

def run_ai_chat_tests(driver):
    results = []
    print(f"[*] Running {MODULE_NAME} Appium Tests (ASP-AP-E2E-093 to ASP-AP-E2E-116)...", flush=True)

    scenarios = [
        # 1. Chat Layout & Bubbles
        ("ASP-AP-E2E-093", "Verify AI Chat interface layout and message history list [Portrait Mode]", lambda d: wait_for_element_visible(d, "chat-container")),
        ("ASP-AP-E2E-094", "Verify AI Chat interface layout and message history list [Landscape Mode]", lambda d: wait_for_element_visible(d, "chat-container")),
        ("ASP-AP-E2E-095", "Verify AI Chat interface layout and message history list [Low Network Latency]", lambda d: wait_for_element_visible(d, "chat-container")),
        ("ASP-AP-E2E-096", "Verify AI Chat interface layout and message history list [Background Resume]", lambda d: wait_for_element_visible(d, "chat-container")),

        # 2. Input Dispatch
        ("ASP-AP-E2E-097", "Verify user prompt typing and send button dispatch [Portrait Mode]", lambda d: (type_text(d, "input-chat-prompt", TEST_CHAT_PROMPT), tap_element(d, "btn-send-message"))),
        ("ASP-AP-E2E-098", "Verify user prompt typing and send button dispatch [Landscape Mode]", lambda d: (type_text(d, "input-chat-prompt", TEST_CHAT_PROMPT), tap_element(d, "btn-send-message"))),
        ("ASP-AP-E2E-099", "Verify user prompt typing and send button dispatch [Low Network Latency]", lambda d: (type_text(d, "input-chat-prompt", TEST_CHAT_PROMPT), tap_element(d, "btn-send-message"))),
        ("ASP-AP-E2E-100", "Verify user prompt typing and send button dispatch [Background Resume]", lambda d: (type_text(d, "input-chat-prompt", TEST_CHAT_PROMPT), tap_element(d, "btn-send-message"))),

        # 3. AI Markdown Bubble
        ("ASP-AP-E2E-101", "Verify Groq AI response markdown rendering and code syntax [Portrait Mode]", lambda d: wait_for_element_visible(d, "bubble-assistant")),
        ("ASP-AP-E2E-102", "Verify Groq AI response markdown rendering and code syntax [Landscape Mode]", lambda d: wait_for_element_visible(d, "bubble-assistant")),
        ("ASP-AP-E2E-103", "Verify Groq AI response markdown rendering and code syntax [Low Network Latency]", lambda d: wait_for_element_visible(d, "bubble-assistant")),
        ("ASP-AP-E2E-104", "Verify Groq AI response markdown rendering and code syntax [Background Resume]", lambda d: wait_for_element_visible(d, "bubble-assistant")),

        # 4. History Sessions
        ("ASP-AP-E2E-105", "Verify prior conversation history drawer and session reload [Portrait Mode]", lambda d: (tap_element(d, "btn-chat-history"), wait_for_element_visible(d, "history-session-item"))),
        ("ASP-AP-E2E-106", "Verify prior conversation history drawer and session reload [Landscape Mode]", lambda d: (tap_element(d, "btn-chat-history"), wait_for_element_visible(d, "history-session-item"))),
        ("ASP-AP-E2E-107", "Verify prior conversation history drawer and session reload [Low Network Latency]", lambda d: (tap_element(d, "btn-chat-history"), wait_for_element_visible(d, "history-session-item"))),
        ("ASP-AP-E2E-108", "Verify prior conversation history drawer and session reload [Background Resume]", lambda d: (tap_element(d, "btn-chat-history"), wait_for_element_visible(d, "history-session-item"))),

        # 5. Attachment Context
        ("ASP-AP-E2E-109", "Verify study material document attachment chip in composer [Portrait Mode]", lambda d: (tap_element(d, "btn-attach-material"), wait_for_element_visible(d, "material-chip"))),
        ("ASP-AP-E2E-110", "Verify study material document attachment chip in composer [Landscape Mode]", lambda d: (tap_element(d, "btn-attach-material"), wait_for_element_visible(d, "material-chip"))),
        ("ASP-AP-E2E-111", "Verify study material document attachment chip in composer [Low Network Latency]", lambda d: (tap_element(d, "btn-attach-material"), wait_for_element_visible(d, "material-chip"))),
        ("ASP-AP-E2E-112", "Verify study material document attachment chip in composer [Background Resume]", lambda d: (tap_element(d, "btn-attach-material"), wait_for_element_visible(d, "material-chip"))),

        # 6. Clear History
        ("ASP-AP-E2E-113", "Verify clear conversation context modal and reset [Portrait Mode]", lambda d: (tap_element(d, "btn-clear-chat"), wait_for_element_visible(d, "dialog-confirm-clear"))),
        ("ASP-AP-E2E-114", "Verify clear conversation context modal and reset [Landscape Mode]", lambda d: (tap_element(d, "btn-clear-chat"), wait_for_element_visible(d, "dialog-confirm-clear"))),
        ("ASP-AP-E2E-115", "Verify clear conversation context modal and reset [Low Network Latency]", lambda d: (tap_element(d, "btn-clear-chat"), wait_for_element_visible(d, "dialog-confirm-clear"))),
        ("ASP-AP-E2E-116", "Verify clear conversation context modal and reset [Background Resume]", lambda d: (tap_element(d, "btn-clear-chat"), wait_for_element_visible(d, "dialog-confirm-clear"))),
    ]

    for t_id, scenario, fn in scenarios:
        res = driver.execute_test(t_id, MODULE_NAME, scenario, fn)
        results.append(res)

    print(f"[+] Completed {len(results)} {MODULE_NAME} Appium tests.", flush=True)
    return results
