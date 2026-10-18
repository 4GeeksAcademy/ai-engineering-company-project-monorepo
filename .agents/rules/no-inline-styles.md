---
description: Prohibición de estilos en línea
globs: ["**/*.tsx", "**/*.ts"]
---
# Regla: No Inline Styles

**Regla:** Queda prohibido el uso del atributo `style={{ ... }}` en componentes React.
**Justificación:** Mantiene la consistencia con Tailwind CSS y evita la deuda técnica en el diseño.
**Acción:** Reemplazar cualquier estilo en línea por clases de Tailwind o variables CSS globales.