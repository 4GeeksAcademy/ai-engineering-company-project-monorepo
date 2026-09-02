# Brasaland - Contexto de implementación

Brasaland es una cadena de restaurantes de cocina a la brasa fundada en 2008 en Medellín, con 14 locales propios en Colombia y Florida. La plataforma opera en COP y USD y debe mantener consistencia entre sedes.

## Incidencias

Una incidencia tiene `id`, `title`, `description`, `category`, `status`, `origin`, `branch`, `created_at` y `updated_at`. `origin` puede ser `customer`, `branch` o `internal`. `status` sigue el ciclo `open` -> `in_progress` -> `resolved` o `discarded`; los dos últimos son finales.

Categorías válidas: `service`, `product_quality`, `payment`, `technology`, `inventory`, `operations`, `other`.

Sedes válidas: `central`, `medellin_poblado`, `medellin_laureles`, `medellin_envigado`, `medellin_sabaneta`, `medellin_belen`, `medellin_las_americas`, `medellin_mayorca`, `florida_miami`, `florida_orlando`, `florida_tampa`, `florida_fort_lauderdale`, `florida_boca_raton`, `florida_weston`, `florida_doral`. `central` se usa cuando el reporte no corresponde a un local específico.

Las transformaciones del histórico CSV son: `status` y `category` se traducen mediante los mapas del seed, `description` se usa como `title` cuando el CSV no tiene título, `date` se convierte a `created_at`, `location` se convierte a `branch` y todos los registros históricos reciben `origin: customer`.
