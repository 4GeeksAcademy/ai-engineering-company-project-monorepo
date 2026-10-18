# OWASP_SECURITY_AUDIT.md — Informe de Auditoría y Plan de Remediación OWASP Top 10
**Módulo:** Secure AI Applications  
**Proyecto:** Auditoría y Corrección de Vulnerabilidades Web (OWASP Top 10)  
**Sistema Evaluado:** TrackFlow API & Backoffice (`services/api/`, `uis/backoffice/`)  
**Fecha:** 18 de Octubre, 2026

---

## 1. Resumen Ejecutivo de la Auditoría

Se ha realizado una auditoría exhaustiva de seguridad basada en el estándar internacional **OWASP Top 10 (2021)** sobre el backend y la arquitectura de APIs de TrackFlow. Se identificaron **vulnerabilidades críticas y moderadas** que comprometen el control de acceso, la integridad de los datos, la configuración del servidor HTTP y la protección contra ataques de fuerza bruta.

A continuación se detalla el análisis de hallazgos clasificados por vector de ataque de OWASP y el plan de remediación técnica.

---

## 2. Matriz de Hallazgos y Vulnerabilidades Identificadas

| ID | Categoría OWASP | Severidad | Componente Afectado | Descripción del Hallazgo |
|---|---|:---:|---|---|
| **VULN-01** | **A01: Broken Access Control** | 🚨 **Crítica** | `models/user_models.py`, `routes/users.py` | **Escalada de Privilegios en Registro Público**: `UserCreate` permite al cliente enviar `role="admin"`, permitiendo que cualquier atacante se registre como administrador sin autorización. |
| **VULN-02** | **A01: Broken Access Control** | 🔴 **Alta** | `routes/users.py` (`GET /users/`) | **Enumeración Global de Usuarios**: Cualquier usuario autenticado (incluso rol `user`) puede listar todos los usuarios del sistema. Debe restringirse exclusivamente a `admin`. |
| **VULN-03** | **A01: Broken Access Control** | 🔴 **Alta** | `routes/users.py` (`GET /users/{id}`) | **IDOR (Insecure Direct Object Reference)**: Cualquier usuario autenticado puede inspeccionar los datos completos de otros usuarios por ID. Debe permitirse solo al `owner` o a un `admin`. |
| **VULN-04** | **A01: Broken Access Control** | 🚨 **Crítica** | `routes/users.py` (`PUT /users/{id}`) | **Auto-Asignación de Rol de Administrador**: Un usuario regular puede actualizar su propio perfil y enviarse `role="admin"`. Solo los administradores deben tener permiso para alterar roles. |
| **VULN-05** | **A01: Broken Access Control** | 🔴 **Alta** | `routes/suppliers.py` (`DELETE /suppliers/{id}`) | **Borrado No Autorizado de Proveedores**: Cualquier usuario básico puede eliminar permanentemente proveedores clave de la base de datos. Debe requerir rol `admin`. |
| **VULN-06** | **A03: Injection & XSS** | 🔴 **Alta** | `models/incident.py`, `routes/incidents.py` | **Stored XSS / Inyección HTML**: Campos `title` y `description` no se sanitizan, permitiendo almacenamiento de scripts maliciosos ejecutables en paneles web. |
| **VULN-07** | **A03: Injection (CSV)** | 🟡 **Media** | `analyzer.py` (`build_export_rows`) | **Inyección de Fórmulas CSV**: Datos exportados que comienzan con `=`, `+`, `-` o `@` pueden ejecutar comandos o macros en suites ofimáticas (Excel, Calc). |
| **VULN-08** | **A04: Insecure Design** | 🔴 **Alta** | `routes/auth.py` (`/auth/login`, `/auth/forgot-password`) | **Falta de Rate Limiting / Protección contra Fuerza Bruta**: Ausencia de limitación de tasa por IP/cuenta en endpoints de autenticación, permitiendo ataques de *credential stuffing*. |
| **VULN-09** | **A05: Security Misconfiguration** | 🔴 **Alta** | `main.py` | **Ausencia de Cabeceras HTTP de Seguridad**: El servidor no emite `X-Content-Type-Options`, `X-Frame-Options` (Clickjacking), `Content-Security-Policy`, `Referrer-Policy` ni `Permissions-Policy`. |
| **VULN-10** | **A07: Identification Failures** | 🟡 **Media** | `models/user_models.py` | **Política de Contraseñas Débiles**: Longitud mínima permitida de solo 6 caracteres (`min_length=6`), vulnerable a ataques de diccionario y colisión rápida. |
| **VULN-11** | **A09: Security Logging Failures** | 🟡 **Media** | `routes/auth.py`, `routes/users.py` | **Falta de Trazabilidad y Auditoría de Seguridad**: Los intentos fallidos de autenticación y accesos denegados (403) no generan registros de auditoría estructurados. |

---

## 3. Plan de Remediación Técnica (Arquitectura de Parches)

### 3.1 Hardening de Control de Acceso (A01)
1. **Registro Público Seguro (`POST /users/`)**:
   - Forzar irrevocablemente `role = UserRole.user` y `is_active = True` en el backend para todo registro público, ignorando cualquier rol suministrado en el payload.
2. **Restricción de Rutas Administrativas**:
   - `GET /users/` protegido con `Depends(get_admin_user)`.
   - `GET /users/{user_id}` permitido únicamente si `current_user["id"] == user_id` o `current_user["role"] == "admin"`.
   - `PUT /users/{user_id}`: Si el solicitante no es `admin`, impedir la modificación de los campos `role` e `is_active`.
   - `DELETE /suppliers/{supplier_id}`: Proteger con `Depends(get_admin_user)`.

### 3.2 Prevención de Inyecciones y Sanitización (A03)
1. **Sanitización HTML/XSS**:
   - Implementar helper de sanitización de texto (`html.escape` y limpieza de etiquetas peligrosas) en validadores Pydantic para `title` y `description` de incidencias y perfiles.
2. **Mitigación de Inyección CSV**:
   - Escapar celdas de exportación que inicien con caracteres de fórmula (`=`, `+`, `-`, `@`) anteponiendo comilla simple `'`.

### 3.3 Middleware de Cabeceras de Seguridad y Rate Limiting (A04 & A05)
1. **Security Headers Middleware**:
   - Inyectar en todas las respuestas HTTP:
     - `X-Frame-Options: DENY` (anti-Clickjacking).
     - `X-Content-Type-Options: nosniff` (anti-MIME sniffing).
     - `Referrer-Policy: strict-origin-when-cross-origin`.
     - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none';`.
     - `Permissions-Policy: geolocation=(), microphone=(), camera=()`.
     - `X-XSS-Protection: 1; mode=block`.
2. **Rate Limiter en Memoria**:
   - Middleware/Dependencia `RateLimiter` basada en ventana deslizante para limitar peticiones excesivas en `/auth/login`, `/auth/forgot-password` y `/users/` (ej: máximo 5 intentos por minuto por IP).

### 3.4 Robustecimiento de Contraseñas y Auditoría (A07 & A09)
1. **Política de Contraseñas**:
   - Elevar la longitud mínima de contraseña a 8 caracteres con validación de complejidad mínima.
2. **Auditoría de Eventos de Seguridad**:
   - Logger dedicado `security.audit` para registrar intentos fallidos de login, intentos de escalada de privilegios (403) y operaciones destructivas.

---

## 4. Próximos Pasos (Fase 2)
Implementar el módulo de seguridad (`core/security.py`), sanitizadores de entrada, rate limiter y actualizar los modelos y endpoints afectados.
