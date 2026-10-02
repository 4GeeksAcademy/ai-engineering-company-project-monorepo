# 4. Decisiones y problemas (y cómo se resolvieron)

Programar no es escribir código perfecto a la primera. Es **tomar decisiones y arreglar errores**. Aquí están las de este proyecto, contadas con honestidad, incluidos los errores propios.

---

## Decisiones importantes

### 1. Seguir la estructura que ya existía
En `services/api/` ya había un módulo (`incidents/`) con tres archivos: `router`, `schemas`, `service`. Se copió esa misma organización para `suppliers/`.

**Por qué:** un proyecto es más fácil de entender cuando todo se parece. Quien conozca una parte, entiende las demás.

### 2. Usar exactamente los datos del encargo
Al principio no existía el archivo con los proveedores reales, así que se **inventó** una lista de ejemplo con campos razonables. Después apareció el archivo `CONTEXT-suppliers.md` con el modelo verdadero (países `Spain`/`USA`, `categories` como lista, `monthly_rate`, moneda según país, etc.) y **se reescribió todo** para que coincidiera.

**Por qué:** un ejercicio se evalúa contra el encargo, no contra lo que uno cree razonable. Además, se comprobó con un script que los campos, las 9 categorías, los 2 estados y los 15 proveedores coinciden con el encargo dato por dato.

**Lección:** cuando falta información, di qué supusiste y cámbialo en cuanto llegue la verdadera.

### 3. Un archivo del encargo que no existía
Se pidió leer un `CONTEXT-company.md`. Se buscó en todo el repositorio y **no existe**. En lugar de inventar su contenido, se dijo claramente, y se explicó que el archivo más parecido era `CONTEXT-suppliers.md`.

**Lección:** no aparentes haber leído algo que no existe.

### 4. Preguntar cuando la duda es real
Cuando se dijo "parte desde cero", había dos lecturas posibles y una implicaba borrar código de otros hitos. Se preguntó antes de tocar nada. Lo mismo con cómo ordenar las ramas.

**Lección:** una pregunta de 10 segundos es más barata que borrar algo por error.

### 5. Base de datos ligera (TinyDB)
Lo pidió el tech lead. TinyDB guarda todo en un archivo, sin servidor. Es perfecto para empezar, pero tiene límites: no aguanta muchos usuarios escribiendo a la vez. Por eso el README lo avisa y dice que luego se pasará a Postgres.

### 6. Estados en inglés (`active` / `suspended`)
El encargo los define así. Aunque la empresa sea española, se respetó el encargo. Si alguien envía `"activo"`, se rechaza.

### 7. Reorganizar todo para la entrega
Al final, la entrega pidió una estructura concreta: en el backend `main.py`, `models.py`, `database.py`, `routes/suppliers.py` y `seed.py`; y en el frontend `uis/application/app/suppliers/`. El código ya funcionaba, así que solo se **movió** con `git mv` (para conservar el historial) y se adaptaron los imports. Se comprobó que nada cambió: las mismas 42 pruebas pasan y la prueba de navegador da 28 de 28. La página de proveedores salió de `uis/backoffice/` a la nueva app `uis/application/`, y el backoffice se quedó con el análisis de incidentes.

**Lección:** reorganizar no es reescribir. Si las pruebas pasan igual antes y después, sabes que no rompiste nada.

---

## Problemas que aparecieron

Hay 19 en total. Los cuatro siguientes al 14 salieron de la revisión final contra el encargo, y el último de la reorganización para la entrega.

### Problema 1: la ruta no coincidía con lo que se pedía
**Qué pasó:** se creó `/api/suppliers`, pero los criterios pedían `/suppliers`. Un evaluador que probara `/suppliers` habría recibido un 404.

**Solución:** las mismas rutas se sirven en **dos direcciones**: `/suppliers` (la documentada) y `/api/suppliers` (la de la página).

**Por qué no cambiar solo la dirección:** el proxy de Vite solo reenvía lo que empieza por `/api`, y `/suppliers` es además una página del frontend. Si Vite reenviara `/suppliers` a la API, la página nunca se abriría.

### Problema 2: el cliente podía enviar la fecha de auditoría
**Qué pasó:** si alguien mandaba `updated_at` en una petición, la API lo **ignoraba sin avisar**. No era peligroso (no se guardaba), pero tampoco decía "esto no lo puedes enviar".

**Solución:** `extra="forbid"` en los modelos de entrada. Ahora responde 422. Además hay tests que lo comprueban.

### Problema 3: el seeder tenía un hueco
**Qué pasó:** la primera versión solo sembraba si la base estaba **completamente vacía**. Si ya había un proveedor propio, no cargaba los 15.

**Solución:** ahora compara por nombre y añade solo los que faltan. Se probó con una base parcial (uno borrado, uno propio añadido): repuso el borrado y respetó el propio.

**Pero:** al **arrancar la API** se mantiene la regla antigua (solo si está vacía). Motivo: el nombre se puede editar; si alguien renombra un proveedor y la API reiniciara "reponiendo por nombre", volvería a aparecer el original y quedaría un duplicado. Así, reponer por nombre es algo que se hace **a mano**, con `uv run seed`.

**Lección:** una decisión puede tener sentido en un sitio y ser un riesgo en otro.

### Problema 4: `uv run seed` fallaba
**Qué pasó:** al ejecutarlo desde la raíz del repositorio salió `Failed to spawn: seed`.

**Por qué:** `uv` busca el archivo `pyproject.toml` en la carpeta donde estás. La raíz no tiene uno; está en `services/api/`.

**Solución:** ejecutarlo desde `services/api`, o desde la raíz con `uv run --project services/api seed`. Se dejó escrito en el README.

### Problema 5: la tarifa cero o negativa
Ya estaba prevista (`gt=0`), pero se comprobó **en todos los caminos** que aceptan tarifa: el alta, la ruta `/rate` y la edición general. Y se comprobó que, tras cada rechazo, **la base de datos quedó intacta**.

### Problema 6: ¿cuándo se actualiza `updated_at`?
**Qué pasó:** la edición general solo actualiza `updated_at` si la tarifa **realmente cambió**; la ruta `/rate` la actualiza **siempre**.

**Decisión:** se dejó así y se avisó. Una llamada a `/rate` es una acción explícita "cambiar la tarifa", así que se registra siempre. Si se prefiere lo contrario, es un cambio de una línea.

### Problema 7: un mensaje de error con ":" sobrante
**Qué pasó:** cuando la API rechazaba algo que afecta a varios campos (moneda que no cuadra con el país), el mensaje salía como `: currency must be...` con dos puntos al inicio.

**Solución:** se arregló en `api.ts` para que el mensaje salga limpio.

### Problema 8: un error sin capturar
**Qué pasó:** al editar una tarifa, si la API la rechazaba, el error se "escapaba" sin ser recogido en esa fila (aparecía en la consola del navegador).

**Solución:** se captura, el editor se queda abierto para corregir, y el aviso rojo ya lo muestra la página.

### Problema 9: el borrado contradice el encargo
**Qué pasó:** el encargo dice que los proveedores suspendidos **no se eliminan** (para conservar el historial). Al principio no se hizo el `DELETE`. Después se pidió expresamente, y se añadió permitiendo borrar cualquiera, dejando solo una nota de aviso. Eso seguía contradiciendo el encargo.

**Solución:** en la revisión final se cumplieron las dos cosas a la vez. `DELETE /suppliers/{id}` borra a los proveedores **activos** (204) y a los **suspendidos** los rechaza con **409** (conflicto), explicando por qué. Un `id` inexistente sigue dando 404. Un test lo comprueba: Greenhouse (suspendido) no se puede borrar, pero si se reactiva sí.

**Lección:** un aviso en un comentario no es cumplir una regla. Si el encargo dice "no", el código debe impedirlo.

### Problema 10: un test que daba un "aprobado" falso
**Qué pasó:** al comprobar que el color del botón cambia de verde a rojo, la primera medida salió casi igual (dos verdes). Estaba midiendo **a mitad de la animación** de cambio de color, y el test dijo "correcto" cuando no lo era.

**Solución:** esperar a que termine la animación y comprobar los colores exactos (verde `rgb(110, 231, 183)` frente a rojo `rgb(253, 164, 175)`).

**Lección:** un test que siempre pasa no prueba nada. Desconfía de un "todo verde" y comprueba que el test **puede fallar**.

### Problema 11: no había navegador para probar la página
**Qué pasó:** al principio solo se comprobaba que el código **compilaba**. Eso no demuestra que la pantalla funcione.

**Solución:** se instaló **Playwright**, que abre un navegador real (Chromium) y usa la página como una persona: hace clic, escribe, filtra. Ahí aparecieron los dos huecos reales: faltaba mostrar `contact_email` y la validación del formulario dejaba pasar un nombre de solo espacios.

### Problema 12: comandos que se mataban a sí mismos
**Qué pasó:** varias veces un comando salió con "Exit code 144". Se usaba `pkill -f "uvicorn main:app"` para detener el servidor, pero el propio comando **contenía ese texto**, así que `pkill` se detenía a sí mismo.

**Solución:** guardar el script en un archivo y ejecutarlo por su ruta, para que el texto no aparezca en la línea de comandos.

**Lección:** no todos los errores están en tu código; a veces está en cómo lo lanzas.

### Problema 13: `package-lock.json` cambiado sin motivo
Aparecía modificado antes de empezar (un npm más antiguo quitaba campos `libc`). No afecta al código, así que se commiteó **aparte**, en su propio commit, para poder revertirlo sin tocar nada más.

### Problema 14: el archivo de la base de datos no debe subirse
`db.json` es un archivo que se **genera** al ejecutar la API. Subirlo a Git sería subir datos de prueba y provocar conflictos. Se añadió a `.gitignore` (dentro de `services/api/`, para que el backend sea autocontenido).

### Problema 15: el email no se validaba en la API
**Qué pasó:** el formulario comprobaba que el email pareciera un email, pero la API aceptaba cualquier texto en `contact_email`. Quien llamara a la API directamente se saltaba la comprobación.

**Solución:** la API también lo valida (algo con `@` y un dominio). Es opcional: si no se envía o es `null`, no se comprueba. Se añadieron tests para los dos casos.

**Lección:** la validación de la página es comodidad; la de la API es la que protege de verdad.

### Problema 16: el resaltado de renovaciones apenas se veía
**Qué pasó:** las renovaciones a 60 días o menos tenían un fondo ámbar casi invisible (5% de opacidad). Cumplía, pero no "destacaba visualmente" como pide el encargo. Además, con los datos iniciales todas las fechas son de 2025, así que nunca se veía en acción.

**Solución:** fondo más marcado y una barra ámbar a la izquierda. Y el test crea proveedores con renovación a 30 y a 61 días para comprobar que el resaltado se ve en uno y en el otro no.

### Problema 17: otro test con nombre confuso
**Qué pasó:** el test nuevo daba fallo aunque la página estaba bien. Buscaba el texto "Renueva en" en la fila del proveedor de prueba, pero el propio **nombre** del proveedor era "Renueva en 61 dias".

**Solución:** buscar el texto exacto del aviso (`Renueva en N días`, con tilde), que el nombre no contiene.

**Lección:** cuando un test falla, primero pregunta si falla el programa o falla el test.

### Problema 18: probar en un solo navegador
**Qué pasó:** todas las pruebas de la página se habían hecho solo en Chromium.

**Solución:** la prueba acepta `E2E_BROWSER=firefox` y se ejecutó también en Firefox: pasa en ambos.

### Problema 19: un comando antiguo cambió de rama por sorpresa
**Qué pasó:** durante la reorganización, una tarea que había quedado colgada en segundo plano desde antes terminó de golpe y ejecutó por fin sus últimas órdenes: `git branch -f …` y `git switch …`. Sin avisar, movió el árbol de trabajo a otra rama, con la estructura antigua del backend, y desplazó hacia atrás el puntero local de la rama de la guía.

**Cómo se descubrió:** al ver que el estado de git ya no era el esperado (rama distinta y carpetas antiguas de vuelta), se paró todo y se miró `git reflog` y `git branch -vv` antes de tocar nada.

**Solución:** no se perdió nada, porque el commit de la guía seguía en GitHub y el del backend estaba en su rama. Se guardaron los cambios sin commitear con `git stash`, se volvió a la rama correcta, se recuperaron con `git stash pop` y se restauró la rama de la guía a su commit original. Después se repitieron las pruebas.

**Lección:** Git casi nunca pierde trabajo si lo has commiteado o subido; y antes de "arreglar" algo raro, mira primero qué pasó (`git status`, `git reflog`). También: no dejes tareas largas en segundo plano con comandos de Git al final.
