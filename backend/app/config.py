import os
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()


def _build_database_url() -> str:
    host = os.getenv("DB_HOST")
    if host:
        port = os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "postgres")
        user = quote_plus(os.getenv("DB_USER", ""))
        password = quote_plus(os.getenv("DB_PASSWORD", ""))
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{name}?sslmode=require"
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError("Set DB_HOST/DB_PASSWORD (or DATABASE_URL) in backend/.env")
    return url


class Settings:
    database_url: str = _build_database_url()
    secret_key: str = os.getenv("SECRET_KEY", "replace-with-a-long-random-secret")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if o.strip()
    ]


settings = Settings()
