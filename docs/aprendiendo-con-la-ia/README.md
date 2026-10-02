# Aprendiendo con la IA

Esta carpeta cuenta, paso a paso y con palabras sencillas, **todo lo que se construyó** en el proyecto del Directorio de Proveedores de Nexova: qué se hizo, por qué se decidió así y cómo se resolvió cada problema.

No hace falta saber programar para empezar. Cada archivo explica primero la idea con una comparación de la vida real y después enseña dónde está en el código.

## Versión visual (recomendada)

Abre **[index.html](./index.html)**: es la misma guía pero con diagramas, demos donde puedes probar cosas (un validador, el seeder, una mini tabla), problemas desplegables, buscador de palabras y modo oscuro. Funciona sin instalar nada.

**Cómo abrirla en tu Codespace** (desde la raíz del repositorio):

```bash
python3 -m http.server 8090 --directory docs/aprendiendo-con-la-ia
```

Aparecerá un aviso abajo a la derecha: pulsa **"Abrir en el navegador"**. Si no lo ves, abre la pestaña **Puertos**, busca el **8090** y pulsa el globo. Para cerrarla, pulsa `Ctrl+C` en esa terminal.

También puedes hacer clic derecho sobre `index.html` en el explorador, elegir **Download** y abrir el archivo descargado con doble clic en tu ordenador.

Las versiones en texto (los archivos de abajo) dicen lo mismo y se leen directamente en VS Code.

## Cómo leerlo

Léelos en orden. Cada archivo se puede leer en 5 a 10 minutos.

| # | Archivo | De qué trata |
|---|---|---|
| 1 | [01-que-construimos.md](./01-que-construimos.md) | El problema, la solución y el mapa de todas las piezas |
| 2 | [02-el-backend.md](./02-el-backend.md) | La API: el "cerebro" que guarda y protege los datos |
| 3 | [03-el-frontend.md](./03-el-frontend.md) | La página web que ve Patricia |
| 4 | [04-decisiones-y-problemas.md](./04-decisiones-y-problemas.md) | Las decisiones que se tomaron y los errores que aparecieron (y cómo se arreglaron) |
| 5 | [05-tests-y-git.md](./05-tests-y-git.md) | Cómo se comprueba que todo funciona (42 tests y 28 comprobaciones en navegador) y cómo se ordenó el trabajo en ramas |
| 6 | [06-glosario-y-comandos.md](./06-glosario-y-comandos.md) | Palabras difíciles explicadas y los comandos para ver el proyecto |

## La idea en una frase

> Antes, los proveedores vivían en una hoja de cálculo que cada persona copiaba por su cuenta. Ahora viven en **un solo sitio** (una base de datos) al que todos acceden desde una página web, y ese sitio **no deja entrar datos incorrectos**.

## Si solo tienes 2 minutos

1. Abre [06-glosario-y-comandos.md](./06-glosario-y-comandos.md) y mira la sección "Ver el proyecto funcionando".
2. Lee "El viaje de un dato" en [01-que-construimos.md](./01-que-construimos.md).
3. Lee los 3 problemas más interesantes en [04-decisiones-y-problemas.md](./04-decisiones-y-problemas.md).
