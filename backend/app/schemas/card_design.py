from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CardDesignCreate(BaseModel):
    logo_url: str | None = None
    design_json: str | None = None


class CardDesignResponse(BaseModel):
    id: str
    school_id: str
    logo_url: str | None = None
    design_json: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
