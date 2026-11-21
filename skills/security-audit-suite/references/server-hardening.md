# Referencia: Endurecimiento de Servidores Linux y Despliegues

Usa esta referencia durante el **Modo 4 (Endurecimiento de Servidor y Despliegue)** antes de exponer cualquier VPS, host de contenedores o servidor de producción a internet.

> **Principio Central:** Bots automatizados escanean cualquier servidor nuevo minutos después de conectarse a internet. El endurecimiento es un hábito continuo: re-audita puertos, reglas de firewall y permisos tras **cada** despliegue.

---

## Puerta 1 — Endurecimiento de SSH (`/etc/ssh/sshd_config`)

- [ ] **Autenticación Solo con Clave:** Configurar `PasswordAuthentication no`.
  > **Regla de Seguridad Operativa:** Prueba siempre tu clave SSH en una **segunda sesión de terminal** ANTES de deshabilitar contraseñas o cerrar tu sesión actual.
- [ ] **Bloquear Inicio Directo como Root:** Configurar `PermitRootLogin no`.
- [ ] **Lista Blanca de Usuarios:** Configurar `AllowUsers <usuario_despliegue>`.
- [ ] **Reducción de Ruido (Opcional):** Cambiar `Port` del `22` a un puerto no estándar (ej. `2222`) para reducir ruido en logs — recordar que esto es *mantenimiento, no una defensa real*.

**Fragmento Recomendado (`/etc/ssh/sshd_config`):**
```text
PasswordAuthentication no
PermitRootLogin no
AllowUsers deployuser
Port 2222
```

**Recargar y Verificar:**
```bash
sudo systemctl reload ssh    # Debian / Ubuntu
sudo systemctl reload sshd   # RHEL / Fedora / Rocky
sudo tail -f /var/log/auth.log
```

---

## Puerta 2 — Cuentas de Usuario y Menor Privilegio

- [ ] **Cero Trabajo Diario como `root`:** Crear un usuario administrativo normal con acceso `sudo` para añadir fricción deliberada y trazabilidad en auditorías:
  ```bash
  sudo adduser deployuser
  sudo usermod -aG sudo deployuser
  su - deployuser && sudo whoami   # Debe devolver: root
  sudo visudo                      # Verificar sudoers de forma segura
  ```
- [ ] **Cuentas de Servicio Restringidas:** Servidores web y procesos de aplicación (`www-data`, `appuser`, `USER` no-root en Docker) DEBEN tener:
  - Cero privilegios `sudo`.
  - Shell no interactivo (`/usr/sbin/nologin` o `/bin/false`).
  ```bash
  grep www-data /etc/passwd
  sudo chsh -s /usr/sbin/nologin www-data
  sudo adduser --system --no-create-home --shell /usr/sbin/nologin appuser
  ```

---

## Puerta 3 — Permisos de Archivos y Carpetas (Cero `777`)

- [ ] **Prohibido Usar `777`:** Directorios con escritura global (especialmente carpetas de subidas como `data/raw/` o media estática) convierten un fallo de subida de archivos en Ejecución Remota de Código (RCE).
- [ ] **Arreglar Propiedad, No Abrir Permisos:** Si un proceso no puede leer/escribir un directorio, corrige el propietario con `chown` en lugar de dar permisos a todos.
- [ ] **Estándar Base de Permisos:**
  - Directorios: `755` (`rwxr-xr-x`)
  - Archivos normales de aplicación: `644` (`rw-r--r--`)
  - Archivos privados / secretos (`.env`, claves TLS, claves SSH): `600` (`rw-------`)

**Comandos de Verificación:**
```bash
# Detectar archivos o directorios peligrosos con escritura global
find /ruta/a/app -perm -0002 -ls

# Aplicar propiedad y permisos correctos
sudo chown -R deployuser:appgroup /ruta/a/app
sudo chmod 755 /ruta/a/app
sudo chmod 644 /ruta/a/app/config.yaml
sudo chmod 600 /ruta/a/app/.env
```

---

## Puerta 4 — Cortafuegos (`default-deny`) y Enlace a Localhost

- [ ] **Política de Denegación por Defecto (UFW):**
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 2222/tcp   # Tu puerto SSH (¡permitir ANTES de activar UFW!)
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  sudo ufw status verbose
  ```
- [ ] **Enlazar Servicios Internos Estrictamente a `127.0.0.1`:** Bases de datos y almacenes internos (PostgreSQL, Redis, Qdrant, Flower, métricas internas) NUNCA deben escuchar en `0.0.0.0` en servidores públicos:
  - PostgreSQL (`postgresql.conf`): `listen_addresses = '127.0.0.1'`
  - Redis (`redis.conf`): `bind 127.0.0.1 ::1`
  - Docker Compose (`docker-compose.yml`): publicar puertos internos como `127.0.0.1:6379:6379`, `127.0.0.1:6333:6333`, `127.0.0.1:5432:5432` en lugar de `6379:6379`.
- [ ] **Auditar Puertos Abiertos Tras Cada Despliegue:**
  ```bash
  ss -tulpn
  ```
  Confirmar que ningún servicio inesperado escuche en `0.0.0.0` o `::`.

---

## Rutina de Endurecimiento Continuo
Ejecuta estos 3 comandos tras cada release o cambio de infraestructura:
1. `ss -tulpn` — confirmar que solo los puertos públicos esperados están abiertos.
2. `sudo ufw status verbose` — confirmar que la política `deny (incoming)` sigue activa.
3. `sudo tail -n 50 /var/log/auth.log` — verificar ausencia de logins por contraseña o actividad `sudo` anómala.
