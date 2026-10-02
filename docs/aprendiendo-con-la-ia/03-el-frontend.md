# 3. El frontend (la página web)

El **frontend** es todo lo que la persona ve y toca: botones, tabla, formulario. Está en `uis/application/app/suppliers/`. La entrega pide esa estructura: una app (`application`) con una carpeta `app/` que contiene la página del directorio de proveedores.

## Con qué está hecho

| Herramienta | Para qué sirve | Comparación |
|---|---|---|
| **React** | Construir la página con piezas reutilizables | Piezas de LEGO |
| **TypeScript** | JavaScript con "etiquetas" que evitan errores | Un corrector que avisa antes de imprimir |
| **Tailwind** | Dar estilo (colores, espacios) con clases cortas | Un catálogo de estilos ya hechos |
| **Vite** | Arrancar la página en tu ordenador y hacer de "proxy" | El que monta el escenario |

## Componentes: piezas de LEGO

En React, la página se divide en **componentes**, cada uno responsable de una parte:

```
page.tsx           ← la página entera: carga los datos y coordina todo
├── SupplierForm   ← el formulario "Nuevo proveedor"
└── SupplierRow    ← una fila de la tabla (se repite 15 veces)
```

`SupplierRow` no sabe nada de la base de datos. Solo recibe un proveedor y muestra su información. Eso lo hace fácil de entender y de arreglar.

## El "estado": la memoria de la página

Una página necesita recordar cosas: la lista de proveedores, qué filtro está elegido, si hay un error. En React eso se llama **estado** y se guarda con `useState`:

```tsx
const [suppliers, setSuppliers] = useState<Supplier[]>([]);   // la lista
const [country, setCountry] = useState("");                   // el filtro de país
```

Cuando el estado cambia, React **redibuja solo lo que cambió**. Por eso la tabla se actualiza al momento, sin recargar la página.

## Qué hace cada función de la página

### Cargar la lista
Al abrir la página, `useEffect` llama a la API (`GET /api/suppliers`) una vez y guarda el resultado. Mientras espera, se muestra "Cargando...".

### Los filtros por país y categoría
Son dos desplegables. Cuando eliges uno, la página **filtra la lista que ya tiene en memoria**. No vuelve a llamar a la API, por eso es instantáneo. Con 15 proveedores es lo más simple; si hubiera miles, se pediría el filtrado a la API (que ya lo sabe hacer).

### El formulario de alta
Antes de enviar nada, la página **comprueba por su cuenta** (validación en el cliente):

- El nombre no puede estar vacío (ni ser solo espacios).
- La tarifa tiene que ser mayor que 0.
- Hay que elegir al menos una categoría.
- Si hay email, debe parecer un email.

Si algo falla, muestra un aviso en rojo y **no llama a la API**. Si todo está bien, envía los datos. Y si aun así la API los rechaza (un 422), la página **muestra el mensaje de la API** en el mismo aviso rojo y conserva lo que habías escrito.

¿Por qué validar en dos sitios? El navegador da respuesta inmediata al usuario; la API es la **última defensa** y nunca se puede saltar.

La moneda no se elige: se calcula sola según el país (Spain → EUR, USA → USD). Así es imposible enviar una combinación incoherente desde el formulario.

### Cambiar la tarifa
Cada fila tiene un lápiz. Al pulsarlo, la tarifa se convierte en un campo editable. Al confirmar, se llama a `PATCH /api/suppliers/{id}/rate` y, **cuando la API responde**, la fila se actualiza con la nueva tarifa y la nueva fecha `updated_at`. Si la API la rechaza, el editor sigue abierto para que corrijas.

### Activar o suspender
El botón de la columna Estado alterna entre los dos valores permitidos. Igual que con la tarifa: la pantalla cambia **después** de la respuesta de la API, para no mostrar algo que en realidad no se guardó.

### Distinguir activos de suspendidos
- **Activo:** botón verde con la palabra "Activo".
- **Suspendido:** botón rojo con "Suspendido", y toda la fila se ve más apagada.

No se usa solo el color: también hay texto, para que se entienda aunque alguien no distinga bien los colores.

### Renovaciones de contrato
Si el contrato renueva en los próximos 60 días (hoy incluido), la fila se resalta en ámbar: fondo más cálido, una barra ámbar a la izquierda y el texto "Renueva en N días". A los 61 días ya no se resalta. Si la fecha ya pasó, sale en rojo con "Fecha vencida". (Con los datos iniciales todas están vencidas, porque son de 2025.)

## El archivo que habla con la API (`app/suppliers/api.ts`)

Todas las llamadas a la API están en un único archivo. Así, si la dirección de la API cambia, se cambia en un solo lugar. También traduce los errores de la API a frases legibles, por ejemplo:

```
currency must be EUR for country Spain
```

## Cómo llega la petición a la API

La página vive en el puerto 5175 y la API en el 8000. Un navegador no deja que una página hable libremente con otro "domicilio" (por seguridad). La solución: Vite hace de **proxy** (intermediario). La página le pregunta a Vite `/api/suppliers` y Vite se lo pasa a la API. Ya estaba configurado en `vite.config.ts` antes de este trabajo, y reenvía todo lo que empiece por `/api`.
