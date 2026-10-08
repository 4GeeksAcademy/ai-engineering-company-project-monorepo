# Optimización de rendimiento: Caching

La plataforma de tu empresa está creciendo. Lo que antes gestionaba un puñado de peticiones al día ahora soporta carga real: más usuarios, más llamadas a la API, interacciones de UI más complejas. El tech lead ha detectado un patrón recurrente en la telemetría: algunos endpoints reciben decenas de peticiones por minuto con consultas idénticas, y algunos componentes se están re-renderizando mucho más de lo necesario.

El encargo es claro: antes del próximo sprint de funcionalidades, el equipo debe analizar la aplicación existente, identificar las oportunidades de caching con mayor impacto y aplicarlas. No se trata de cachear todo — sino de tomar decisiones deliberadas y justificadas sobre qué cachear, dónde hacerlo y durante cuánto tiempo.

Trabajarás directamente sobre el monorepo de tu proyecto transversal. El resultado no es solo código funcional: es un informe técnico estructurado que explica tu razonamiento. Las decisiones de ingeniería sin documentación son solo intuiciones — el equipo necesita entender por qué se tomó cada decisión.

## 🧠 Conocimiento complementario

¿Cuándo aplicar caching? No todos los datos merecen una caché. Antes de implementar nada, evalúa dos ejes:


- Costo de cálculo vs. costo de almacenamiento: ¿es más caro recalcular o volver a consultar ese dato que almacenar una copia? Si una query tarda 400ms y se ejecuta 200 veces por minuto, el caching casi siempre está justificado. Si tarda 2ms y los datos cambian cada 10 segundos, probablemente no.
- Frescura de datos vs. rendimiento: un dato cacheado es, por definición, potencialmente desactualizado. Un listado de productos puede tolerar un TTL de 60 segundos. Un saldo bancario no. Cada decisión de caching es un intercambio entre velocidad y consistencia — documéntalo explícitamente.

Caching en el frontend En el frontend, dos técnicas aplican directamente:

- Lazy Loading: diferir la carga de componentes o datos hasta que realmente se necesiten. Reduce el tamaño inicial del bundle y el tiempo hasta la interactividad. Útil para componentes pesados que aparecen fuera del viewport inicial o solo en ciertos flujos.
- useMemo: memoizar valores calculados costosos dentro de un componente para que solo se recalculen cuando cambian sus dependencias. Aplícalo solo cuando el perfilado muestra que el cálculo es genuinamente costoso — la memoización prematura añade complejidad sin beneficio.


**Niveles de caching en el backend** En el backend con FastAPI, el enfoque más práctico en esta etapa es una caché en proceso (un diccionario o decorador en memoria) o una caché externa como Redis. La pregunta clave por endpoint es: ¿esta respuesta depende de datos que cambian frecuentemente, y el cálculo implica un coste real? Los endpoints que agregan muchas filas, llaman a servicios externos o aplican filtros complejos son los mejores candidatos.

**Disciplina con el TTL** Todo valor cacheado debe tener una expiración. Sin TTL, los datos obsoletos viven para siempre. Elige los TTL según la frecuencia con que cambian los datos subyacentes, no por comodidad.

Cómo identificar candidatos con evidencia (no por intuición) Antes de cachear, necesitas datos. En el backend, la forma más rápida de ver qué endpoints merecen atención es medir el tiempo de cada petición.

### ¿Qué buscar en los logs?

| Señal en el log | Pregunta que responde | ¿Candidato a caché? |
| :--- | :--- | :--- |
| Latencia alta (>100–200 ms de forma consistente) | ¿Cuánto cuesta la operación? (eje **coste**) | Sí, si se repite |
| Misma ruta muchas veces en poco tiempo | ¿Con qué frecuencia se llama? (eje **frecuencia**) | Sí, si la respuesta es la misma |
| Mismo path + mismo status + tiempos similares en lecturas | ¿Los datos subyacentes cambian poco? (eje **estabilidad**) | Sí, con TTL acorde |

Un endpoint que aparece lento y se invoca en ráfagas con los mismos parámetros (p. ej. `GET /products?category=electronics`) es un candidato fuerte. Un POST que escribe datos o un GET con respuesta distinta por usuario no lo es — o solo con clave de caché acotada al usuario.

Complementa con tráfico real:

1. Navega tu frontend o lanza peticiones repetidas (misma URL, mismos query params).
2. Ordena mentalmente los logs: los paths con más líneas y mayor `ms` van primero en tu lista de candidatos.
3. Cruza con el checklist del informe: documenta en CACHING_REPORT.md el tiempo medido antes de cachear y el estimado después.

### 😉 Carga realista en la base de datos:

Con pocos registros, casi todo el API responde rápido y los logs de timing no revelan dónde el caching aporta valor. Antes de fiarte del middleware, aumenta el volumen en las tablas que alimentan tus lecturas más pesadas (catálogo, pedidos, usuarios con relaciones, etc.).

- Pide a tu agente de código un seeder (script de tu stack: Alembic, seed de Prisma, comando de gestión en Django, etc.) o un script SQL que inserte muchos registros; revísalo y ejecútalo en local.

- Prioriza la calidad de los datos, no solo la cantidad: nombres, categorías, fechas, precios y claves foráneas variadas y coherentes para que filtros, joins, ordenaciones y agregaciones cuesten trabajo de verdad — no quinientas filas idénticas `"test"`.

- Vuelve a ejecutar el middleware de timing tras el seed. En `CACHING_REPORT.md`, indica volumen aproximado de filas antes y después y cómo cambió la latencia en los endpoints elegidos.

**En el frontend:**

- **React DevTools → Profiler:** componentes que se re-renderizan sin cambio real de props son candidatos a useMemo o a dividir estado.
- **Lazy Loading:** rutas o modales que no se usan en la carga inicial pero pesan en el bundle (pestaña Network: JS grande que solo se pide al entrar en esa vista).

⚠️ No implementes caché en todo lo lento: primero mide, luego prioriza los casos donde coste × frecuencia × estabilidad justifican el intercambio frescura/rendimiento.

## 💻 Qué debes hacer

### Análisis y optimización del frontend
- [x] Revisa tu aplicación Next.js e identifica al menos **dos componentes o rutas** que sean buenos candidatos para Lazy Loading. Documenta tu razonamiento: ¿por qué está justificado diferir la carga de este componente?
- [x] Implementa Lazy Loading para esos componentes usando `next/dynamic` o `React.lazy`.
- [x] Revisa tus componentes en busca de valores calculados costosos. Identifica al menos **una oportunidad de `useMemo`** donde el cálculo sea no trivial y el array de dependencias esté bien definido.
- [x] Implementa la optimización con `useMemo`. No lo apliques a cálculos triviales.

### Análisis y optimización del backend
- [x] Lista todos los endpoints de tu aplicación FastAPI. Para cada uno, evalúa: (a) ¿cuánto cuesta la operación? (b) ¿con qué frecuencia se llama? (c) ¿con qué frecuencia cambian los datos subyacentes?
- [x] Identifica al menos **dos endpoints** que cumplan los criterios de coste + frecuencia + estabilidad para el caching.
- [x] Implementa el caching para esos endpoints. Puedes usar un diccionario en memoria con lógica de TTL, `functools.lru_cache` donde aplique, o una caché basada en Redis si tu stack lo soporta.
- [x] Implementa la invalidación de caché: si los datos subyacentes cambian (por ejemplo, una operación de escritura), los valores cacheados relevantes deben limpiarse o marcarse como obsoletos.

> [!WARNING]
> **IMPORTANTE:** No cachees endpoints que devuelvan datos personalizados, de sesión o sensibles sin acotar la clave de caché al usuario autenticado. Una clave de caché compartida para datos privados es una fuga de datos, no una mejora de rendimiento.

### Informe técnico
- [x] Escribe un `CACHING_REPORT.md` (o equivalente) en tu monorepo con las siguientes secciones:
  - **Decisiones en el frontend:** qué componentes se cargaron de forma diferida y por qué; qué valores se memoizaron y cuál es el beneficio medido o estimado.
  - **Decisiones en el backend:** para cada endpoint cacheado, documenta el coste de la operación, la frecuencia estimada de llamadas, el TTL elegido y la estrategia de invalidación.
  - **Intercambios reconocidos:** al menos una discusión explícita sobre el intercambio entre frescura y rendimiento — dónde elegiste un TTL concreto y por qué ese nivel de potencial desactualización es aceptable para este caso de uso.
  - **Qué no se cacheó y por qué:** identifica al menos un endpoint o componente que consideraste pero decidiste no cachear, con justificación.

---

## ✅ Qué vamos a evaluar

- [x] Al menos dos componentes o rutas implementan Lazy Loading con justificación documentada.
- [x] Al menos un `useMemo` se aplica a un valor calculado no trivial con un array de dependencias correcto.
- [x] Al menos dos endpoints del backend están cacheados con expiración basada en TTL.
- [x] La invalidación de caché está implementada: los valores cacheados se limpian cuando cambian los datos subyacentes.
- [x] Ningún dato privado o de sesión se almacena en una clave de caché compartida.
- [x] El `CACHING_REPORT.md` está presente y aborda todas las secciones requeridas.
- [x] Las decisiones del informe son específicas y justificadas — no genéricas ("cacheamos esto porque es lento").
- [x] Al menos un intercambio (frescura vs. rendimiento) se discute explícitamente.

> [!NOTE]
> **Nota:** la evaluación se centra en la calidad de las decisiones y la corrección de la implementación, no en el número de endpoints o componentes cacheados. Pocas decisiones bien justificadas son preferibles a muchas decisiones sin justificación.