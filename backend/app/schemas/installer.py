from pydantic import BaseModel, Field


class InstallerStatusResponse(BaseModel):
    server_identity_exists: bool
    server_role: str | None = None
    setup_complete: bool
    school_name: str | None = None
    has_master_key: bool = False


class InitializeSuperAdminRequest(BaseModel):
    fingerprint: str
    master_setup_key: str
    super_admin_license: str
    email: str
    password: str


class InitializeSuperAdminResponse(BaseModel):
    success: bool
    server_id: str
    email: str
    message: str


class InitializeMainRequest(BaseModel):
    fingerprint: str
    school_id: str
    main_license: str
    admin_email: str
    admin_password: str


class InitializeMainResponse(BaseModel):
    success: bool
    server_id: str
    school_id: str
    admin_email: str
    message: str


class InitializeBranchRequest(BaseModel):
    fingerprint: str
    school_id: str
    branch_id: str
    branch_license: str
    vps_url: str = ""
    admin_email: str | None = None
    admin_password: str | None = None


class InitializeBranchResponse(BaseModel):
    success: bool
    server_id: str
    branch_id: str
    admin_email: str | None
    message: str


class WhoAmIResponse(BaseModel):
    is_super_admin: bool
    is_main_school: bool
    is_branch: bool
    server_role: str | None = None
