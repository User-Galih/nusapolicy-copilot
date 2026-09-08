from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.documents import router as document_router
from app.api.routes.chat import router as chat_router
from app.api.routes.evaluations import router as evaluation_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="NusaPolicy Copilot API",
        version="0.1.0",
        description="Grounded Indonesian policy-assistant API.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    app.include_router(document_router)
    app.include_router(chat_router)
    app.include_router(evaluation_router)

    @app.get("/health", tags=["system"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
