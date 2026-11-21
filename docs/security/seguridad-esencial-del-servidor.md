# Seguridad Esencial del Servidor

**7 lecciones**

## Índice

- [00.0 Bienvenido a la Seguridad del Servidor](#000-bienvenido-a-la-seguridad-del-servidor)
- [01.0 Endurecimiento del Acceso SSH](#010-endurecimiento-del-acceso-ssh)
- [01.1 Usuarios y la Cuenta Root](#011-usuarios-y-la-cuenta-root)
- [02.0 Permisos de Carpetas](#020-permisos-de-carpetas)
- [02.1 Cortafuegos y Puertos](#021-cortafuegos-y-puertos)
- [03.0 Evaluación de Seguridad del Servidor](#030-evaluación-de-seguridad-del-servidor)
- [04.0 El endurecimiento es continuo](#040-el-endurecimiento-es-continuo)

---

## 00.0 Bienvenido a la Seguridad del Servidor

### Por qué tu servidor está bajo ataque desde el primer día

En cuestión de minutos después de conectarse a internet, un servidor Linux nuevo se convierte en el objetivo de miles de intentos automatizados de ataque. Bots escanean continuamente toda la internet probando nombres de usuario predeterminados (`root`, `admin`, `ubuntu`) y contraseñas comunes, buscando configuraciones por defecto fáciles de comprometer.

### Las cuatro puertas que debes asegurar

1. **Cómo inicias sesión (Acceso SSH):** Controlar el método de autenticación para prevenir adivinanzas de contraseñas y accesos no autorizados.
2. **Con qué cuenta inicias sesión (Cuentas de Usuario):** Evitar el inicio de sesión directo como `root` y usar usuarios sin privilegios con permisos controlados.
3. **Qué archivos y directorios pueden ser accedidos (Permisos):** Establecer permisos deliberados evitando valores peligrosos como `777`.
4. **Qué servicios están expuestos a internet (Cortafuegos y Puertos):** Restringir el acceso de red solo a los servicios necesarios para reducir la superficie de ataque.

---

## 01.0 Endurecimiento del Acceso SSH

### Autenticación Solo con Clave y Deshabilitar Root

- `PasswordAuthentication no`: deshabilita los inicios de sesión por contraseña; solo acepta pares de claves criptográficas.
  > **Importante:** Antes de deshabilitar la autenticación por contraseña, asegúrate de que tu clave SSH funcione abriendo una segunda sesión de terminal.
- `PermitRootLogin no`: evita que alguien inicie sesión directamente como `root`. Inicia sesión como usuario regular y usa `sudo`.
- `AllowUsers tu_usuario`: restringe el acceso SSH a usuarios específicos.
- `Port 2222` (opcional): reduce ruido en los registros evitando escaneos oportunistas en el puerto 22 (seguridad por oscuridad; nunca reemplaza las claves ni el bloqueo a `root`).

### Ejemplo de Configuración SSH (`/etc/ssh/sshd_config`)

```text
PasswordAuthentication no
PermitRootLogin no
AllowUsers alice bob
Port 2222
```

### Verificando Tu Configuración

```bash
sudo tail -f /var/log/auth.log
```

---

## 01.1 Usuarios y la Cuenta Root

### ¿Por qué evitar usar `root` para tareas diarias?

- **Sin red de seguridad:** Un error tipográfico (ej. `rm -rf /`) causa daños irreversibles.
- **Sin responsabilidad:** Las acciones como `root` no se atribuyen a un usuario individual.
- **Compromiso instantáneo:** Obtener acceso `root` otorga control total inmediato.

### Crear un usuario sin privilegios con acceso `sudo`

```bash
# 1. Crear un nuevo usuario
sudo adduser alice

# 2. Conceder privilegios sudo
sudo usermod -aG sudo alice

# 3. Verificar acceso sudo
su - alice
sudo whoami  # Debe mostrar "root"

# 4. Revisar sudoers de forma segura
sudo visudo  # Verificar línea: alice ALL=(ALL) ALL
```

Recargar SSH tras deshabilitar `PermitRootLogin`:
```bash
sudo systemctl reload ssh   # Debian / Ubuntu
sudo systemctl reload sshd  # RHEL / Fedora / Rocky
```

### Principio de menor privilegio para cuentas de servicio

Las cuentas de servicio (como `www-data` o `appuser`) no deben tener acceso `sudo` ni shell interactivo:

```bash
grep www-data /etc/passwd  # Debe mostrar /usr/sbin/nologin o /bin/false
sudo chsh -s /usr/sbin/nologin www-data

# Crear cuenta de servicio mínima
sudo adduser --system --no-create-home --shell /usr/sbin/nologin appuser
```

---

## 02.0 Permisos de Carpetas

### El Modelo de Permisos Unix

Tres clases de usuarios (**Propietario**, **Grupo**, **Otros**) y tres permisos (**Lectura `r=4`**, **Escritura `w=2`**, **Ejecución `x=1`**).

- **Ejemplo `755`:** Propietario `7 (4+2+1)`, Grupo `5 (4+0+1)`, Otros `5 (4+0+1)`.
- **Directorios:** El permiso de ejecución (`x`) permite entrar; el permiso de escritura (`w`) permite crear o eliminar archivos dentro.

### ¿Por qué evitar `777`?

`777` permite a cualquier usuario o proceso leer, escribir y ejecutar. En un directorio de cargas de un servidor web, convierte una vulnerabilidad de subida de archivos en ejecución remota de código.

### Valores Predeterminados Sensatos

- **Directorios:** `755`
- **Archivos:** `644`
- **Archivos privados (secretos):** `600`

### Comandos de Gestión

```bash
sudo chown usuario:grupo nombrearchivo
sudo chmod 755 nombredirectorio
sudo chmod 644 nombrearchivo
```

> Cuando un problema de permisos te tienta a usar `777`, la solución casi siempre es arreglar la propiedad con `chown` en lugar de ampliar permisos para todos.

---

## 02.1 Cortafuegos y Puertos

### El Principio: Denegación por Defecto (*Default-Deny*)

Bloquea todas las conexiones entrantes por defecto y permite tráfico únicamente en los puertos explícitamente autorizados. Protege servicios olvidados, bases de datos y descuidos futuros.

### Configurando UFW (Cortafuegos Sencillo)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 2222/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

sudo ufw enable
```

### Enlazando Servicios Internos a Localhost

Servicios como bases de datos (PostgreSQL, Redis) solo deben ser accesibles localmente (`127.0.0.1`), nunca en `0.0.0.0`:

```ini
# postgresql.conf
listen_addresses = '127.0.0.1'
```

### Auditando Puertos Abiertos

```bash
ss -tulpn
```

Repite la verificación de reglas UFW, puertos permitidos y `ss -tulpn` tras cada nuevo despliegue.

---

## 03.0 Evaluación de Seguridad del Servidor

1. **¿Qué logra `PasswordAuthentication no`?** Desactiva el inicio de sesión basado en contraseña, permitiendo solo autenticación mediante clave.
2. **¿Por qué deshabilitar `PermitRootLogin no`?** Para obligar a los atacantes a adivinar tanto un nombre de usuario como tener la clave correcta.
3. **Principal riesgo de permisos `777` en directorio de cargas:** Cualquier usuario, incluida una aplicación comprometida, puede escribir archivos allí, lo que podría permitir ejecución remota de código.
4. **Beneficio principal del firewall *default-deny*:** Bloquea todas las conexiones entrantes excepto las explícitamente permitidas, protegiendo servicios olvidados o desconocidos.
5. **Hábito crucial tras desplegar un nuevo servicio:** Auditar los puertos abiertos con `ss -tulpn` y verificar las reglas del firewall.
6. **¿Por qué enlazar servicios locales a `127.0.0.1` en lugar de `0.0.0.0`?** Para evitar acceso externo incluso si las reglas del firewall cambian o están mal configuradas.

---

## 04.0 El endurecimiento es continuo

La seguridad del servidor es un hábito continuo, no una tarea de "configurar y olvidar":
- Mantén tus claves SSH seguras y nunca habilites autenticación por contraseña.
- Usa `sudo` con usuarios sin privilegios.
- Evita `777`; asigna propiedad (`chown`) y permisos (`755`/`644`/`600`) deliberadamente.
- Audita puertos regularmente con `ss -tulpn` y revisa `/var/log/auth.log`.
