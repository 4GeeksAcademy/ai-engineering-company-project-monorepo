# AGENTS.md

## 1. Contexto obligatorio al iniciar una sesión

Antes de realizar cualquier cambio en el repositorio, el agente debe leer y considerar estos documentos:

1. `CONTEXT.md`
2. `memory-bank/projectbrief.md`
3. `memory-bank/techContext.md`
4. `memory-bank/progress.md`

Estos documentos contienen el contexto de negocio, los objetivos del proyecto, las decisiones técnicas y el estado actual del desarrollo.

El agente debe revisar también la estructura existente del repositorio y los `README.md` relevantes antes de crear nuevas aplicaciones, servicios, carpetas o configuraciones.

No debe asumir que una funcionalidad no existe simplemente porque no esté documentada en el contexto. Debe revisar primero el código existente.

---

## 2. Principios de trabajo

* Trabajar siempre sobre el monorepo existente.
* No crear un repositorio nuevo.
* Reutilizar las funcionalidades y estructuras existentes cuando sea apropiado.
* Evitar duplicar código, configuraciones o funcionalidades ya existentes.
* Realizar cambios pequeños y coherentes con el objetivo solicitado.
* No modificar archivos no relacionados con la tarea.
* Mantener separadas las aplicaciones y proyectos que tengan responsabilidades diferentes.
* Antes de crear una nueva estructura, comprobar si ya existe una estructura equivalente en el repositorio.
* Mantener las decisiones técnicas documentadas cuando afecten a la arquitectura o al funcionamiento general del proyecto.

---

## 3. Zonas protegidas

El agente no debe modificar las siguientes zonas sin confirmación explícita del desarrollador:

### Hito 2

El proyecto Data Lab de Hito 2 ubicado en `uis/backoffice/data-lab/`, incluyendo su configuración y utilidades TypeScript.

No debe modificar ni reemplazar esta aplicación para introducir una configuración propia de otra aplicación, salvo que la tarea lo requiera explícitamente y el desarrollador lo confirme.

### Hito 3

La aplicación Talent Pipeline Tracker ubicada en:

`uis/backoffice/`

No debe modificar, mover, eliminar ni reemplazar archivos de Hito 3 salvo que el desarrollador solicite expresamente un cambio en esta aplicación.

### Hito 1

Los archivos existentes del Hito 1 tampoco deben eliminarse ni sustituirse como consecuencia de una tarea de Hito 4 sin confirmación explícita.

### Otros archivos

No eliminar, mover o reemplazar archivos existentes únicamente para simplificar la estructura del proyecto.

Si un cambio requiere modificar una zona protegida, el agente debe detenerse y solicitar confirmación antes de realizarlo.

---

## 4. Estructura de Hito 4

Las nuevas aplicaciones y configuraciones de Hito 4 deben respetar esta estructura:

```text
.agents/
├── rules/
└── skills/

memory-bank/
├── projectbrief.md
├── techContext.md
└── progress.md

uis/
├── website/
└── backoffice/
	└── data-lab/

services/

AGENTS.md
CONTEXT.md
```

`uis/website` corresponde a la aplicación web pública.

`uis/backoffice` corresponde a la aplicación interna de Brasaland.

`services` corresponde a los servicios backend de Hito 4.

---

## 5. Flujo obligatorio antes de realizar un commit

Antes de preparar o realizar cualquier commit, el agente debe completar estos pasos en orden:

### Paso 1. Revisar los cambios

Comprobar qué archivos han sido creados, modificados, eliminados o movidos.

Utilizar las herramientas de Git disponibles, incluyendo:

```bash
git status
git diff
```

El agente debe comprobar que los cambios están relacionados con la tarea solicitada.

### Paso 2. Ejecutar las validaciones

Ejecutar las validaciones correspondientes a las partes modificadas.

Estas pueden incluir, según corresponda:

* typecheck
* lint
* tests
* build
* comprobación del servidor de desarrollo
* comprobación manual de las rutas afectadas

No realizar el commit si existen errores relevantes que deban solucionarse.

### Paso 3. Revisar el resultado de las validaciones

Comprobar que las validaciones han terminado correctamente.

Si aparece un error, el agente debe identificar su causa y solucionarlo antes de continuar, siempre que la solución esté dentro del alcance de la tarea.

Si el error pertenece a una zona protegida o requiere un cambio fuera del alcance, debe solicitar confirmación al desarrollador.

### Paso 4. Revisar el diff final

Volver a revisar:

```bash
git status
git diff
```

Comprobar especialmente:

* que no haya archivos modificados accidentalmente;
* que no se hayan eliminado archivos existentes;
* que no se hayan incluido secretos, claves API o archivos `.env`;
* que no existan cambios innecesarios;
* que las zonas protegidas no hayan sido modificadas sin autorización.

### Paso 5. Actualizar la documentación de progreso

Si la tarea modifica de forma relevante el estado del proyecto, actualizar:

`memory-bank/progress.md`

La documentación debe reflejar el estado real del proyecto y no debe marcar como completada una tarea que todavía no haya sido validada.

### Paso 6. Preparar el commit

Solo después de completar los pasos anteriores puede el agente preparar el commit.

El mensaje del commit debe describir de forma clara y breve el cambio realizado.

---

## 6. Cambios fuera del alcance

Si durante una tarea el agente detecta:

* código aparentemente mejorable pero no relacionado con la tarea;
* errores preexistentes;
* archivos que podrían reorganizarse;
* duplicaciones que no son necesarias para completar la tarea;
* problemas en Hito 1, Hito 2 o Hito 3;

no debe solucionarlos automáticamente.

Debe informar del problema y continuar únicamente con los cambios necesarios para la tarea actual, salvo que el desarrollador autorice explícitamente el trabajo adicional.

---

## 7. Criterio general

La prioridad del agente es:

1. Cumplir la tarea solicitada.
2. Preservar el funcionamiento existente.
3. Reutilizar código y estructuras cuando sea posible.
4. Evitar cambios innecesarios.
5. Validar los cambios antes de entregarlos.
6. Mantener actualizada la documentación del proyecto.
