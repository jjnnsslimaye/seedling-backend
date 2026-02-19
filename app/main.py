from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.api.routes import health, users, auth, competitions, submissions, payments, judging, admin, connect_accounts

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    await init_db()
    yield


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.app_name,
        version=settings.version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Configure CORS for file uploads and API requests
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,  # ["http://localhost:3000", ...]
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods including OPTIONS, POST
        allow_headers=["*"],  # Allow all headers including Content-Type, Authorization
        expose_headers=["*"],  # Expose all response headers
    )

    # Log CORS configuration
    print("=" * 80)
    print("CORS Configuration:")
    print(f"  Allowed Origins: {settings.allowed_origins}")
    print(f"  Allow Credentials: True")
    print(f"  Allow Methods: *")
    print(f"  Allow Headers: *")
    print(f"  Expose Headers: *")
    print("=" * 80)

    application.include_router(health.router, tags=["Health"])
    application.include_router(
        users.router,
        prefix=f"{settings.api_v1_prefix}/users",
        tags=["Users"],
    )
    application.include_router(
        auth.router,
        prefix=f"{settings.api_v1_prefix}/auth",
        tags=["Authentication"],
    )
    application.include_router(
        competitions.router,
        prefix=f"{settings.api_v1_prefix}/competitions",
        tags=["Competitions"],
    )
    application.include_router(
        submissions.router,
        prefix=f"{settings.api_v1_prefix}/submissions",
        tags=["Submissions"],
    )
    application.include_router(
        payments.router,
        prefix=f"{settings.api_v1_prefix}/payments",
        tags=["Payments"],
    )
    application.include_router(
        judging.router,
        prefix=f"{settings.api_v1_prefix}/judging",
        tags=["Judging"],
    )
    application.include_router(
        admin.router,
        prefix=f"{settings.api_v1_prefix}/admin",
        tags=["Admin"],
    )
    application.include_router(
        connect_accounts.router,
        prefix=f"{settings.api_v1_prefix}/users/me/connect-account",
        tags=["Connect Accounts"],
    )

    return application


app = create_application()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
