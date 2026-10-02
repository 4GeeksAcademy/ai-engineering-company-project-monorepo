# Guía de Configuración del Sistema de Agentes DeepSeek

> **Versión**: 1.0
> **Propósito**: Configurar el entorno completo para que los 10 agentes puedan operar
> **Prerrequisitos**: OpenClaw funcionando, modelo DeepSeek configurado

---

## 1. Configuración inicial del workspace

### 1.1 Estructura de directorios

Crea la siguiente estructura en tu workspace:

```
workspace/
├── agents-system/          ← Sistema de agentes (este proyecto)
├── memory/                 ← Memoria persistente por fecha
│   ├── YYYY-MM-DD.md
│   └── dreaming/           ← Procesamiento nocturno
├── skills/                 ← Habilidades instaladas
├── AGENTS.md               ← Registro maestro de agentes
├── IDENTITY.md             ← Identidad del asistente
├── SOUL.md                 ← Personalidad y tono
├── USER.md                 ← Preferencias del usuario
├── TOOLS.md                ← Herramientas conectadas
├── MEMORY.md               ← Hechos curados a largo plazo
└── .env                    ← Variables de entorno (NO versionar)
```

### 1.2 Archivos esenciales requeridos

| Archivo | Propósito | ¿Obligatorio? |
|---------|-----------|---------------|
| `AGENTS.md` | Registro maestro y reglas de activación | Sí |
| `SOUL.md` | Tono y personalidad del asistente | Sí |
| `USER.md` | Preferencias del usuario humano | Sí |
| `IDENTITY.md` | Identidad del sistema base | Sí |
| `.env` | Credenciales y secretos | Sí |
| `memory/YYYY-MM-DD.md` | Diario de sesiones | Por crear en cada sesión |

---

## 2. Configuración del modelo DeepSeek

### 2.1 Proveedor de modelo

Configura el modelo DeepSeek en `agents/main/agent/models.json`:

```json
{
  "providers": {
    "litellm-provider": {
      "api": "openai-completions",
      "baseUrl": "https://llm.4geeks.ai/v1",
      "apiKey": "sk-xxxxxxxxxxxxx",
      "models": [
        {
          "id": "madrid-spain/openrouter/deepseek/deepseek-v4-flash",
          "name": "DeepSeek V4 Flash"
        }
      ]
    }
  }
}
```

### 2.2 Parámetros recomendados

| Parámetro | Valor recomendado | Notas |
|-----------|-------------------|-------|
| `temperature` | 0.3 - 0.5 | Bajo para tareas técnicas, más alto para diseño |
| `max_tokens` | 4096 | Suficiente para respuestas detalladas |
| `top_p` | 0.9 | Balance entre creatividad y precisión |

---

## 3. Configuración de herramientas

### 3.1 Composio (servicios conectados)

Configura los servicios en `TOOLS.md`:

```markdown
## Composio (servicios conectados)

1. Google Docs
2. Google Calendar
3. Gmail
4. Google Drive
5. Google Tasks
6. Telegram
```

Variables de entorno requeridas:
```bash
COMPOSIO_API_KEY=sk-xxx
TELEGRAM_BOT_TOKEN=xxx
```

### 3.2 APIs externas

```bash
# 4Geeks BreatheCode
FOURGEEKS_API_KEY=sk-xxx

# Otras APIs según proyecto
OPENAI_API_KEY=sk-xxx
```

---

## 4. Configuración de memoria

### 4.1 Estructura de archivos de memoria

```
memory/
├── YYYY-MM-DD.md                    # Diario de sesión
├── dreaming/
│   ├── deep/YYYY-MM-DD.md           # Procesamiento nocturno
│   ├── light/YYYY-MM-DD.md          # Reflexiones ligeras
│   └── rem/YYYY-MM-DD.md            # Procesamiento de sueños
MEMORY.md                            # Hechos curados a largo plazo
```

### 4.2 Formato del diario de sesión

```markdown
# YYYY-MM-DD

## Sesión [Canal] ([Usuario])

### Agente activo: [Nombre del agente]
- [Resumen de actividades]

### Decisiones tomadas
- [Decisión 1]
- [Decisión 2]

### Pendientes
- [ ] [Tarea pendiente 1]
- [ ] [Tarea pendiente 2]
```

---

## 5. Configuración de seguridad

### 5.1 Protección de secretos

Crea un `.gitignore` robusto:

```gitignore
# ===== Secretos y entorno =====
.env
.env.*
!.env.example
*.local
*.env.local
*.env.*.local

# ===== Keys y certificados =====
*.pem
*.key
*.p12
*.pfx
*.cer
*.crt
*.p8
id_rsa
id_ed25519

# ===== Memoria interna del agente =====
memory/

# ===== Dependencias =====
node_modules/

# ===== Logs =====
*.log
npm-debug.log*

# ===== Python =====
__pycache__/
*.pyc
.venv/
venv/

# ===== Sistema =====
.DS_Store
Thumbs.db

# ===== Builds =====
dist/
build/
coverage/
```

### 5.2 Gestión de secretos (SecretRef)

Para migrar tokens de texto plano a SecretRef:

```bash
# Ver estado actual de secretos
openclaw config probe

# Backup antes de migrar
cp openclaw.json backups/openclaw.json.bak-$(date -I)

# Crear SecretRef
openclaw store set NOMBRE_SECRETO "valor"

# Verificar que el secreto funciona
openclaw config probe
```

---

## 6. Activación del sistema

### 6.1 Inicio de sesión

Cada vez que inicies una sesión, el sistema debe:

1. **Leer** `AGENTS.md` del sistema (registro maestro).
2. **Cargar** el perfil del agente necesario desde `agents/`.
3. **Revisar** `memory/YYYY-MM-DD.md` del día anterior para contexto.
4. **Crear** `memory/YYYY-MM-DD.md` del día actual si no existe.
5. **Consultar** `MEMORY.md` para hechos relevantes a largo plazo.

### 6.2 Activación de agente específico

Para activar un agente específico durante la sesión:

```
1. Identifica el ID del agente (A01-A10) en AGENTS.md
2. Carga su archivo de perfil desde agents/[id].md
3. Sigue las "Instrucciones de activación" de ese perfil
4. Documenta la actividad en el diario de sesión
```

---

## 7. Verificación de configuración

### 7.1 Checklist de verificación

- [ ] El modelo DeepSeek responde correctamente.
- [ ] Los archivos del sistema de agentes están en `agents-system/`.
- [ ] `.env` existe y contiene las credenciales necesarias.
- [ ] `.gitignore` excluye secretos, memoria y builds.
- [ ] `memory/` tiene el diario del día actual.
- [ ] Los servicios de Composio están conectados (si aplica).
- [ ] Las APIs externas responden (probar con un endpoint simple).
- [ ] El sistema de memoria guarda y recupera información entre sesiones.

---

## 8. Solución de problemas comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| Modelo no responde | API key inválida | Verificar `models.json` y `.env` |
| Composer no conecta | Token expirado | Regenerar en app.composio.dev |
| Secretos expuestos en Git | `.gitignore` incompleto | Revisar y actualizar `.gitignore` |
| Memoria perdida entre sesiones | No se escribió `MEMORY.md` | Escribir decisiones importantes en MEMORY.md |
| Agente no sigue instrucciones | Perfil de agente no cargado | Cargar el archivo correcto de `agents/` |

---

*Guía de configuración v1.0 — Sistema de Agentes DeepSeek — Septiembre 2026*