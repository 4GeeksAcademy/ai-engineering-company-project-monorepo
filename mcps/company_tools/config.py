"""
Configuración centralizada para el servidor MCP de Nexova Solutions.
Gestiona puertos, URLs del backend, configuración OAuth 2.1 y scopes.
"""
import os
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class MCPSettings(BaseModel):
    """Parámetros de configuración del Servidor MCP."""
    # Entorno de ejecución (development | production)
    env: str = os.getenv("MCP_ENV", "production")

    # Configuración de red del servidor MCP
    server_name: str = "Nexova Company Tools MCP Server"
    server_host: str = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
    server_port: int = int(os.getenv("MCP_SERVER_PORT", "8001"))

    # Conexión con el Backend principal de Nexova (FastAPI)
    backend_api_url: str = os.getenv("BACKEND_API_URL", "http://localhost:8000")
    backend_timeout: float = float(os.getenv("BACKEND_TIMEOUT_SECONDS", "8.0"))

    # Configuración de OAuth 2.1 / OIDC (mcpauth)
    oauth_issuer: str = os.getenv("MCP_OAUTH_ISSUER", "https://auth.nexova-solutions.internal")
    oauth_audience: str = os.getenv("MCP_OAUTH_AUDIENCE", "nexova-company-mcp")
    jwt_secret: str = os.getenv("MCP_JWT_SECRET", "")
    jwt_algorithm: str = "HS256"

    # Scopes soportados (Principio de Mínimo Privilegio)
    scope_incidents_read: str = "incidents:read"
    scope_incidents_write: str = "incidents:write"
    scope_inventory_read: str = "inventory:read"

    @property
    def supported_scopes(self) -> List[str]:
        return [
            self.scope_incidents_read,
            self.scope_incidents_write,
            self.scope_inventory_read,
        ]


settings = MCPSettings()
if not settings.jwt_secret:
    raise RuntimeError(
        "MCP_JWT_SECRET no está configurado. Defínelo en .env o como variable de entorno."
    )