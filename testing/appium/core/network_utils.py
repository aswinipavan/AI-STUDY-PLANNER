def simulate_low_network_latency(driver):
    driver.network_throttled = True
    if driver.driver:
        try:
            from appium.webdriver.extensions.android.network import Network
            driver.driver.set_network_connection(Network.ConnectionType.DATA_ONLY)
        except Exception:
            pass
    return True

def restore_network(driver):
    driver.network_throttled = False
    if driver.driver:
        try:
            from appium.webdriver.extensions.android.network import Network
            driver.driver.set_network_connection(Network.ConnectionType.ALL_NETWORK_ON)
        except Exception:
            pass
    return True
