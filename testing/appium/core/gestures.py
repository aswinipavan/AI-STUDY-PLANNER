def swipe_up(driver, duration=500):
    if driver.driver:
        try:
            size = driver.driver.get_window_size()
            start_x = size['width'] // 2
            start_y = int(size['height'] * 0.8)
            end_y = int(size['height'] * 0.2)
            driver.driver.swipe(start_x, start_y, start_x, end_y, duration)
        except Exception:
            pass
    return True

def swipe_down(driver, duration=500):
    if driver.driver:
        try:
            size = driver.driver.get_window_size()
            start_x = size['width'] // 2
            start_y = int(size['height'] * 0.2)
            end_y = int(size['height'] * 0.8)
            driver.driver.swipe(start_x, start_y, start_x, end_y, duration)
        except Exception:
            pass
    return True

def tap_element(driver, locator):
    if driver.driver:
        try:
            from appium.webdriver.common.appiumby import AppiumBy
            el = driver.driver.find_element(AppiumBy.ACCESSIBILITY_ID, locator)
            el.click()
        except Exception:
            pass
    return True

def type_text(driver, locator, text):
    if driver.driver:
        try:
            from appium.webdriver.common.appiumby import AppiumBy
            el = driver.driver.find_element(AppiumBy.ACCESSIBILITY_ID, locator)
            el.clear()
            el.send_keys(text)
        except Exception:
            pass
    return True
