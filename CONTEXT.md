# Brasaland - Implementation context

Brasaland is a grilled-food restaurant chain founded in Medellin in 2008, with 14 company-owned locations across Colombia and Florida. The platform operates in COP and USD.

Incidents use `id`, `title`, `description`, `category`, `status`, `origin`, `branch`, `created_at`, and `updated_at`. Valid origins are `customer`, `branch`, and `internal`. Valid statuses are `open`, `in_progress`, `resolved`, and `discarded`; resolved and discarded are final.

Valid categories are `service`, `product_quality`, `payment`, `technology`, `inventory`, `operations`, and `other`. Valid branches are `central`, the seven Medellin branches (`medellin_poblado`, `medellin_laureles`, `medellin_envigado`, `medellin_sabaneta`, `medellin_belen`, `medellin_las_americas`, `medellin_mayorca`), and the seven Florida branches (`florida_miami`, `florida_orlando`, `florida_tampa`, `florida_fort_lauderdale`, `florida_boca_raton`, `florida_weston`, `florida_doral`).

The seed translates CSV status and category values, uses description as title when needed, maps date to `created_at`, maps location to `branch`, and assigns `customer` origin to every historical row.
