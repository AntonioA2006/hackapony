from fastapi import APIRouter

from app.api.v1 import auth, incidents, inegi, reports, statistics, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(reports.router)
api_router.include_router(incidents.router)
api_router.include_router(statistics.router)
api_router.include_router(inegi.router)