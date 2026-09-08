# Implementation Plan: Refactorización a App Shell (Dashboard B2B)

## 1. Nivel de Complejidad
- **Nivel:** 3 (Complejidad Alta / Módulo Crítico)
- **Justificación:** Implica la reestructuración completa del sistema de enrutamiento del Frontend (Next.js App Router), la centralización de la seguridad (RBAC) y la creación de un Layout maestro que afectará a todos los departamentos de la empresa.

---

## 2. Análisis PACK_ARCHITECT (Tree of Thoughts & Expertos)

Antes de definir el plan, hemos evaluado 3 alternativas arquitectónicas para centralizar el panel:

| Alternativa | Análisis de Expertos (UX, Dev, Sec) | Decisión |
|---|---|---|
| **Rama 1: HOC (Higher Order Component)** | Envolver cada vista (`/incidents`, `/tickets`) con un componente `<WithAuth><Layout>`. **Dev:** Mucho boilerplate. **UX:** Posible parpadeo (FOUC). **Sec:** Funciona, pero propenso a olvidos si se crea una vista nueva. | ❌ Descartada |
| **Rama 2: SPA Monolítica en `/admin`** | Mover todo a una única ruta `/admin` y renderizar componentes hijos según el estado de React. **Dev:** Rompe el paradigma de Next.js Server Components. **UX:** Tiempos de carga iniciales altos. | ❌ Descartada |
| **Rama 3: Route Groups `(dashboard)`** | Usar la funcionalidad nativa de Next.js agrupando rutas en `app/(dashboard)`. **Dev:** Código limpio, el `layout.tsx` no añade segmentos a la URL. **UX:** Transiciones fluidas, el Sidebar no se re-renderiza. **Sec:** Protección global hermética. | ✅ **Seleccionada** |

---

## 3. Plan de Ejecución (Paso a Paso)

### Fase 1: Creación del Layout Central (App Shell)
- [ ] Crear el directorio `uis/application/src/app/(dashboard)`.
- [ ] Construir `uis/application/src/app/(dashboard)/layout.tsx`.
- [ ] Diseñar el componente `Sidebar` dentro del Layout con enlaces a: Inicio, Incidencias, Tickets, Proveedores, Soporte IA, Mi Perfil.
- [ ] Implementar la protección de rutas global: si `!isAuthenticated`, redirigir a `/login`.

### Fase 2: Migración de Rutas Administrativas
- [ ] Mover las carpetas `/admin`, `/incidents`, `/suppliers`, `/support` y `/account` al interior del grupo `(dashboard)`.
- [ ] Eliminar los chequeos de `useAuth()` redundantes en los `page.tsx` de cada una de estas vistas, delegando la seguridad al Layout padre.

### Fase 3: Integración de Roles y Permisos (RBAC)
- [ ] Modificar el contexto de Autenticación o el Sidebar para leer el `UserRole` del perfil del usuario.
- [ ] Ocultar o mostrar condicionalmente los enlaces del Sidebar (Ej: Solo los administradores ven el panel "Tickets" global, o los usuarios rasos solo ven "Soporte IA"). *(Ver Decisiones Requeridas)*.

### Fase 4: Limpieza de la Landing Page
- [ ] Modificar `uis/application/src/app/page.tsx` (Landing Page).
- [ ] Eliminar los enlaces a submódulos en la barra de navegación pública.
- [ ] Reemplazar por un botón dinámico `Entrar al Dashboard` (si está logueado) o `Login` (si es invitado).

### Fase 5: Auditoría y Verificación (PACK_AUDITOR)
- [ ] Comprobar que acceder directamente a `/incidents` sin sesión devuelve al usuario al login.
- [ ] Comprobar que al navegar entre secciones del Dashboard el estado del Sidebar (ej: ítem activo) se mantiene y no hay parpadeos.

---

## 4. Decisiones Requeridas

> [!IMPORTANT]
> **Definición de Roles en el Menú (Fase 3):** Para configurar el RBAC en el Sidebar, necesito saber: ¿Quién tiene acceso a qué? 
> Ej: ¿Puede un `user` estándar ver "Incidencias" o solo `manager` y `admin`? ¿"Soporte IA" es para todos? 

---

## ⚙️ Métodos Aplicados (Code Refinement Suite)

1. **PACK_ARCHITECT (ToT + 3 Expertos):** Aplicado en la sección 2 del documento para contrastar el uso de HOCs vs Route Groups, decantándonos por el estándar moderno de Next.js para mayor seguridad (Sec Specialist) y experiencia de usuario sin re-renders (UX).
2. **PACK_PLANNER:** Estructuración modular en 5 fases secuenciales asegurando que la migración no rompa los endpoints que ya conectamos.
3. **PACK_CODER (Próximo paso):** Se aplicará un enfoque de *Chain of Verification (CoVe)* al mover las carpetas, asegurándonos de que los imports relativos en Next.js no se rompan tras mover los archivos a `(dashboard)`.
4. **PACK_AUDITOR (Fase 5):** Simularemos un *Red Teaming* intentando acceder a rutas profundas sin token para asegurar el blindaje del Layout. Y recordaré **no hacer push automático** al terminar.
