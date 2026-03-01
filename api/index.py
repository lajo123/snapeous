"""Vercel serverless entry point for SpotSEO FastAPI backend."""
from backend.main import app  # noqa: F401 — Vercel detects this ASGI app
