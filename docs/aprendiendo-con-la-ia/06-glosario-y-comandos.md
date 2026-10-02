# 6. Glosario y comandos

## Ver el proyecto funcionando

Necesitas **dos terminales**: una para la API y otra para la página. Abre la terminal en VS Code (menú Terminal, Nueva terminal).

**La raíz del repositorio** es la carpeta principal del proyecto:

```
/workspaces/ai-engineering-company-project-monorepo-INES
```

Si tu terminal no está ahí, escribe:

```bash
cd /workspaces/ai-engineering-company-project-monorepo-INES
```

### Terminal 1: la API

```bash
cd services/api
uv run uvicorn main:app --reload --port 8000
```

Al arrancar carga sola los 15 proveedores. Puedes ver la lista en bruto en http://localhost:8000/suppliers y la documentación interactiva en http://localhost:8000/docs (ahí puedes probar cada acción con un botón).

### Terminal 2: la página

Desde la raíz del repositorio:

```bash
npm run dev:application
```

Abre http://localhost:5175/suppliers. En Codespaces, abre el puerto **5175** desde la pestaña **Puertos**.

### Volver a los datos iniciales

```bash
cd services/api
uv run seed --reset
```

Hazlo antes de una demostración.

### Ejecutar las pruebas

```bash
cd services/api
uv run --with pytest --with httpx pytest -q
```

---

## Glosario

| Palabra | Qué significa |
|---|---|
| **API** | Programa que recibe peticiones y responde. Es la "cocina" del restaurante |
| **Backend** | La parte que no se ve: guarda datos y aplica reglas |
| **Frontend** | La parte que se ve: la página web |
| **Endpoint** | Cada "puerta" de la API, por ejemplo `GET /suppliers` |
| **Petición (request)** | Un mensaje al servidor: "dame la lista" |
| **Respuesta (response)** | Lo que el servidor devuelve |
| **JSON** | Formato de texto para intercambiar datos: `{"name": "Gusto", "country": "USA"}` |
| **CRUD** | Las 4 acciones básicas: Crear, Leer, Actualizar y Borrar |
| **HTTP** | El idioma con el que se hablan navegador y servidor |
| **Código 200** | Todo bien |
| **Código 201** | Se creó algo |
| **Código 204** | Hecho, sin nada que devolver |
| **Código 404** | No se encontró lo que pedías |
| **Código 409** | Conflicto: lo que pides choca con una regla (borrar un proveedor suspendido) |
| **Código 422** | Los datos enviados no son válidos |
| **Validación** | Comprobar que un dato cumple las reglas antes de aceptarlo |
| **Pydantic** | La herramienta que valida los datos en el backend |
| **Enum** | Lista cerrada de valores permitidos |
| **Modelo / schema** | La descripción de los campos y reglas de algo (un proveedor) |
| **TinyDB** | Base de datos muy simple que guarda todo en un archivo `db.json` |
| **Base de datos** | Lugar donde se guardan los datos de forma ordenada y permanente |
| **Persistencia** | Que los datos sigan ahí después de apagar y encender el programa |
| **Seeder** | Script que llena la base con datos iniciales |
| **Idempotente** | Que repetirlo no cambia el resultado (el seeder no duplica) |
| **FastAPI** | La herramienta con la que se construye la API en Python |
| **Uvicorn** | El programa que "enciende" la API y la deja escuchando |
| **uv** | Herramienta que instala y ejecuta programas de Python |
| **React** | Herramienta para construir páginas con piezas (componentes) |
| **Componente** | Una pieza reutilizable de la página |
| **Estado (state)** | Lo que la página recuerda: la lista, los filtros, los errores |
| **Proxy** | Intermediario que reenvía las peticiones de un sitio a otro |
| **Vite** | Herramienta que arranca la página en tu ordenador |
| **Tailwind** | Herramienta para dar estilo con clases cortas |
| **TypeScript** | JavaScript con tipos, que evita errores antes de ejecutar |
| **Test** | Programa que comprueba que otro programa funciona |
| **e2e (end to end)** | Test que usa la página en un navegador real, de punta a punta |
| **Playwright** | La herramienta que controla el navegador en los tests e2e |
| **Git** | Sistema que guarda la historia de tu proyecto |
| **Commit** | Un "guardado" con mensaje dentro de Git |
| **Rama (branch)** | Línea de trabajo paralela, para no tocar la versión oficial |
| **`main`** | La rama oficial del proyecto |
| **Pull Request (PR)** | Propuesta para unir una rama a otra, para que se revise |
| **Fork** | Tu copia personal de un repositorio en GitHub |
| **Push** | Subir tus commits a GitHub |
| **`.gitignore`** | Lista de archivos que Git debe ignorar (como `db.json`) |
| **Repositorio (repo)** | La carpeta del proyecto con toda su historia |
| **Monorepo** | Un repositorio que contiene varios proyectos a la vez |

---

## Consejos para seguir aprendiendo

1. **Empieza por lo pequeño.** Abre `services/api/models.py` y cambia algo pequeño (por ejemplo, prueba a cambiar `gt=0` a `gt=10`). Mira qué se rompe y qué test falla. Luego deshazlo.
2. **Mira la API en vivo.** Abre http://localhost:8000/docs y pulsa "Try it out" en cada endpoint. Es la mejor forma de entender qué pide y qué responde.
3. **Rompe cosas a propósito.** Envía un país inventado y mira el error 422. Los errores enseñan más que los aciertos.
4. **Lee un test para entender una función.** Los archivos de `tests/` explican con ejemplos qué debe hacer cada parte.
5. **Pregunta el "porqué".** Si una decisión de este proyecto no se entiende, pregúntala: entender el motivo vale más que memorizar el código.
