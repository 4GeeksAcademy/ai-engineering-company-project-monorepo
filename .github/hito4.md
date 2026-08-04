# README: Milestone 4 — Ingeniería impulsada por IA

## 🎯 El Desafío

📌 **Estás construyendo sobre tu copia del monorepo de la empresa seleccionada al inicio del curso — no en un repositorio nuevo.**

Ya tienes tres hitos construidos: la web pública, la lógica de negocio en TypeScript y los primeros componentes generados con IA. Tienes piezas. Lo que aún no tienes es el sistema que las une y que va a crecer con ellas.

A partir de este hito, el monorepo deja de ser un repositorio de proyectos separados y se convierte en el núcleo técnico de tu empresa. Todo lo que construyas de aquí en adelante — APIs, agentes, automatizaciones — vivirá en este mismo espacio. Por eso, antes de añadir más código, hay que construir la infraestructura que hará que ese código sea coherente, mantenible y AI-ready.

Tu tech lead ha dejado una tarea pendiente en el tablero desde hace dos semanas:

> **Asunto:** Monorepo AI Setup — necesitamos esto esta semana
> 
> Hola,
> 
> He revisado el estado del repo y veo que estamos acumulando código sin estructura de soporte. Si meto un agente sobre esto ahora mismo va a cometer errores que nos van a costar el triple de tiempo.
> 
> Necesito que el repositorio tenga un contexto claro y persistente antes de que sigamos añadiendo features: qué es la empresa, qué estamos construyendo, cuáles son las reglas del proyecto. Eso va al banco de memoria. El agente tiene que leerlo antes de tocar nada — y tiene que incluir tanto el contexto de negocio como el técnico, no solo uno de los dos.
> 
> También quiero un `AGENTS.md` que defina cómo opera cualquier agente en este repo — qué flujo tiene que seguir antes de hacer un commit. Nada de agentes que escriban código sin pasar por el proceso de entrega.
> 
> Para las reglas más específicas usaremos la carpeta `.agents/`. Piensa en qué convenciones necesita conocer el agente para no romper lo que ya tenemos, y documéntalas ahí con el alcance correcto.
> 
> Por último, quiero que formalicemos al menos una skill que capture una tarea recurrente de nuestro flujo de trabajo — algo que el agente pueda ejecutar de forma consistente y que podamos reutilizar en los próximos hitos. Que tenga criterios de aceptación explícitos: si no se puede verificar, no vale.
> 
> En cuanto a la app, la web pública tiene que vivir en `./uis/website` como app Next.js — no como copia, sino como una versión mejorada con componentes reutilizables. En paralelo, crea `./uis/backoffice` para desarrollar toda la lógica interna de la empresa con su propio layout y vista de entrada, e integra ahí el script de TypeScript del módulo de lógica de negocio (Hito 2) para tener algo visible desde el primer día. Cualquier API debe crearse dentro de `/services`.
> 
> Cuando termines, PR y avísame.
> 
> — [Tu tech lead]

---

## 💡 Banco de memoria, reglas y skills: qué son y por qué importan

Un banco de memoria es un conjunto de archivos Markdown que el agente de programación lee antes de cada sesión. No es documentación estática — es el contexto activo del proyecto: negocio, decisiones de arquitectura tomadas, restricciones en vigor y estado actual del desarrollo. Sin él, cada sesión del agente empieza desde cero y repite los mismos errores. Por eso, el banco de memoria debe actualizarse cada vez que el proyecto evoluciona: nuevas decisiones, cambios de arquitectura, features completadas, problemas encontrados. Un banco de memoria que no se mantiene al día deja de ser útil en cuestión de días. ¡Nunca lo olvides!

La estructura esperada para la configuración de agentes en el monorepo es la siguiente:

```text
./.agents
└─ /rules
   └─ <rule-name>.md
└─ /skills
   └─ /<skill>
      └─ SKILL.md
./memory-bank
└─ <context>.md
```

> ⚠️ **Atención:** No confundas `.agents/` con las carpetas `/agents` y `/skills` que verás en el monorepo. `.agents/` es el directorio de configuración para los agentes de código (Cursor, Windsurf, Claude Code…) — aquí van las reglas y skills que le enseñan al agente cómo trabajar en este repositorio. Las carpetas `/agents` y `/skills` son para los agentes e integraciones que construirás para la empresa a partir de hitos posteriores. Son cosas distintas: una configura cómo trabaja tu herramienta de desarrollo, la otra es código de producto.

Antes de crear ninguna carpeta nueva, revisa el `README.md` de cada carpeta del monorepo — el repositorio de plantilla incluye instrucciones sobre qué debe ir en cada espacio. Siguiéndolas evitarás duplicidades y mantendrás una estructura que el agente pueda navegar sin ambigüedad.

Las reglas de desarrollo (`AGENTS.md` y `.agents/rules/`) son el protocolo que el agente sigue automáticamente: qué leer al empezar, qué pasos son obligatorios antes de cada commit, qué convenciones respetar y cuándo detenerse y preguntar. Actúan como el acuerdo de equipo que garantiza que el agente no tome decisiones por su cuenta donde no debería.

Una skill de agente es una instrucción estructurada y reutilizable: más concreta que una regla genérica, con inputs definidos, output esperado y criterios de aceptación verificables. Una buena skill tiene un único objetivo y puede testearse de forma independiente.

---

## 🌱 Cómo iniciar el proyecto

1. Lee el `CONTEXT.md` de tu monorepo antes de hacer nada más. El banco de memoria que vas a construir debe describir la empresa y el proyecto de tu escenario específico — no una empresa ficticia genérica.
2. Haz fork del repositorio de plantilla: `ai-engineering-company-project-monorepo`.
3. Ábrelo en GitHub Codespaces o clónalo localmente y revisa la estructura existente antes de crear carpetas nuevas.
4. Configura tu agente de programación con acceso al repositorio completo.
5. Documenta las decisiones de configuración inicial en el banco de memoria antes de escribir código de aplicación.

---

## 💻 Lo que debes hacer

### Infraestructura de agentes

- [ ] Crear la carpeta `memory-bank/` en la raíz del monorepo con al menos los siguientes archivos:
  - [ ] `projectbrief.md` — descripción del negocio, los objetivos del proyecto y el problema que resuelve
  - [ ] `techContext.md` — stack tecnológico, decisiones de arquitectura tomadas y restricciones técnicas
  - [ ] `progress.md` — estado actual del desarrollo y próximos pasos previstos
- [ ] Crear el archivo `AGENTS.md` en la raíz del monorepo que defina:
  - [ ] Qué archivos del banco de memoria debe leer el agente al inicio de cada sesión
  - [ ] El flujo obligatorio antes de cada commit (mínimo 4 pasos ordenados y explícitos)
  - [ ] Las carpetas y archivos que el agente **no debe modificar** sin confirmación explícita del desarrollador
- [ ] Crear la carpeta `.agents/` con al menos una regla de desarrollo documentada con su alcance de aplicación (siempre activa, por patrón de archivo, o solicitada por el agente)
- [ ] Implementar al menos una **skill de agente** para una tarea recurrente del flujo de trabajo, con:
  - [ ] Un objetivo único y claramente definido
  - [ ] Inputs documentados
  - [ ] Criterios de aceptación explícitos y verificables

> ⚠️ **IMPORTANTE:** El banco de memoria, las reglas y la skill deben estar alineados con los datos, procesos y restricciones documentados en el `CONTEXT.md` de tu monorepo. Una infraestructura genérica que ignore el escenario de la empresa no será aceptada.

### Aplicación Next.js + TypeScript

- [ ] Inicializar la estructura frontend dentro de `/uis` en el monorepo siguiendo la estructura del repositorio de plantilla
- [ ] Crear el proyecto web público en `./uis/website` (Next.js + TypeScript)
- [ ] Migrar y mejorar la web corporativa del Hito 1 en `./uis/website` como ruta de inicio (`/`):
  - [ ] Todas las secciones del Hito 1 presentes y completas
  - [ ] Implementada con componentes React reutilizables y tipado TypeScript correcto
  - [ ] Estilos consistentes con la identidad visual establecida en el Hito 1
- [ ] Crear la aplicación interna en `./uis/backoffice`:
  - [ ] Ruta `/` de `./uis/backoffice` accesible con una vista de entrada básica (pantalla de bienvenida o estructura vacía de dashboard)
  - [ ] Layout propio, separado del layout público de la web corporativa en `./uis/website`
- [ ] Integrar el script de TypeScript del módulo de lógica de negocio (Hito 2) dentro de `./uis/backoffice`:
  - [ ] El código se importa desde su ubicación original en el monorepo — no se copia
  - [ ] El resultado de la lógica de negocio es visible en la interfaz (no solo en consola)

---

## ✅ Lo que evaluaremos

- [ ] El banco de memoria contiene contexto de negocio **y** contexto técnico — no solo uno de los dos
- [ ] `AGENTS.md` especifica un flujo de trabajo con al menos 4 pasos ordenados antes del commit
- [ ] La carpeta `.agents/` contiene al menos una regla con alcance de aplicación explícito
- [ ] La skill implementada tiene objetivo único, inputs documentados y criterios de aceptación verificables
- [ ] La web pública en `./uis/website` arranca sin errores con `npm run dev`
- [ ] La ruta `/` en `./uis/website` renderiza el contenido completo de la web corporativa con componentes TypeScript
- [ ] `./uis/backoffice` existe, tiene layout propio y renderiza sin errores
- [ ] El script de TypeScript (Hito 2) está integrado en `./uis/backoffice` y produce output visible en pantalla
- [ ] No hay código de lógica de negocio duplicado — se importa desde su ubicación original en el monorepo

---

## 📦 Cómo entregar

1. Asegúrate de que tu rama de trabajo tenga el nombre `milestone-4`
2. Ejecuta el flujo de entrega definido en tu `AGENTS.md` antes del commit final
3. Abre una Pull Request hacia la rama `main` de tu fork
4. En la descripción de la PR incluye:
   - Captura de pantalla de la web corporativa renderizada desde `./uis/website`
   - Captura de pantalla de `./uis/backoffice` con el script de TypeScript (Hito 2) visible en pantalla
   - Enlace directo a tu `AGENTS.md`
5. Entrega el enlace a tu PR en el campus de 4Geeks