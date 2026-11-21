# Riesgos de Seguridad en Aplicaciones Web OWASP Top 10

**13 lecciones**

## Índice

- [00.0 Bienvenido a las Amenazas en Aplicaciones Web](#000-bienvenido-a-las-amenazas-en-aplicaciones-web)
- [01.0 Qué es el OWASP Top 10](#010-qué-es-el-owasp-top-10)
- [01.1 Control de Acceso Roto](#011-control-de-acceso-roto)
- [02.0 Configuración Incorrecta de Seguridad](#020-configuración-incorrecta-de-seguridad)
- [02.1 Fallos en la Cadena de Suministro y de Integridad](#021-fallos-en-la-cadena-de-suministro-y-de-integridad)
- [03.0 Fallos Criptográficos](#030-fallos-criptográficos)
- [03.1 Inyección](#031-inyección)
- [04.0 Diseño Inseguro](#040-diseño-inseguro)
- [04.1 Fallos de Autenticación](#041-fallos-de-autenticación)
- [05.0 Registro y Alertas de Fallos](#050-registro-y-alertas-de-fallos)
- [05.1 Manejo Incorrecto de Condiciones Excepcionales](#051-manejo-incorrecto-de-condiciones-excepcionales)
- [06.0 Evaluación del Top 10 de OWASP](#060-evaluación-del-top-10-de-owasp)
- [07.0 Auditando Tus Propias Aplicaciones](#070-auditando-tus-propias-aplicaciones)

---

## 00.0 Bienvenido a las Amenazas en Aplicaciones Web

En el mundo de las aplicaciones web, las vulnerabilidades de seguridad más graves a menudo no son el resultado de hackeos complejos o exploits exóticos. En cambio, suelen ser **errores comunes** —simples descuidos que permiten a alguien acceder a datos o realizar acciones que no debería poder.

Imagina que un usuario cambia un número en una URL (`www.site.com/id=1234`) y de repente ve la información privada de otra persona. No hay una cadena de exploits complicada, ni criptografía avanzada —solo una verificación faltante en el lado del servidor. Esta es la realidad revelada por datos de cientos de miles de aplicaciones reales.

### ¿Por Qué Es Importante?

Entender estas vulnerabilidades comunes es crucial porque:
- Son la causa más frecuente de brechas graves.
- A menudo pasan desapercibidas porque parece que la aplicación funciona como se espera.
- Reconocer sus patrones ayuda a los desarrolladores a **construir aplicaciones más seguras**.

### El Poder de un Catálogo Compartido de Amenazas

Sin un lenguaje común, cada equipo podría llamar al mismo problema con nombres diferentes, dificultando la comunicación y la remediación. El OWASP Top 10 proporciona un catálogo compartido de los riesgos de seguridad más críticos en aplicaciones web. Este catálogo:
- Ayuda a desarrolladores, testers y profesionales de seguridad a hablar el mismo idioma.
- Permite revisiones y auditorías sistemáticas.
- Enfoca la atención en los riesgos más impactantes y prevalentes.

### Ejemplos del Mundo Real

- Una página de factura que devuelve los datos de otro cliente cuando se cambia el ID en la URL.
- Un depósito de almacenamiento en la nube dejado accesible públicamente, exponiendo copias de seguridad sensibles.
- Un formulario de inicio de sesión que revela qué direcciones de correo electrónico están registradas, facilitando a los atacantes.

### Qué Esperar en Este Curso

Exploraremos las diez categorías del **OWASP Top 10:2025**, agrupadas según dónde ocurren en el sistema —desde la configuración y dependencias hasta el manejo de datos, diseño, identidad y prácticas operativas.

---

## 01.0 Qué es el OWASP Top 10

El OWASP Top 10 es más que una simple lista de problemas de seguridad; es un ranking cuidadosamente elaborado de los riesgos de seguridad en aplicaciones web más críticos basado en datos del mundo real.

### ¿Qué es OWASP?

**OWASP** significa *Open Worldwide Application Security Project* (Proyecto Abierto Mundial de Seguridad en Aplicaciones). Es una organización sin fines de lucro dedicada a mejorar la seguridad del software proporcionando recursos gratuitos y neutrales respecto a proveedores.

### ¿Cómo se compila el OWASP Top 10?

La lista se construye a partir de datos recopilados de cientos de miles de aplicaciones reales en todo el mundo, combinados con encuestas a profesionales de seguridad. Clasifica las categorías basándose en tres factores clave:
- **Prevalencia:** Con qué frecuencia aparece la debilidad en las aplicaciones.
- **Explotabilidad:** Qué tan fácilmente un atacante puede explotar la debilidad.
- **Impacto:** El daño potencial causado por la vulnerabilidad.

### Qué es y qué no es el OWASP Top 10

- **Es un documento de concienciación:** Nombra las diez categorías de riesgo más críticas para ayudar a desarrolladores y profesionales de seguridad a enfocar sus esfuerzos.
- **No es un catálogo completo:** Existen muchas otras vulnerabilidades que no están listadas aquí.
- **No es un estándar de cumplimiento ni una lista de verificación:** Pasar el Top 10 no garantiza que una aplicación sea segura.

### ¿Qué cambió en la edición 2025?

- **La Configuración Incorrecta de Seguridad** ascendió al segundo lugar, enfatizando la importancia de configuraciones correctas en entornos de nube e infraestructura como código.
- **Fallos en la Cadena de Suministro de Software** se añadió como una nueva categoría, ampliando el enfoque para incluir riesgos derivados de código de terceros y pipelines de construcción.
- **Manejo Incorrecto de Condiciones Excepcionales** fue introducido, cubriendo cómo se comportan las aplicaciones cuando ocurren errores inesperados o casos límite.

A pesar de estos cambios, **Control de Acceso Roto** sigue siendo el riesgo principal.

---

## 01.1 Control de Acceso Roto

### ¿Qué es el Control de Acceso Roto?

El Control de Acceso Roto ocurre cuando los usuarios pueden realizar acciones o acceder a datos más allá de sus permisos. Ocupa el primer lugar en el OWASP Top 10 porque la falla en sí misma es la brecha: no se necesita una cadena de explotación compleja.

### Ejemplo Común: Referencia Directa Insegura a Objetos (IDOR)

Considera un endpoint de API como `/api/invoices/:id` que devuelve datos de una factura. Si el servidor no verifica que el usuario que hace la solicitud es el propietario de la factura, cualquiera que cambie el parámetro `id` puede acceder a facturas que pertenecen a otros.

### ¿Por qué sucede esto?

- El servidor confía en que el cliente proporcione identificadores válidos.
- Faltan o son insuficientes las verificaciones de autorización.
- Los desarrolladores prueban solo con sus propias cuentas de usuario, pasando por alto la falla.

### Cómo arreglar el Control de Acceso Roto

La clave es **hacer cumplir la autorización en el servidor para cada solicitud**, verificando la identidad del solicitante y sus permisos.

#### Ejemplo: Ruta Vulnerable vs. Segura en Node.js Express

```javascript
// Ruta vulnerable: sin verificación de propiedad
app.get('/api/invoices/:id', async (req, res) => {
  const invoiceId = req.params.id;
  const invoice = await db.getInvoiceById(invoiceId);
  res.json(invoice);
});

// Ruta segura: verificación de propiedad y denegar por defecto
app.get('/api/invoices/:id', async (req, res) => {
  const invoiceId = req.params.id;
  const userId = req.user.id; // ID del usuario autenticado

  const invoice = await db.getInvoiceById(invoiceId);
  if (!invoice) {
    return res.status(404).send('Factura no encontrada');
  }

  if (invoice.ownerId !== userId) {
    return res.status(403).send('Acceso denegado');
  }

  res.json(invoice);
});

// Middleware que aplica denegar por defecto
function denyByDefault(req, res, next) {
  if (!req.user) {
    return res.status(401).send('Autenticación requerida');
  }
  next();
}

app.use(denyByDefault);
```

### Mejores Prácticas

- Siempre verifica la autorización en el servidor para cada solicitud.
- Por defecto, deniega el acceso a menos que esté explícitamente permitido (denegar por defecto).
- Prueba tus endpoints simulando solicitudes como diferentes usuarios.
- Nunca confíes en la entrada del cliente para operaciones sensibles.

> Los errores de control de acceso sobreviven a la revisión porque parecen código funcional: nada lanza errores, nada registra, y las pruebas pasan porque usualmente solicitan sus propios datos. El hábito que los detecta es llamar deliberadamente a tu propio endpoint como un usuario incorrecto.

---

## 02.0 Configuración Incorrecta de Seguridad

La configuración incorrecta de seguridad ascendió al segundo lugar en el OWASP Top 10 de 2025. A medida que las aplicaciones dependen cada vez más de servicios gestionados, contenedores e infraestructura definida como código, la superficie de ataque se desplaza hacia los ajustes y configuraciones.

### Configuraciones Comunes Incorrectas de Seguridad

- **Credenciales Predeterminadas:** Dejar sin cambiar los nombres de usuario y contraseñas predeterminados en paneles de administración, bases de datos o tableros.
- **Modo Debug Activado en Producción:** Revela mensajes de error detallados, rastros de pila, variables de entorno y rutas de archivos.
- **Mensajes de Error Verbosos:** Revelan versiones de librerías, estructuras de consultas o rutas internas.
- **Listado de Directorios Habilitado:** Exponer archivos y directorios privados.
- **Funciones o Puertos Innecesarios:** Dejar aplicaciones de ejemplo, puertos abiertos o servicios no usados habilitados.
- **Políticas de CORS Demasiado Permisivas:** Permitir que cualquier origen realice solicitudes autenticadas.
- **Buckets de Almacenamiento en la Nube Públicos:** Exponer copias de seguridad o datos sensibles.

### Configuración como Código y Valores Predeterminados Defensibles

- **Revisión:** Audita regularmente los ajustes de configuración.
- **Control de Versiones:** Mantén las configuraciones en control de versiones para rastrear cambios.
- **Separación de Entornos:** Usa configuraciones diferentes para desarrollo, pruebas y producción.
- **Valores Predeterminados Defensibles:** Los nuevos endpoints o funciones deben negar acceso a menos que se permita explícitamente.

---

## 02.1 Fallos en la Cadena de Suministro y de Integridad

### ¿Qué son los Fallos en la Cadena de Suministro de Software?

Ocurren cuando código no confiable o malicioso entra en tu aplicación a través de componentes y herramientas externos:
- **Registros de paquetes:** Paquetes comprometidos o ataques de *typosquatting*.
- **Pipelines de construcción y sistemas CI:** Código inyectado después de la revisión pero antes del despliegue.
- **Imágenes base y contenedores:** Imágenes con vulnerabilidades o modificaciones maliciosas.
- **Mantenedores:** Toma de control de un paquete legítimo por un mantenedor malicioso.

### ¿Qué son los Fallos de Integridad?

Ocurren cuando tu aplicación acepta código o datos sin verificar su autenticidad u origen:
- Cargar scripts desde CDNs de terceros sin comprobaciones de **Integridad de Subrecursos (SRI)**.
- Mecanismos de autoactualización que no verifican firmas digitales.
- Deserializar datos no confiables que pueden ejecutar código durante el proceso.

### Mejores Prácticas para Mitigar Estos Riesgos

1. **Usa Archivos de Bloqueo:** `package-lock.json`, `yarn.lock`, `uv.lock` para congelar el árbol de dependencias.
2. **Escaneo Automatizado de Dependencias:** Snyk o Dependabot en CI.
3. **Fija las Versiones Explícitamente:** Evita rangos flexibles como `^` o `~` en `package.json`.
4. **Revisa las Dependencias Transitivas:** Usa `npm ls` o `yarn why`.
5. **Usa SRI para Scripts de Terceros:**
   ```html
   <script src="https://cdn.example.com/lib.js" integrity="sha384-abc123..." crossorigin="anonymous"></script>
   ```
6. **Trata la Entrada Serializada como No Confiable:** Valida y sanitiza estrictamente JSON/XML externos.

---

## 03.0 Fallos Criptográficos

### ¿Qué Datos Necesitan Protección?

- Contraseñas
- Tokens de autenticación
- Información Personal Identificable (PII)
- Registros financieros y de salud
- Cualquier dato bajo cumplimiento regulatorio

> Si no es necesario almacenar datos, la opción más segura es no almacenarlos en absoluto.

### Protección de Datos en Tránsito y en Reposo

- **En Tránsito:** Usar canales seguros como **TLS** (incluso para tráfico interno/administrativo).
- **En Reposo:** Proteger datos almacenados en servidores o bases de datos con métodos criptográficos apropiados.

### Contraseñas: ¿Por Qué Hashing Lento con Sal?

- **Hashing:** Transformación irreversible en una cadena de tamaño fijo.
- **Salting:** Valor aleatorio único por contraseña para evitar tablas arcoíris.
- **Algoritmos lentos:** `bcrypt`, `scrypt` o `Argon2` encarecen los ataques de fuerza bruta.
- **Encriptar contraseñas es un error** porque es reversible si se compromete la clave.

### Fallos Criptográficos Comunes a Evitar

- Usar hashes rápidos (`MD5`, `SHA-1`) para contraseñas.
- Codificar o reutilizar claves criptográficas sin estrategia de rotación.
- Usar algoritmos débiles u obsoletos.
- Generar tokens con aleatoriedad predecible.
- Registrar contraseñas o tokens en URLs, logs o analíticas.

---

## 03.1 Inyección

### El Mecanismo Central de la Inyección

La **entrada no confiable llega a un intérprete que no puede distinguirla del código**.

### Tipos Comunes

- **Inyección SQL:** La entrada se concatena en una consulta SQL.
- **Inyección de Comandos:** La entrada se pasa a un shell del sistema.
- **Cross-Site Scripting (XSS):** La entrada maliciosa se ejecuta como script en el navegador.

### Cómo Defenderse: Separar el Código de los Datos

#### Prevención de Inyección SQL (Consultas Parametrizadas)
```javascript
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = $1';
const values = [userId];
client.query(query, values, (err, res) => {
  // manejar resultados
});
```

#### Prevención de Inyección de Comandos (Arrays de Argumentos)
```javascript
const { execFile } = require('child_process');
const filename = req.body.filename;
execFile('ls', ['-l', filename], (error, stdout, stderr) => {
  // manejar salida
});
```

#### Prevención de XSS (Escape Automático / Sanitización)
```jsx
function Comment({ text }) {
  return <div>{text}</div>; // React escapa el texto por defecto
}
```
*(Si se inserta HTML crudo, sanitizar primero con DOMPurify).*

---

## 04.0 Diseño Inseguro

### ¿Qué es el Diseño Inseguro?

Debilidades de seguridad que provienen de la forma en que un sistema es planeado o especificado, en lugar de errores de codificación. **Incluso un código impecable no puede arreglar un diseño fundamentalmente inseguro.**

| Aspecto | Error de Implementación | Diseño Inseguro |
| :--- | :--- | :--- |
| **Origen** | Error en la codificación | Especificación o arquitectura defectuosa |
| **Solución** | Corregir el código | Rediseñar el sistema o proceso |
| **Ejemplo** | Falta de validación de entrada | Confiar en precios enviados por el cliente |

### Ejemplos Concretos

- Proceso de pago que acepta el precio del artículo desde el cliente sin verificación.
- Restablecimiento de contraseña basado en preguntas de seguridad públicas.
- Recuperación de cuenta con intentos ilimitados (fuerza bruta).
- Sistemas de descuento sin límites de uso repetido.

### Introducción al Modelado de Amenazas

Práctica proactiva para anticipar posibles ataques antes de implementar: recorrer cada función paso a paso preguntando *"¿Qué pasa si el usuario miente aquí?"* o *"¿Qué pasa si este paso se repite muchas veces?"*.

---

## 04.1 Fallos de Autenticación

### Debilidades Comunes

1. **Manejo de Credenciales:** Permitir contraseñas filtradas, intentos ilimitados (relleno de credenciales), cuentas por defecto, reglas de complejidad obsoletas.
2. **Gestión de Sesiones:** IDs predecibles/expuestos, sesiones sin expiración, no regenerar ID tras login (fijación de sesión), tokens válidos tras cerrar sesión.
3. **Enumeración de Cuentas:** Formularios que revelan si un correo existe mediante mensajes distintos o tiempos de respuesta diferentes.

### Mejores Prácticas Modernas

1. **Limitar la Tasa de Intentos (Rate Limiting):**
   ```javascript
   const rateLimit = require('express-rate-limit');
   const RedisStore = require('rate-limit-redis');
   const redisClient = require('./redisClient');

   const loginLimiter = rateLimit({
     store: new RedisStore({ client: redisClient }),
     windowMs: 15 * 60 * 1000,
     max: 5,
     message: 'Demasiados intentos de inicio de sesión, por favor intente más tarde.',
     keyGenerator: (req) => req.body.email || req.ip,
   });
   ```
2. **Mensajes de Error Genéricos:**
   ```javascript
   if (!user || !passwordValid) {
     return res.status(401).send('Correo electrónico o contraseña inválidos');
   }
   ```
3. **Regeneración Segura de Sesión:** `req.session.regenerate(...)` al iniciar sesión.
4. **Autenticación Multifactor (MFA):** TOTP (p. ej. `speakeasy`) u otro segundo factor.

---

## 05.0 Registro y Alertas de Fallos

### ¿Qué Debe Registrarse?

- Éxitos y fallos de autenticación.
- Denegaciones de autorización.
- Fallos en la validación de entradas.
- Acciones administrativas y cambios de privilegios.
- Transacciones significativas (pagos, exportaciones).

Cada entrada debe incluir **quién, qué, cuándo y dónde** (IP o dispositivo).

### ¿Qué Nunca Debe Registrarse?

- Contraseñas.
- Tokens de autenticación o IDs de sesión.
- Detalles completos de tarjetas de pago.
- Información personal sensible.

### La Importancia de las Alertas

Los registros sin monitoreo son "polvo digital". Ajusta las alertas para evitar fatiga por falsos positivos y **pruébalas deliberadamente**, porque el registro falla silenciosamente.

---

## 05.1 Manejo Incorrecto de Condiciones Excepcionales

### Comportamiento Fail-Open vs Fail-Secure

Una condición **fail-open** ocurre cuando un error inesperado hace que la aplicación conceda acceso o continúe una operación que debería negar.

```javascript
// MAL: Fail-Open
try {
  const result = await verifyPayment();
  if (!result) throw new Error('Verificación fallida');
} catch (error) {
  fulfillOrder(); // Concede permiso a pesar de la falla
}

// BIEN: Fail-Secure
try {
  const result = await verifyPayment();
  if (!result) throw new Error('Verificación fallida');
  fulfillOrder();
} catch (error) {
  logError(error);
  return sendGenericErrorResponse();
}
```

### Evitar Divulgación de Información y Manejar Casos Límite

- **Mensajes genéricos al usuario**, traza detallada solo en logs internos del servidor.
- **Timeouts explícitos** (`AbortController`) para evitar agotamiento de recursos.
- **Transacciones atómicas con bloqueo** (`forUpdate()`) para evitar condiciones de carrera (como doble gasto).

---

## 06.0 Evaluación del Top 10 de OWASP

1. **¿Cómo se construyó el Top 10 de OWASP?** A partir de datos de cientos de miles de aplicaciones reales más una encuesta a profesionales, clasificados por prevalencia, explotabilidad e impacto.
2. **Endpoint `/api/invoices/1043` sin verificar propietario:** Control de Acceso Roto — la propiedad nunca fue verificada del lado del servidor en la solicitud.
3. **Por qué hashing lento y salado en lugar de cifrado:** Porque nunca se necesita el valor original, y el cifrado implica una clave que podría convertir todo el archivo de nuevo a texto plano.
4. **Mecanismo único tras SQLi, Command Injection y XSS:** Entrada no confiable llega a un intérprete que no puede distinguirla del código.
5. **Pago implementado a la perfección aceptando el precio del cliente:** Diseño Inseguro — un código perfecto no puede arreglar una especificación que dice que el cliente suministra el precio.
6. **Excepción en verificación de autorización devuelve "permitido":** Condición de fallo abierto — una decisión de seguridad que no pudo tomarse se resolvió en permiso en lugar de denegación.

---

## 07.0 Auditoría de Tus Propias Aplicaciones

1. Nombra cada categoría del OWASP Top 10:2025.
2. Pregúntate dónde podría aparecer ese riesgo en tu aplicación.
3. Identifica las defensas existentes (si no puedes nombrar una, es un hallazgo).
4. Prueba activamente manipulando IDs, roles y entradas inesperadas.
5. Documenta y prioriza correcciones según severidad e impacto.

### Recursos
- OWASP Top 10:2025
- Serie de Hojas de Trucos OWASP
- Estándar de Verificación de Seguridad de Aplicaciones OWASP (ASVS)
