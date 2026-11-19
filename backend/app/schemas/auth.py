from pydantic import BaseModel, EmailStr, Field

from app.domain.enums import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=2, max_length=120)
    accept_terms: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    role: UserRole

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, "id"):
            obj = type(
                "UserProxy",
                (),
                {
                    "id": str(obj.id),
                    "email": obj.email,
                    "display_name": obj.display_name,
                    "role": obj.role,
                },
            )()
        return super().model_validate(obj, *args, **kwargs)


class AuthResponse(BaseModel):
    user: UserOut
    tokens: TokenResponse


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=16, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetAccepted(BaseModel):
    message: str
    dev_reset_token: str | None = None