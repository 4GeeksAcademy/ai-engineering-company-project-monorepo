# Directorio de Proveedores — API con Almacenamiento Ligero

<!-- hide -->

Por [@4GeeksAcademy](https://github.com/4GeeksAcademy) y [otros colaboradores](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo/graphs/contributors) en [4Geeks Academy](https://4geeksacademy.com/)

[![build by developers](https://img.shields.io/badge/build_by-Developers-blue)](https://4geeks.com)
[![4Geeks Academy](https://img.shields.io/twitter/follow/4geeksacademy?style=social&logo=x)](https://x.com/4geeksacademy)

_These instructions are also available in [English](./README.md)._

<!-- endhide -->

**Antes de comenzar:** Lee tu **[company-BRIEFING.md](https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/contexts/supplier-directory)** antes de escribir una sola línea de código — define los campos exactos del proveedor, las categorías válidas, los estados permitidos y los datos iniciales que debe cargar tu seeder.

---

## 🎯 Tu reto

> 📌 Estás construyendo sobre **tu copia** del **[monorepo](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo)** de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.

Ya tienes endpoints FastAPI funcionando y sabes cómo estructurar una API. La plataforma de tu empresa sigue creciendo — y con ella, la necesidad de eliminar los puntos de fallo que frenan al equipo. Uno de los más evidentes: los datos críticos del negocio siguen viviendo en hojas de cálculo que cada persona tiene en su ordenador, actualiza por su cuenta y comparte por email. El resultado es siempre el mismo — versiones desincronizadas, decisiones tomadas con datos distintos y tiempo perdido intentando saber cuál es el fichero correcto. Es el momento de sustituir eso por una base de datos con una única fuente de verdad, accesible a todos desde la API — sin SQL todavía, pero con estructura real desde el primer día.

El área de compras de tu empresa gestiona actualmente su directorio de proveedores en una hoja de cálculo. La información clave —qué suministra cada proveedor, en qué país opera, cuál es su tarifa vigente y si está activo o suspendido— se actualiza de forma manual, inconsistente y sin trazabilidad. Cuando el precio de un ingrediente o componente sube, el equipo se entera tarde. Cuando hay que incorporar un proveedor nuevo, nadie sabe dónde registrarlo oficialmente.

Tu tech lead ha decidido construir una API de gestión de proveedores usando **FastAPI + TinyDB + Pydantic**. La decisión de usar TinyDB es deliberada: no siempre hace falta una base de datos de gran escala para resolver bien un problema. Una solución ligera, que no demanda recursos excesivos y puede desplegarse de inmediato, puede ser exactamente la herramienta correcta para el trabajo. La solución debe arrancar con datos reales desde el primer momento —no con una base de datos vacía— y tiene que rechazar cualquier entrada que no cumpla la estructura definida.

> ### 📋 ¿Qué es un seeder?
>
> Un seeder es un script que carga datos iniciales en la base de datos antes de que la aplicación empiece a usarse. Es una práctica estándar en desarrollo backend: permite que el sistema arranque con un estado conocido y realista, útil tanto para pruebas como para demostraciones. En este proyecto, el seeder importará el directorio de proveedores existente que hoy vive en una hoja de cálculo — exactamente lo que ocurre cuando una empresa migra de Excel a una herramienta propia.

> **Nota de tu tech lead:**
>
> _"Necesito el directorio operativo antes del jueves. Usa TinyDB — ya migraremos a Postgres cuando tengamos el ORM listo. El seeder tiene que cargar todos los proveedores del BRIEFING desde el arranque; no quiero ver una base de datos vacía en la demo. Pydantic valida todo lo que entra: si un proveedor no tiene país o su estado no es uno de los dos valores permitidos, la API lo rechaza con un 422 antes de que toque la base de datos. Dos endpoints de búsqueda imprescindibles: filtrar por país y filtrar por categoría de producto. Y cuando se actualice una tarifa, quiero que quede registrado el timestamp del cambio — ese dato lo va a necesitar el equipo para auditorías."_

> 🔀 **PR aprobado → haz merge a `main`.** Si no, la funcionalidad no se despliega y tu siguiente rama parte de código desactualizado, lo que acaba en conflictos de merge.

---

## 🌱 Cómo empezar

1. Trabaja en el repositorio [**ai-engineering-company-project-monorepo**](https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo). Si aún no lo has configurado, haz fork, luego ábrelo en **GitHub Codespaces** o clónalo localmente:

   ```text
   https://github.com/4GeeksAcademy/ai-engineering-company-project-monorepo
   ```

2. Lee tu archivo **company-BRIEFING.md** antes de escribir código. Define los campos del modelo de proveedor, las categorías válidas, los estados permitidos y los datos que debe cargar el seeder.

3. Trabaja dentro de las carpetas `/services/api` (backend) y `/uis/backoffice` (frontend) del monorepo.

No hay código de inicio. El proyecto parte desde cero.

---

## 💻 Qué tienes que hacer

### Modelo de datos

- [ ] Define el modelo Pydantic `Supplier` con los campos requeridos según tu BRIEFING: nombre, país, categorías de producto, el campo de tarifa definido en tu BRIEFING, `updated_at` y estado.
- [ ] El campo `status` debe aceptar únicamente los valores definidos en tu BRIEFING (activo / suspendido o sus equivalentes). Usa un `Enum` o un validador de campo para rechazar cualquier otro valor.
- [ ] El campo de tarifa definido en tu BRIEFING debe ser un número positivo. Pydantic debe rechazar valores cero o negativos antes de que el dato llegue a TinyDB.
- [ ] Crea modelos de entrada y de respuesta separados cuando sea necesario (por ejemplo: el campo `updated_at` lo genera el sistema, no lo envía el cliente).

### Seeder

- [ ] Crea un script `seed.py` que cargue los proveedores iniciales definidos en tu BRIEFING en TinyDB.
- [ ] El seeder debe poder ejecutarse con `uv run seed` sin modificar el código.
- [ ] Si la base de datos ya tiene datos, el seeder no debe duplicarlos — verifica antes de insertar.
- [ ] Confirma en consola cuántos registros se han insertado al finalizar.

### Endpoints

- [ ] `POST /suppliers` — Registra un proveedor nuevo. Devuelve el proveedor creado con su ID asignado por TinyDB. Rechaza entradas inválidas con `422`.
- [ ] `GET /suppliers` — Lista todos los proveedores. Admite parámetros opcionales de query para filtrar por país y por categoría de producto. Si no se pasan parámetros, devuelve todos.
- [ ] `GET /suppliers/{id}` — Devuelve el detalle de un proveedor por su ID. Devuelve `404` si no existe.
- [ ] `PATCH /suppliers/{id}/rate` — Actualiza la tarifa de un proveedor. Registra automáticamente el `updated_at` con la fecha y hora del cambio. No acepta tarifas iguales o menores a cero.
- [ ] `PATCH /suppliers/{id}/status` — Activa o suspende un proveedor. Solo acepta los dos valores de estado definidos en el BRIEFING.
- [ ] `DELETE /suppliers/{id}` — Elimina un proveedor del directorio. Devuelve `404` si el ID no existe.

⚠️ **IMPORTANTE:** Los nombres de campos, categorías válidas y estados permitidos en tu implementación deben coincidir exactamente con lo especificado en tu BRIEFING.md. Una implementación genérica que ignore el contexto de tu empresa no será aceptada.

### Frontend (`/uis/backoffice`)

- [ ] Crea una página de directorio de proveedores accesible desde el menú de la aplicación.
- [ ] Muestra el listado completo de proveedores en una tabla o lista con sus campos principales: nombre, país, categorías, el campo de tarifa de tu BRIEFING y estado.
- [ ] Incluye controles de filtrado por país y por categoría que actualicen el listado sin recargar la página.
- [ ] Implementa un formulario para registrar un proveedor nuevo que consuma el endpoint `POST /suppliers`. Muestra un mensaje de error si la API rechaza la entrada.
- [ ] Permite actualizar el campo de tarifa definido en tu BRIEFING desde la interfaz y refleja el cambio en el listado inmediatamente.
- [ ] Permite cambiar el estado de un proveedor (activar / suspender) desde la interfaz con un control visible en cada fila o en la vista de detalle.
- [ ] Diferencia visualmente los proveedores activos de los suspendidos (por ejemplo, con un badge de color o estilo diferenciado).

---

## ✅ Qué vamos a evaluar

### Modelo y validación

- [ ] El modelo Pydantic refleja exactamente los campos definidos en el BRIEFING.
- [ ] Valores de `status` fuera del conjunto permitido son rechazados con `422` antes de llegar a TinyDB.
- [ ] El campo de tarifa definido en tu BRIEFING: valores cero o negativos son rechazados con `422`.
- [ ] El campo `updated_at` es generado por el sistema, no enviado por el cliente.

### Seeder

- [ ] `uv run seed` se ejecuta sin errores y carga los proveedores del BRIEFING en la base de datos.
- [ ] La ejecución repetida del seeder no produce duplicados.
- [ ] El número de registros insertados se confirma en consola al finalizar.

### Endpoints

- [ ] `POST /suppliers` crea un proveedor y devuelve el objeto completo con ID.
- [ ] `GET /suppliers` sin parámetros devuelve todos los proveedores.
- [ ] `GET /suppliers?country=X` devuelve únicamente los proveedores del país indicado.
- [ ] `GET /suppliers?category=Y` devuelve únicamente los proveedores que suministran esa categoría.
- [ ] `GET /suppliers/{id}` devuelve `404` para IDs inexistentes.
- [ ] `PATCH /suppliers/{id}/rate` actualiza la tarifa y registra el timestamp del cambio.
- [ ] `PATCH /suppliers/{id}/status` rechaza valores de estado no permitidos con `422`.
- [ ] `DELETE /suppliers/{id}` devuelve `404` para IDs inexistentes.

### Frontend

- [ ] El listado de proveedores se carga desde la API y muestra los campos definidos en el BRIEFING.
- [ ] Los filtros por país y por categoría funcionan y actualizan el listado sin recargar la página.
- [ ] El formulario de registro valida en cliente los campos requeridos y muestra el error de la API si el servidor rechaza la entrada.
- [ ] La actualización de tarifa y el cambio de estado se reflejan en la interfaz tras la respuesta de la API.
- [ ] Los proveedores activos y suspendidos se distinguen visualmente.

### Transversales

- [ ] La base de datos TinyDB persiste correctamente: los datos siguen ahí después de reiniciar el servidor.
- [ ] Los errores HTTP son coherentes: `404` cuando no se encuentra, `422` cuando la entrada es inválida, `200`/`201` cuando la operación es exitosa.
- [ ] El código está organizado según la estructura de carpetas del monorepo (`services/` para el backend, `uis/backoffice` para el frontend).

---

## 📦 Cómo entregar este proyecto

El proyecto debe estar organizado en el monorepo de la siguiente forma:

```text
services/
  api/
    main.py           ← aplicación FastAPI
    models.py         ← modelos Pydantic
    database.py       ← inicialización de TinyDB
    routes/
      suppliers.py    ← endpoints del directorio de proveedores
    seed.py           ← script de carga de datos iniciales
uis/
  application/
    app/
      suppliers/      ← página de directorio de proveedores
```

1. Sube tu rama con la estructura anterior y abre un Pull Request al repositorio original.
2. Asegúrate de que el PR incluye:
   - Una captura del resultado de `uv run seed` en la terminal.
   - Una captura de la respuesta de al menos uno de los endpoints de filtrado (por país o por categoría) en Swagger UI o un cliente HTTP.
   - Una captura del listado de proveedores en la interfaz web con al menos un filtro aplicado.

---

Este y muchos otros proyectos son construidos por estudiantes como parte de los [Coding Bootcamps](https://4geeksacademy.com/) de 4Geeks Academy. Encuentra más acerca de los [cursos](https://4geeksacademy.com/es/comparar-programas) de [Full-Stack Software Developer](https://4geeksacademy.com/es/programas-de-carrera/desarrollo-full-stack), [Data Science & Machine Learning](https://4geeksacademy.com/es/programas-de-carrera/ciencia-de-datos-ml), [Ciberseguridad](https://4geeksacademy.com/es/programas-de-carrera/ciberseguridad) e [Ingeniería de IA](https://4geeksacademy.com/es/programas-de-carrera/ingenieria-ia).
