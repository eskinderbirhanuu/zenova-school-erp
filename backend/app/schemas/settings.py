from pydantic import BaseModel, Field
from typing import Optional


class SchoolSettingsPayload(BaseModel):
    model_config = {"extra": "forbid"}

    current_academic_year: Optional[str] = Field(None, description="Current active academic year identifier")
    term_start_date: Optional[str] = Field(None, description="Start date of current term")
    term_end_date: Optional[str] = Field(None, description="End date of current term")
    grading_scale: Optional[str] = Field(None, description="Grading scale configuration")
    passing_grade: Optional[str] = Field(None, description="Minimum passing grade")

    default_language: Optional[str] = Field(None, description="Default system language")
    notification_email: Optional[str] = Field(None, description="School notification email address")
    sms_provider: Optional[str] = Field(None, description="SMS provider name")
    enable_email_notifications: Optional[str] = Field(None, description="Toggle email notifications")
    enable_sms_alerts: Optional[str] = Field(None, description="Toggle SMS alerts")

    allow_self_registration: Optional[str] = Field(None, description="Allow student self-registration")
    require_parent_approval: Optional[str] = Field(None, description="Require parent approval for registration")
    session_timeout: Optional[str] = Field(None, description="Session timeout in minutes")
    max_login_attempts: Optional[str] = Field(None, description="Maximum failed login attempts before lockout")
    two_factor_auth: Optional[str] = Field(None, description="Enable two-factor authentication")

    timezone: Optional[str] = Field(None, description="School timezone")
    date_format: Optional[str] = Field(None, description="Preferred date format")
    currency: Optional[str] = Field(None, description="School currency code")
    week_start_day: Optional[str] = Field(None, description="First day of the week")


class SchoolSettingsUpdate(BaseModel):
    settings: SchoolSettingsPayload
