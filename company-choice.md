## Empresa: **Brasaland** 🍖

Brasaland es atractiva porque su dominio es universalmente comprensible — todo el mundo entiende cómo funciona un restaurante, lo que permite enfocarse en la ingeniería sin perder tiempo entendiendo el negocio. Opera 14 locales en dos países (Colombia y Florida) con herramientas diseñadas para un solo restaurante, lo que significa que cada solución que construyas tendrá impacto inmediato y visible. La combinación de dos monedas (COP y USD), dos idiomas y operaciones físicas en tiempo real añade complejidad real y relevante para un portfolio. Además, sus problemas son variados — desde predicción de demanda hasta fidelización de clientes — cubriendo un espectro amplio de habilidades de AI Engineering.

---

## Departamentos más interesantes

**1. Operaciones de Restaurante (Felipe Guerrero)**
14 locales operando en aislamiento total, sin visibilidad centralizada. Los pedidos de ingredientes se hacen por WhatsApp sin datos de inventario. Es el problema más crítico del negocio y el que más impacto tendría resolver — si un local se queda sin carne a las 7pm, el daño es inmediato.

**2. Marketing y Experiencia Digital (Camila Ospina)**
El programa de fidelización "Brasa Points" funciona con tarjetas físicas de sello que el 60% de los clientes no usa. No existe ningún dato sobre quiénes son los clientes. Es un problema clásico de transformación digital donde pasar de 0 datos a datos reales cambia completamente la capacidad de toma de decisiones.

---

## Reto elegido: **Sistema inteligente de pedidos de ingredientes**

### #Mi idea de Agente de IA

**¿Qué haría?**
Un agente que analiza el historial de ventas de cada local, el stock actual y variables externas (día de la semana, clima, eventos locales, temporada) para generar automáticamente las órdenes de compra optimizadas — sin que nadie tenga que hacer cálculos ni mandar mensajes por WhatsApp.

**¿Qué información necesitaría?**
- Ventas históricas por local y por platillo (últimas 4-8 semanas)
- Stock actual de cada ingrediente por local
- Recetas estándar de Brasaland (qué ingredientes consume cada platillo)
- Calendario de eventos locales o días festivos
- Tiempos de entrega y mínimos de pedido por proveedor

**¿Qué produciría?**
- Una orden de compra sugerida por local, lista para aprobar con un clic
- Alertas tempranas cuando un ingrediente crítico está por debajo del umbral mínimo
- Un reporte semanal para Lucía (Compras) con el consolidado de todas las órdenes de la cadena — útil para negociar volumen con proveedores
- Notificaciones automáticas al proveedor una vez aprobada la orden

**Flujo completo:**
```
Ventas del día → Agente calcula consumo
       ↓
Compara con stock actual
       ↓
Genera orden sugerida por local
       ↓
Supervisor aprueba (1 clic)
       ↓
Orden enviada automáticamente al proveedor
       ↓
Confirmación registrada en sistema
```

**Impacto esperado:**
- Eliminar el exceso de stock en unos locales y las roturas en otros
- Reducir el tiempo de gestión de compras de horas a minutos
- Dar a Lucía datos consolidados reales para negociar mejores precios por volumen con los ~20 proveedores

---

## Bonus: #Mi idea de Agente de IA2

## Sistema de Fidelización Brasaland: App + CRM + Motor de Personalización + WhatsApp

### Cómo se conectan las 4 piezas:

```
PRIMERA VISITA
Cliente paga → recibe ticket por WhatsApp
→ "Descarga la app y tus puntos ya están ahí"
→ Cliente descarga con motivación real
```

```
VISITAS SIGUIENTES
Abre app → ve sus puntos → pide en 1 clic
→ Agente IA analiza su comportamiento
→ Le llega promoción personalizada por WhatsApp
→ Vuelve más seguido
```

---

### Las 4 piezas en simple:

**📱 App** — el cliente pide, acumula puntos y ve su historial

**📊 CRM** — Brasaland conoce a cada cliente: qué pide, cuándo viene, cuánto gasta

**🤖 Motor IA** — detecta patrones y dispara acciones automáticas:
- Cliente no vuelve hace 10 días → envía descuento
- Cliente siempre pide lo mismo → sugiere "¿lo de siempre?"
- Cliente nunca prueba postres → le regala uno

**💬 WhatsApp** — puerta de entrada sin fricción + canal de comunicación directa

---

**El resultado:** Brasaland pasa de saber **cero** sobre sus clientes a tener un perfil completo de cada uno — y actuar sobre eso automáticamente.
