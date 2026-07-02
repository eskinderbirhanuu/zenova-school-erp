"""Add deleted_at column to all model files that are missing it."""
import os
import re

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "app", "models")
MODELS_DIR = os.path.normpath(MODELS_DIR)

DECLARED_ATTR_IMPORT = "from sqlalchemy.ext.declarative import declared_attr"

def add_deleted_at(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "deleted_at" in content:
        return False  # Already has it

    # Find the last timestamp column line
    # Pattern: matches created_at or updated_at column definitions
    ts_pattern = re.compile(
        r"^\s+(updated_at|created_at)\s*=\s*Column\(DateTime.*$",
        re.MULTILINE,
    )
    matches = list(ts_pattern.finditer(content))
    if not matches:
        print(f"  WARN: No timestamp column found in {os.path.basename(filepath)}")
        return False

    last_ts = matches[-1]
    last_ts_line = last_ts.group(0)

    # Add deleted_at after the last timestamp column
    indent = " " * (len(last_ts_line) - len(last_ts_line.lstrip()))
    deleted_at_line = f"{indent}deleted_at = Column(DateTime, nullable=True)"

    # Insert after the last timestamp line
    new_content = content.replace(
        last_ts_line,
        last_ts_line + "\n" + deleted_at_line,
        1,
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"  Added deleted_at to {os.path.basename(filepath)}")
    return True


def main():
    count = 0
    for fname in sorted(os.listdir(MODELS_DIR)):
        if not fname.endswith(".py") or fname == "__init__.py":
            continue
        filepath = os.path.join(MODELS_DIR, fname)
        if add_deleted_at(filepath):
            count += 1

    print(f"\nDone. Added deleted_at to {count} model files.")

if __name__ == "__main__":
    main()
