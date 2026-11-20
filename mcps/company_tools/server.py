"""
Servidor MCP Oficial para Herramientas de Nexova Solutions.
Expone herramientas protegidas por OAuth 2.1 vía Streamable HTTP / SSE.
"""
import logging
import uvicorn
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from fastmcp import FastMCP
from mcps.company_tools.config import settings
from mcps.company_tools.auth import (
    mcp_auth,
    get_mcp_auth_middleware,
    get_protected_resource_metadata,
)
from mcps.company_tools.tools_incidents import register_incident_tools
from mcps.company_tools.tools_inventory import register_inventory_tools
from starlette.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexova.mcp_server")

# 1. Creación de la instancia del servidor FastMCP
mcp = FastMCP(
    name=settings.server_name,
    instructions=(
        "Servidor MCP oficial de herramientas corporativas de Nexova Solutions. "
        "Expone gestión de incidencias y consulta estricta de solo lectura de inventario. "
        "Requiere autenticación OAuth 2.1 con Bearer token."
    ),
)

# 2. Registro de herramientas de dominio
register_incident_tools(mcp)
register_inventory_tools(mcp)


# 3. Endpoints de Metadatos y Discovery (RFC 9470 y RFC 8414)
@mcp.custom_route("/.well-known/oauth-protected-resource", methods=["GET", "OPTIONS"])
async def protected_resource_metadata_route(request: Request) -> Response:
    """Retorna los metadatos de recurso protegido según RFC 9470 para discovery automático."""
    if request.method == "OPTIONS":
        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )
    resp = JSONResponse(get_protected_resource_metadata())
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp


@mcp.custom_route("/.well-known/oauth-authorization-server", methods=["GET", "OPTIONS"])
async def oauth_authorization_server_route(request: Request) -> Response:
    """Retorna los metadatos del servidor de autorización OAuth 2.1 provistos por mcpauth."""
    endpoint_fn = mcp_auth.metadata_endpoint()
    return await endpoint_fn(request)


@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request) -> Response:
    """Endpoint de estado operativo y diagnóstico del servidor MCP."""
    return JSONResponse(
        {
            "status": "healthy",
            "server": settings.server_name,
            "transport": "streamable-http (sse)",
            "auth": "OAuth 2.1 (mcpauth Resource Server)",
            "scopes": settings.supported_scopes,
        }
    )



# 4. Construcción de la Aplicación ASGI con Middleware de Seguridad
def create_app():
    """Construye y configura la aplicación Starlette con el middleware Bearer de mcpauth y CORS."""
    app = mcp.http_app()
    app.add_middleware(get_mcp_auth_middleware())
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Mcp-Session-Id", "WWW-Authenticate"],
    )
    return app


app = create_app()


def main():
    """Punto de entrada para ejecutar el servidor MCP en modo Streamable HTTP."""
    logger.info(
        f"Iniciando {settings.server_name} en http://{settings.server_host}:{settings.server_port}..."
    )
    uvicorn.run(
        app,
        host=settings.server_host,
        port=settings.server_port,
        log_level="info",
    )


if __name__ == "__main__":
    main()