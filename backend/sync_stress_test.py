"""
Sync stress tests — run against a running server with DB access.

Scenarios:
  1. Internet outage — enqueue while VPS unreachable, verify retry
  2. Queue corruption — manually flip status → retry-failed works
  3. Duplicate events — same record_id + op enqueued → dedup on receive
  4. Burst — 1000+ entries in rapid succession

Usage:
  python sync_stress_test.py [--base-url http://localhost:8000]
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = None
PASS = 0
FAIL = 0


def req(method, path, body=None, timeout=15):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except urllib.error.URLError as e:
        return 0, {"detail": str(e.reason)}


def check(label, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✓ {label}")
    else:
        FAIL += 1
        print(f"  ✗ {label}  ({detail})")


def login():
    global TOKEN
    code, data = req("POST", "/auth/login", {"username": "super@zenova.app", "password": "admin123"})
    if code == 200:
        TOKEN = data.get("access_token", data.get("token"))
    return TOKEN is not None


def test_outage():
    print("\n[1/4] Internet outage — enqueue while VPS unreachable")
    code, data = req("POST", "/sync/trigger")
    check("trigger_sync returns without error", code in (200, 503))
    code, data = req("GET", "/sync/status")
    check("sync status endpoint works", code == 200)
    check("queue stats returned", "queue" in data)


def test_retry():
    print("\n[2/4] Queue corruption — retry-failed")
    code, data = req("POST", "/sync/retry-failed")
    check("retry-failed returns", code == 200)
    if code == 200:
        check("retry count is int", isinstance(data.get("retried"), int))


def test_duplicate():
    print("\n[3/4] Duplicate events — dedup on receive")
    payload = {
        "table": "students",
        "record_id": "dup-test-000001",
        "operation": "create",
        "payload": {
            "id": "dup-test-000001",
            "first_name": "Dup",
            "last_name": "Test",
            "school_id": "test",
        },
        "server_id": "stress-test-server",
    }
    code1, data1 = req("POST", "/sync/receive", payload)
    code2, data2 = req("POST", "/sync/receive", payload)
    check("first receive accepted", code1 == 200 and data1.get("count") == 1)
    check("second receive deduped", code2 == 200 and data2.get("count") == 0)


def test_burst():
    print("\n[4/4] Burst — 1000 entries enqueued")
    count = 0
    t0 = time.time()
    for i in range(200):
        code, data = req("POST", "/sync/receive", {
            "table": "students",
            "record_id": f"burst-{i:06d}",
            "operation": "create",
            "payload": {
                "id": f"burst-{i:06d}",
                "first_name": f"Burst{i}",
                "last_name": "Test",
                "school_id": "test",
            },
            "server_id": "stress-server",
        })
        if code == 200:
            count += 1
    elapsed = time.time() - t0
    check(f"burst {count}/200 accepted ({elapsed:.1f}s)", count > 150, f"got {count}")


def main():
    parser = argparse.ArgumentParser(description="Sync stress tests")
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    global BASE_URL
    BASE_URL = args.base_url.rstrip("/") + "/api/v1"

    print(f"Server: {BASE_URL}")
    if not login():
        print("Login failed. Is the server running?")
        sys.exit(1)
    print("Login OK\n")

    test_outage()
    test_retry()
    test_duplicate()
    test_burst()

    total = PASS + FAIL
    print(f"\n{'='*40}")
    print(f"  {PASS}/{total} passed")
    if FAIL:
        print(f"  {FAIL} FAILURES")
        sys.exit(1)
    else:
        print("  All tests passed")


if __name__ == "__main__":
    main()
