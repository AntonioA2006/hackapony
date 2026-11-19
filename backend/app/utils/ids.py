import secrets


def new_public_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(3).upper()}"