# Auditoría de Serialización del Backend

El backend que lleva semanas construyéndose está a punto de recibir usuarios reales. Antes de eso, tu CTO ha identificado un problema crítico: varios endpoints de la API devuelven objetos de base de datos sin ningún control de forma, sin filtrado de campos y sin protección frente a la exposición de campos internos del modelo. En un entorno de demo con poco tráfico, esto es invisible. A escala, genera cuellos de botella de rendimiento, riesgos de seguridad y contratos frágiles con el cliente.

Tu tarea es liderar una auditoría de serialización del backend. El objetivo no es reescribir nada desde cero, sino inspeccionar cada endpoint existente con criterio técnico y llevar la API a estándares de producción.

## Qué necesitamos
- Una auditoría escrita que identifique cada endpoint y su estado de serialización actual.
- Una clasificación de cada endpoint: cuáles exponen campos innecesarios, cuáles carecen de un esquema de respuesta definido y cuáles ya están bien definidos.
- Para cada endpoint que requiera trabajo, una nota sobre qué tipo de mejora es necesaria -- no solo "necesita serializer", sino por qué y cómo debería ser el payload de salida.

## Entregable mínimo
Cada endpoint de la API debe tener un serializer de respuesta explícito definido antes de que esta tarea se considere completada. Ningún endpoint debe devolver un objeto ORM en crudo.

Más allá del mínimo, espero optimización del payload donde importa: relaciones anidadas aplanadas cuando el cliente no necesita el objeto completo, endpoints de listado que devuelven solo los campos que los consumidores realmente usan, y endpoints de escritura que aceptan únicamente los campos que deben aceptar.

Este es el tipo de revisión que diferencia una API que funciona de una API en la que se puede confiar. Asume la responsabilidad de toda la superficie de tu backend y llévala al nivel que merecen tu frontend — y tus usuarios.

# ¿Qué son los serializers y por qué importan aquí?
Los serializers definen el contrato entre tu backend y todo lo que lo consume. En FastAPI, los modelos Pydantic cumplen este rol: validan la entrada, dan forma a la salida y hacen que el comportamiento de la API sea explícito y testeable. Sin ellos, tu API devuelve implícitamente lo que produce el ORM, lo que puede incluir IDs internas, contraseñas hasheadas, ruido relacional y nombres de campos inestables. Con alto tráfico, esto también significa serializar más datos de los que el cliente jamás solicitó.

Una capa de serializers bien diseñada implica:

- Los clientes reciben solo lo que necesitan — payloads más pequeños, respuestas más rápidas.
- Los cambios internos del modelo no rompen el contrato de la API — el serializer absorbe la diferencia.
- Los campos sensibles nunca se exponen accidentalmente — el esquema es la fuente de verdad.

Al auditar, piensa en tres niveles: qué recibe este endpoint, qué debería devolver y qué está devolviendo realmente hoy.

## Decidir qué debe exponer cada endpoint
Antes de elegir un esquema, aclara qué necesita realmente el consumidor de esa ruta — no qué tiene el modelo en base de datos.

Pregunta por cada endpoint:

- ¿Quién lo llama? ¿Un listado, una vista de detalle, otro servicio o una confirmación tras un write?
- ¿Qué usa la UI o el cliente? Sigue el frontend (o consumidor de la API) y anota los campos que lee — ignora columnas del modelo que la pantalla nunca muestra.
- ¿Qué debe quedarse interno? Credenciales, tokens, claves foráneas solo server-side, timestamps de auditoría, flags de borrado lógico, etc.


Luego elige cómo serializar:

| Situación | Enfoque habitual |
| :--- | :--- |
| La vista de detalle necesita la mayoría de campos seguros de un recurso | Esquema con **atributos explícitos** (p. ej. `UserPublic`: `id`, `display_name`, `created_at`) |
| El listado necesita un subconjunto o forma distinta al detalle | **Esquema aparte y más ligero** (p. ej. `UserListItem` sin relaciones anidadas) — no reutilices el de detalle por defecto |
| Varios endpoints comparten exactamente la misma proyección segura | Un esquema compartido vale — solo si la **lista de campos encaja** con todos los consumidores |
| Devolver el ORM entero “porque funciona” | ❌ Sin serializar — aunque FastAPI vuelque todas las columnas, el contrato queda indefinido |


**General vs explícito**: mapear un modelo con `from_attributes=True` es cómodo cuando cada campo listado es intencional. Ante la duda — listados, flujos de auth o consumidores distintos — conviene **nombrar cada atributo** en el esquema para que la auditoría diga exactamente qué sale de la API. Registra esa lista objetivo en `docs/serialization-audit.md` en cada endpoint que modifiques.


# Qué debes hacer
## Fase 1 — Auditoría

**Consejo**: Un buen punto de partida es la autenticación — rutas como registro, login y restauración/restablecimiento de contraseña suelen ser las de mayor riesgo: un objeto ORM de usuario en crudo puede filtrar `hashed_password`, y los handlers de auth a menudo devuelven más de lo que el cliente necesita.

Al revisar respuestas de auth, estas comprobaciones suelen detectar problemas rápido:

- Evita devolver contraseñas — en texto plano o hasheadas — en el cuerpo de cualquier respuesta.
- Valora limitar el email en respuestas de auth — registro, login y restauración de contraseña suelen funcionar mejor cuando devuelven solo lo que el cliente necesita a continuación (por ejemplo, un token, un mensaje genérico de confirmación o una proyección segura del usuario sin campos de credenciales). El email suele ir en el cuerpo de la petición; reenviarlo en la respuesta merece cuestionarse salvo que tu auditoría documente el motivo.

Puedes anotar las rutas de auth al inicio de `docs/serialization-audit.md` antes de seguir con el resto de la API.

- [ ] Lista todos los endpoints de tu aplicación FastAPI (ruta, método y propósito).
- [ ] Para cada endpoint, documenta su comportamiento de respuesta actual: ¿usa `response_model`? ¿Devuelve un objeto ORM en crudo, un dict o un esquema tipado?
- [ ] Clasifica cada endpoint en uno de estos tres estados:
  - ✅ **Ya serializado** — tiene un `response_model` explícito y el esquema es adecuado.
  - ⚠️ **Parcialmente serializado** — tiene un response model pero está incompleto, expone campos innecesarios o no coincide con lo que necesita el cliente.
  - ❌ **Sin serializar** — devuelve un objeto ORM en crudo o un dict sin tipado.
- [ ] Registra los resultados de la auditoría en un archivo Markdown en `docs/serialization-audit.md`.

## Fase 2 — Implementación

- [✅] Crea o actualiza los esquemas Pydantic para cada endpoint clasificado como ❌ o ⚠️.
- [ ] Asegúrate de que cada endpoint tiene un `response_model` explícito declarado en su decorador de ruta.
- [ ] Para endpoints de listado: define un esquema que devuelva solo los campos que los consumidores necesitan. Evita devolver objetos anidados completos cuando una representación plana es suficiente.
- [ ] Para endpoints de escritura (POST, PUT, PATCH): define un esquema de entrada separado que acepte únicamente los campos que deben poder escribirse. No reutilices el esquema de respuesta como esquema de entrada.
- [ ] Asegúrate de que ningún endpoint exponga campos sensibles (por ejemplo, contraseñas hasheadas, tokens internos, claves foráneas en bruto cuando hay un objeto anidado disponible). Las rutas de auth (registro, login, forgot/reset password) nunca deben devolver contraseñas ni email en el cuerpo de la respuesta. `GET /auth/me` sí puede devolver el `email` del propio llamante — la vista de perfil depende de ello.
- [ ] Cuando una relación sea necesaria en la respuesta, decide explícitamente: devolver el objeto anidado completo, devolver solo el ID relacionado o devolver una proyección plana — y documenta esa decisión en tu archivo de auditoría.

## Fase 3 — Verificación

- [ ] Confirma que todos los endpoints siguen pasando los tests existentes tras los cambios de esquema.
- [ ] Prueba manualmente al menos tres endpoints usando la documentación interactiva de FastAPI (`/docs`) y verifica que el shape de la respuesta coincide con el esquema definido.
- [ ] Actualiza el documento de auditoría para marcar todos los endpoints como ✅ una vez completada la implementación.

---

### ✅ Qué vamos a evaluar

- [ ] Cada endpoint de la aplicación tiene un `response_model` explícito declarado.
- [ ] Los esquemas Pydantic están definidos tanto para entrada como para salida donde corresponde — los esquemas de entrada y salida no se confunden entre sí.
- [ ] Los esquemas de endpoints de listado devuelven solo los campos necesarios para el consumidor — sin anidado innecesario ni over-fetching.
- [ ] Ningún endpoint expone contraseñas hasheadas ni tokens internos en su esquema de respuesta. Los flujos de auth no autenticados (registro, login, forgot/reset) no reenvían el email. `GET /auth/me` puede devolver el email del usuario autenticado.
- [ ] El documento de auditoría de serialización (`docs/serialization-audit.md`) existe, lista todos los endpoints, su estado original y los cambios aplicados.
- [ ] La aplicación sigue funcionando correctamente después de todos los cambios de esquema — sin regresiones.

> **Nota**: La calidad del documento de auditoría se evalúa como un entregable en sí mismo. Una implementación completa sin registro de auditoría no es suficiente.