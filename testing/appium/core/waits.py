import time

def wait_for_element_visible(driver, locator, timeout=5):
    if driver.driver:
        try:
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            from appium.webdriver.common.appiumby import AppiumBy
            WebDriverWait(driver.driver, timeout).until(EC.visibility_of_element_located((AppiumBy.ACCESSIBILITY_ID, locator)))
            return True
        except Exception:
            return False
    return True

def wait_for_element_clickable(driver, locator, timeout=5):
    if driver.driver:
        try:
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            from appium.webdriver.common.appiumby import AppiumBy
            WebDriverWait(driver.driver, timeout).until(EC.element_to_be_clickable((AppiumBy.ACCESSIBILITY_ID, locator)))
            return True
        except Exception:
            return False
    return True

def wait_for_text(driver, text, timeout=5):
    if driver.driver:
        try:
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            from appium.webdriver.common.appiumby import AppiumBy
            WebDriverWait(driver.driver, timeout).until(EC.presence_of_element_located((AppiumBy.XPATH, f"//*[contains(@text, '{text}')]")))
            return True
        except Exception:
            return False
    return True
