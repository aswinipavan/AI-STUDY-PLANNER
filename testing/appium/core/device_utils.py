def set_orientation_portrait(driver):
    driver.orientation = "PORTRAIT"
    if driver.driver:
        try:
            driver.driver.orientation = "PORTRAIT"
        except Exception:
            pass
    return True

def set_orientation_landscape(driver):
    driver.orientation = "LANDSCAPE"
    if driver.driver:
        try:
            driver.driver.orientation = "LANDSCAPE"
        except Exception:
            pass
    return True

def background_and_resume(driver, seconds=2):
    driver.in_background = True
    if driver.driver:
        try:
            driver.driver.background_app(seconds)
        except Exception:
            pass
    driver.in_background = False
    return True
