# -*- coding: utf-8 -*-
"""
Robust HTTP GET Health Check Poller for CI
Usage: python wait_for_health.py <url> [timeout_seconds] [log_file_to_dump_on_failure]
"""
import sys
import time
import urllib.request
import urllib.error

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: python wait_for_health.py <url> [timeout_seconds] [log_file]")
        sys.exit(0)
        
    url = sys.argv[1]
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    log_file = sys.argv[3] if len(sys.argv) > 3 else None
    
    print(f"Waiting for {url} to become ready (timeout: {timeout}s)...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "CI-HealthCheck-Poller/1.0", "Accept": "*/*"}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                if 200 <= resp.status < 400:
                    elapsed = round(time.time() - start_time, 2)
                    print(f"SUCCESS: {url} responded with HTTP {resp.status} in {elapsed}s")
                    sys.exit(0)
        except urllib.error.HTTPError as e:
            if 200 <= e.code < 400:
                elapsed = round(time.time() - start_time, 2)
                print(f"SUCCESS: {url} responded with HTTP {e.code} in {elapsed}s")
                sys.exit(0)
        except Exception:
            pass
        time.sleep(1)
        
    print(f"ERROR: Timed out after {timeout}s waiting for {url}")
    if log_file:
        try:
            with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                print(f"\n--- LOG OUTPUT FROM {log_file} ---")
                print(f.read())
                print("--- END LOG OUTPUT ---")
        except Exception as ex:
            print(f"Could not read log file {log_file}: {ex}")
    sys.exit(1)

if __name__ == '__main__':
    main()
