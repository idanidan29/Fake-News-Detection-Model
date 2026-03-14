# Backend Setup (FastAPI + Supabase Postgres)

## 1. Create and activate virtual environment

Windows PowerShell:

python -m venv .venv
.\.venv\Scripts\Activate.ps1

## 2. Install dependencies

pip install -r requirements.txt

## 3. Configure environment

Copy `.env.example` to `.env` and set your Supabase values.

Required values:
- `DATABASE_URL`
- `SECRET_KEY`

Supabase format:

postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require

## 4. Run API

uvicorn app.main:app --reload

## 5. Endpoints

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me` (Bearer token)
