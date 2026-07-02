"""Check Alembic migration revision chain."""
import os, re

versions_dir = os.path.join(os.path.dirname(__file__), "..", "backend", "alembic", "versions")
versions_dir = os.path.normpath(versions_dir)

revisions = {}
for f in sorted(os.listdir(versions_dir)):
    if not f.endswith(".py") or f.startswith("__"):
        continue
    content = open(os.path.join(versions_dir, f)).read()
    rev = re.search(r'revision = "([^"]+)"', content)
    down = re.search(r'down_revision = "([^"]+)"', content)
    if rev:
        rev_id = rev.group(1)[:16]
        down_id = down.group(1)[:16] if down else "None"
        description = content.split('"""')[1].strip().split("\n")[0][:60] if '"""' in content else "?"
        revisions[rev.group(1)] = {"file": f, "down": down.group(1) if down else None, "desc": description}
        print(f"  {rev_id} <- {down_id}  [{f}]")

print("\n--- Chain ---")
for rev_id, info in revisions.items():
    if info["down"] is None:
        print(f"  BASE: {rev_id[:16]} ({info['desc']})")
    elif info["down"] not in revisions:
        print(f"  BROKEN: {rev_id[:16]} -> missing {info['down'][:16]}")
    else:
        print(f"  OK: {rev_id[:16]} -> {info['down'][:16]}")
