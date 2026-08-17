"""
Regression tests — schemas used with explicit `model_validate(orm_obj)` calls
must declare `model_config = ConfigDict(from_attributes=True)`.

Found in production (2026-08-17): `GET /api/v1/exam-types` returned 500
(`ValidationError: Input should be a valid dictionary or instance of
ExamTypeResponse`) because the schema lacked `from_attributes`, while FastAPI's
`response_model=` path auto-enables it (masking the issue on other endpoints).
"""
import re
from pathlib import Path

ENDPOINTS_DIR = Path(__file__).resolve().parents[2] / "app" / "api" / "v1" / "endpoints"
SCHEMAS_DIR = Path(__file__).resolve().parents[2] / "app" / "schemas"


def _find_schemas_used_with_model_validate():
    used = set()
    for py in ENDPOINTS_DIR.glob("*.py"):
        text = py.read_text(encoding="utf-8")
        for m in re.finditer(r"(\w+Response)\.model_validate", text):
            used.add(m.group(1))
    return used


def _schema_has_from_attributes(schema_name):
    for py in SCHEMAS_DIR.glob("*.py"):
        text = py.read_text(encoding="utf-8")
        match = re.search(rf"class {schema_name}\(BaseModel\):([\s\S]*?)(?=\nclass |\Z)", text)
        if match:
            return "from_attributes" in match.group(1)
    return False


class TestResponseSchemasFromAttributes:
    def test_all_model_validate_schemas_have_from_attributes(self):
        missing = [
            name
            for name in sorted(_find_schemas_used_with_model_validate())
            if not _schema_has_from_attributes(name)
        ]
        assert missing == [], (
            "Response schemas used with model_validate() must declare "
            "model_config = ConfigDict(from_attributes=True). Missing: "
            f"{missing}"
        )

    def test_exam_type_response_regression(self):
        """The exact production 500: ExamTypeResponse.model_validate(orm_obj)."""
        from app.schemas.academic import ExamTypeResponse

        et = type("ExamType", (), {"id": "et-1", "name": "Midterm", "weight": 0.5, "created_at": None})()
        result = ExamTypeResponse.model_validate(et)
        assert result.name == "Midterm"