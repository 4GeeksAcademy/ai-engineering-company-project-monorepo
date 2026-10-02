# 5. Tests y Git

## Parte A: los tests

Un **test** es un programa que comprueba que otro programa hace lo que debe. Sirve para no tener que probar todo a mano cada vez que cambias algo.

Comparación: son como la **lista de revisión de un piloto** antes de despegar. Repasa siempre lo mismo, sin olvidos.

### Tests del backend (42 pruebas)

Están en `services/api/tests/` y se ejecutan con:

```bash
cd services/api
uv run --with pytest --with httpx pytest -q
```

Comprueban, por ejemplo:

- Que el modelo tiene exactamente los campos del encargo.
- Que un estado inválido (`Active`, `activo`, vacío, `null`) da 422 y **no llega a la base**.
- Que una tarifa 0 o negativa da 422 en los tres caminos posibles.
- Que el cliente no puede enviar `updated_at`.
- Que crear devuelve 201 con el `id`, que un `id` inexistente da 404, y que borrar dos veces da 404 la segunda.
- Que borrar un proveedor suspendido da 409 y no lo elimina, y que un email inválido da 422.

Cada test usa una **base de datos temporal**, así nunca toca los datos reales.

### Test del frontend (28 comprobaciones)

Está en `uis/application/e2e/suppliers.e2e.mjs`. "e2e" significa *end to end*: **de punta a punta**. Abre un navegador real y usa la página como una persona:

1. Comprueba que la lista carga 15 filas.
2. Prueba los filtros y que la página **no se recarga**.
3. Rellena el formulario mal (vacío, tarifa negativa, email inválido) y comprueba que se bloquea.
4. Fuerza un rechazo de la API y comprueba que se muestra el mensaje.
5. Cambia una tarifa y un estado, y comprueba que **también quedó guardado en el servidor**.
6. Comprueba los colores y la atenuación de las filas suspendidas.
7. Crea proveedores con renovación a 30 y a 61 días y comprueba que solo el primero se resalta.

Para ejecutarlo:

```bash
cd services/api && uv run seed --reset      # base limpia
# (con la API y la app arrancadas)
cd uis/application && npm run e2e
```

Importante: este test crea proveedores y modifica otro, así que hay que volver a sembrar (`--reset`) antes de repetirlo.

Por defecto usa Chromium. Para probar en Firefox: `E2E_BROWSER=firefox npm run e2e` (antes, `npx playwright install firefox`). Se ejecutó en los dos y pasa en ambos.

### La prueba del "todo verde"
Si un test nunca falla, no sirve. Por eso, además de comprobar que pasan, se comprobó a propósito que **fallan cuando deben** (por ejemplo, una segunda ejecución sin re-sembrar da error, como está previsto).

---

## Parte B: Git y las ramas

### Qué es Git
**Git** guarda la historia de tu proyecto, como los "guardados" de un videojuego. Cada guardado se llama **commit** y lleva un mensaje que explica qué cambió.

**GitHub** es la web donde se guarda una copia en internet de esa historia.

### Qué es una rama
Una **rama** es una línea de trabajo paralela. Imagina un documento compartido:

- `main` es **la versión oficial**.
- Una rama es **una copia en la que trabajas** una idea sin estropear la oficial.
- Cuando la idea está lista, se propone unirla a la oficial con un **Pull Request** (PR): "he hecho esto, ¿lo revisas y lo unes?".

### Cómo se ordenó este proyecto
Todo el trabajo se había hecho directamente sobre `main`. Para que sea fácil de entender, se crearon **6 ramas encadenadas**, cada una mostrando una etapa. Cada rama parte de la anterior:

```
base/pre-suppliers                       ← el punto de partida
 └─ 01-api                     (PR #3)   la API de proveedores
     └─ 02-backoffice-page     (PR #4)   la página web (entonces en backoffice)
         └─ 03-seeder          (PR #5)   uv run seed
             └─ 04-rate-filters-delete (PR #6)   tarifa, filtros, borrado
                 └─ 05-tests-and-routes (PR #7)  tests y rutas /suppliers
                     └─ 06-ui-validation-e2e (PR #8)  validación y test en navegador
```

En GitHub, entra a la pestaña **Pull requests** y ábrelos del #3 al #8. En cada uno, la pestaña **Files changed** muestra solo lo que añadió esa etapa.

Detalles honestos:
- Las ramas se crearon **después**, así que apuntan a commits que ya estaban en `main`. Por eso `main` no cambió ni se reescribió.
- Los commits estaban entremezclados en el tiempo, así que el PR #7 junta cosas de backend con un arreglo de frontend.

### Seguridad al trabajar con Git
- Nunca se usó `git push --force` ni se reescribió el historial.
- Los PR se crearon en **tu copia** (tu *fork*), no en el repositorio original de 4Geeks. Para eso se indicó siempre el repositorio de forma explícita.
- Se hizo un commit por cada idea, con un mensaje que explica el **porqué**.

### Ramas posteriores

Después de las 6 ramas de la serie se hizo una revisión completa contra el encargo. Sus correcciones fueron en su propia rama, `fix/audit-followups` (PR #9): no borrar suspendidos, validar el email y resaltar mejor las renovaciones. Esta guía va en otra rama, `docs/aprendiendo-con-la-ia`, que parte de la anterior.

### La rama de entrega

La entrega pide el código en una estructura concreta y un Pull Request al repositorio original. Por eso se hizo una rama final, `delivery/suppliers-directory`, que parte de la de la guía y añade: el backend reorganizado (`models.py`, `database.py`, `routes/suppliers.py`, `seed.py`), la app `uis/application/app/suppliers/` y las tres capturas que pide el PR (`docs/screenshots/suppliers-*.png`).

### La regla de aquí en adelante
Cada cambio nuevo se hace en **su propia rama** y se propone con un Pull Request, sin tocar `main` directamente. Esta carpeta misma se creó en la rama `docs/aprendiendo-con-la-ia`.
