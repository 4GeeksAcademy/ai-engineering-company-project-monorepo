"""
Capa de Seguridad OAuth 2.1 / OIDC para el servidor MCP utilizando mcpauth.
Implementa modo Resource Server, validación de JWT Bearer, verificación de scopes y logs de auditoría.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from jose import jwt, JWTError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from mcpauth import MCPAuth, AuthServerConfig
from mcpauth.config import AuthorizationServerMetadata, AuthServerType
from mcpauth.types import AuthInfo
from mcpauth.exceptions import (
    MCPAuthTokenVerificationException,
    MCPAuthTokenVerificationExceptionCode,
    MCPAuthBearerAuthException,
    BearerAuthExceptionCode,
)
from mcps.company_tools.config import settings

logger = logging.getLogger("nexova.mcp_auth")
audit_logger = logging.getLogger("nexova.mcp_audit")

# 1. Configuración de Metadatos del Servidor de Autorización OAuth 2.1 (mcpauth)
auth_metadata = AuthorizationServerMetadata(
    issuer=settings.oauth_issuer,
    authorization_endpoint=f"{settings.oauth_issuer}/authorize",
    token_endpoint=f"{settings.oauth_issuer}/token",
    response_types_supported=["code"],
    scope_supported=settings.supported_scopes,
    code_challenge_methods_supported=["S256"],  # Requerido por OAuth 2.1 / PKCE
)

auth_server_config = AuthServerConfig(
    metadata=auth_metadata,
    type=AuthServerType.OAUTH,
)

# Instancia oficial de mcpauth
mcp_auth = MCPAuth(server=auth_server_config)

# 2. Función de verificación de Access Tokens JWT
def verify_access_token(token: str) -> AuthInfo:
    """
    Valida la firma, emisor, audiencia y vigencia del JWT Bearer token.
    Devuelve un objeto AuthInfo con los scopes y el ID del cliente.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience=settings.oauth_audience,
        )
    except JWTError as exc:
        logger.warning(f"Fallo en verificación de JWT Bearer: {exc}")
        raise MCPAuthTokenVerificationException(
            MCPAuthTokenVerificationExceptionCode.INVALID_TOKEN
        )
    # Validar que el emisor coincida con la configuración
    issuer = payload.get("iss")
    if issuer != settings.oauth_issuer:
        logger.warning(f"Emisor inválido en token: esperado '{settings.oauth_issuer}', recibido '{issuer}'")
        raise MCPAuthTokenVerificationException(
            MCPAuthTokenVerificationExceptionCode.INVALID_TOKEN
        )
    client_id = payload.get("client_id") or payload.get("sub") or "anonymous_client"
    scopes: List[str] = payload.get("scopes", [])
    if isinstance(scopes, str):
        scopes = [s.strip() for s in scopes.split(" ") if s.strip()]
    return AuthInfo(
        token=token,
        issuer=settings.oauth_issuer,
        client_id=str(client_id),
        scopes=scopes,
        subject=payload.get("sub"),
        audience=settings.oauth_audience,
        claims=payload,
    )

# 3. Middleware de Autenticación Bearer compatible con FastMCP
def get_mcp_auth_middleware() -> type[BaseHTTPMiddleware]:
    """
    Crea el middleware Starlette que intercepta las peticiones HTTP:
    - Permite acceso libre a endpoints de metadatos (/.well-known/*) y preflight CORS (OPTIONS).
    - Exige Bearer Token válido para todos los endpoints de FastMCP (SSE, mensajes, invocaciones).
    """
    base_bearer_class = mcp_auth.bearer_auth_middleware(
        mode_or_verify=verify_access_token,
        audience=settings.oauth_audience,
        show_error_details=True,
    )
    class MCPSelectiveBearerMiddleware(base_bearer_class):
        async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
            # Eximir discovery público y preflight CORS
            path = request.url.path
            if request.method == "OPTIONS" or path.startswith("/.well-known") or path in ["/health", "/"]:
                return await call_next(request)
            # Para cualquier otra ruta MCP, ejecutar validación Bearer con mcpauth
            return await super().dispatch(request, call_next)
    return MCPSelectiveBearerMiddleware


# 4. Verificación de Scopes (Principio de Mínimo Privilegio)
def check_tool_scope(required_scope: str, tool_name: str) -> AuthInfo:
    """
    Verifica que el cliente autenticado posea el scope requerido para la tool solicitada.
    Lanza PermissionError (HTTP 403) con mensaje descriptivo si no tiene autorización.
    """
    auth_info = mcp_auth.auth_info
    if not auth_info:
        log_tool_invocation(tool_name, "anonymous", "UNAUTHORIZED", {"error": "Token ausente o inválido"})
        raise PermissionError("Autenticación requerida (401): No se encontró un token Bearer válido.")
    client_id = auth_info.client_id or "unknown_client"
    if required_scope not in auth_info.scopes:
        log_tool_invocation(
            tool_name,
            client_id,
            "FORBIDDEN_SCOPE",
            {"required_scope": required_scope, "client_scopes": auth_info.scopes},
        )
        raise PermissionError(
            f"Permiso denegado (403 Forbidden): Se requiere el scope '{required_scope}' "
            f"para invocar la tool '{tool_name}'. Scopes actuales del cliente: {auth_info.scopes}"
        )
    return auth_info

# 5. Sistema de Logging de Auditoría
def log_tool_invocation(
    tool_name: str,
    client_id: str,
    status: str,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Registra en logs la trazabilidad de cada invocación: qué tool, qué cliente y qué resultado.
    """
    details_str = str(details or {})
    audit_logger.info(
        f"[MCP-AUDIT] timestamp={datetime.now(timezone.utc).isoformat()} "
        f"tool={tool_name} client={client_id} status={status} details={details_str}"
    )

# 6. Helper para generar Tokens de Prueba / Playground
def create_access_token(
    client_id: str = "nexova-client",
    scopes: Optional[List[str]] = None,
    expires_minutes: int = 120,
    subject: str = "nexova_user",
) -> str:
    """
    Genera un Access Token JWT válido para pruebas locales, MCP Playground o clientes autorizados.
    """
    if scopes is None:
        scopes = settings.supported_scopes
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expires_minutes)
    payload = {
        "sub": subject,
        "client_id": client_id,
        "scopes": scopes,
        "iss": settings.oauth_issuer,
        "aud": settings.oauth_audience,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

# 7. Metadatos de Recurso Protegido RFC 9470 (OAuth Protected Resource Metadata)
def get_protected_resource_metadata() -> Dict[str, Any]:
    """Retorna los metadatos RFC 9470 para discovery automático de recursos protegidos."""
    return {
        "resource": f"http://{settings.server_host}:{settings.server_port}",
        "authorization_servers": [settings.oauth_issuer],
        "scopes_supported": settings.supported_scopes,
        "bearer_methods_supported": ["header"],
    }