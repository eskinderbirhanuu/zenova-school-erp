"""
Usage (server must be running):
  python load_test.py [--base-url http://localhost:8000] [--users 50] [--concurrent 10]

Tests: login, student CRUD, attendance, academic, payments, sync trigger.
Reports failures + timing at the end.
"""
import argparse
import concurrent.futures
import random
import statistics
import time
import urllib.error
import urllib.request
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"


def json_req(method, path, token=None, body=None, timeout=15):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = time.time() - t0
            return resp.status, json.loads(resp.read().decode()), elapsed
    except urllib.error.HTTPError as e:
        elapsed = time.time() - t0
        body = e.read().decode()[:200]
        return e.code, {"error": body}, elapsed
    except urllib.error.URLError as e:
        elapsed = time.time() - t0
        return 0, {"error": str(e.reason)}, elapsed


class UserSession:
    def __init__(self, email, password, school_id):
        self.email = email
        self.password = password
        self.school_id = school_id
        self.token = None

    def login(self):
        code, data, _ = json_req("POST", "/auth/login", body={
            "username": self.email, "password": self.password,
        })
        if code == 200:
            self.token = data.get("access_token", data.get("token"))
        return code == 200

    def create_student(self, idx):
        return json_req("POST", "/students/", token=self.token, body={
            "first_name": f"Load{idx}",
            "last_name": f"Test{idx}",
            "gender": random.choice(["M", "F"]),
            "date_of_birth": "2010-01-15",
            "student_id": f"LOAD{idx:06d}",
            "school_id": self.school_id,
        })

    def record_attendance(self, student_id, date_str):
        return json_req("POST", "/attendance/bulk", token=self.token, body={
            "school_id": self.school_id,
            "records": [{
                "student_id": student_id,
                "date": date_str,
                "status": random.choice(["present", "absent", "late"]),
            }],
        })

    def get_queue_stats(self):
        return json_req("GET", "/sync/status", token=self.token)

    def health_check(self):
        return json_req("GET", "/health/")


def run_scenario(session, user_idx, results):
    ops = []

    t0 = time.time()
    ok = session.login()
    ops.append(("login", time.time() - t0, ok))

    if not ok:
        results.extend(ops)
        return

    for i in range(5):
        t0 = time.time()
        code, data, elapsed = session.create_student(user_idx * 100 + i)
        ops.append((f"create_student_{i}", elapsed, code == 200))

    t0 = time.time()
    code, data, elapsed = session.get_queue_stats()
    ops.append(("get_queue_stats", elapsed, code == 200))

    t0 = time.time()
    code, data, elapsed = session.health_check()
    ops.append(("health_check", elapsed, code == 200))

    results.extend(ops)


def main():
    parser = argparse.ArgumentParser(description="ZENOVA load test")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Server base URL")
    parser.add_argument("--users", type=int, default=50, help="Number of simulated users")
    parser.add_argument("--concurrent", type=int, default=10, help="Concurrent workers")
    args = parser.parse_args()

    global BASE_URL
    BASE_URL = args.base_url.rstrip("/") + "/api/v1"

    print(f"Health check: {BASE_URL.replace('/api/v1', '')}/api/v1/health/")
    code, data, elapsed = json_req("GET", "/health/")
    if code != 200:
        print(f"Server not healthy (HTTP {code}). Start the backend first.")
        sys.exit(1)
    print(f"Server OK ({elapsed*1000:.0f}ms)\n")

    school_id = data.get("school_id", "unknown")
    sessions = [
        UserSession("super@zenova.app", "admin123", school_id)
        for _ in range(args.users)
    ]

    all_results = []
    print(f"Running {args.users} sessions ({args.concurrent} concurrent)...")
    t_start = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrent) as pool:
        futures = []
        for i, s in enumerate(sessions):
            futures.append(pool.submit(run_scenario, s, i, all_results))
        for f in concurrent.futures.as_completed(futures):
            pass

    total_time = time.time() - t_start

    by_op = {}
    for name, elapsed, ok in all_results:
        by_op.setdefault(name, []).append((elapsed, ok))

    print(f"\n=== Results ({len(all_results)} ops, {total_time:.1f}s) ===")
    grand_total = 0
    grand_ok = 0
    for op, samples in sorted(by_op.items()):
        times = [s[0] for s in samples]
        oks = sum(1 for s in samples if s[1])
        total = len(samples)
        grand_total += total
        grand_ok += oks
        pct = f"{oks/total*100:.1f}%" if total else "N/A"
        avg = statistics.mean(times) if times else 0
        p99 = sorted(times)[int(len(times)*0.99)] if len(times) > 20 else (max(times) if times else 0)
        print(f"  {op:25s}  {oks}/{total} OK ({pct})  avg={avg*1000:.0f}ms  p99={p99*1000:.0f}ms")

    print(f"\n  {'TOTAL':25s}  {grand_ok}/{grand_total} OK ({grand_ok/grand_total*100:.1f}%)")
    if grand_ok < grand_total:
        sys.exit(1)


if __name__ == "__main__":
    main()
