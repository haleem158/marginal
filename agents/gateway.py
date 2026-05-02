"""
gateway.py — Single-port reverse proxy for Railway deployment.

Routes:
  /indexer/*   →  Memory Indexer (localhost:8001)
  everything else  →  Auctioneer  (localhost:8000)

Railway injects $PORT; locally defaults to 8080.
This lets both agents be reached via a single public HTTPS URL:
  NEXT_PUBLIC_AUCTIONEER_URL = https://<railway-url>
  NEXT_PUBLIC_INDEXER_URL    = https://<railway-url>/indexer
"""
import os
import logging

import httpx
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("marginal.gateway")

AUCTIONEER_ORIGIN = "http://localhost:8000"
INDEXER_ORIGIN    = "http://localhost:8001"

app = FastAPI(title="Marginal Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check — answered directly by gateway so Render/UptimeRobot always get 200."""
    return {"status": "ok"}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def proxy(request: Request, path: str):
    """Transparent reverse proxy — routes by path prefix."""
    # Strip /indexer prefix and forward to memory indexer
    if path.startswith("indexer/") or path == "indexer":
        target = INDEXER_ORIGIN
        stripped = path[len("indexer"):].lstrip("/")
        forward_path = stripped or ""
    else:
        target = AUCTIONEER_ORIGIN
        forward_path = path

    url = f"{target}/{forward_path}"
    if request.url.query:
        url += f"?{request.url.query}"

    # Strip hop-by-hop headers that must not be forwarded
    skip_headers = {"host", "content-length", "transfer-encoding", "connection"}
    headers = {k: v for k, v in request.headers.items() if k.lower() not in skip_headers}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=await request.body(),
            )
        # Drop hop-by-hop response headers
        resp_headers = {
            k: v for k, v in resp.headers.items()
            if k.lower() not in {"transfer-encoding", "connection"}
        }
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=resp_headers,
        )
    except httpx.ConnectError:
        return Response(content=b'{"error":"agent unavailable"}', status_code=503,
                        media_type="application/json")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    logger.info("Gateway starting on port %d", port)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
