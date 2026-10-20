### AFTER (cache) — 30 identical requests per endpoint

| Endpoint | 1st (ms) | median (ms) | p95 (ms) | mean (ms) | size (KB) | cache HITs |
|---|---:|---:|---:|---:|---:|---:|
| `/api/incidents/summary` | 174.8 | 2.0 | 2.9 | 7.9 | 1.1 | 29/30 |
| `/api/incidents/facets` | 89.7 | 1.8 | 2.5 | 4.9 | 1.0 | 29/30 |
| `/api/incidents?page=1&page_size=15` | 106.8 | 2.1 | 2.8 | 5.7 | 8.1 | 29/30 |
| `/api/incidents?status=open&category=TECHNICAL&page=1&page_size=15` | 106.2 | 2.6 | 5.3 | 6.2 | 8.2 | 29/30 |
| `/api/incidents/summary?status=open&status=in_progress` | 93.1 | 2.0 | 2.6 | 5.2 | 1.0 | 29/30 |
| `/inventory/products` | 64.6 | 2.3 | 3.0 | 4.4 | 100.8 | 29/30 |
| `/inventory/products?office=Valencia&category=hardware` | 9.0 | 2.1 | 2.3 | 2.4 | 9.6 | 29/30 |
| `/inventory/orders` | 941.9 | 19.7 | 22.8 | 51.0 | 9814.2 | 29/30 |
| `/suppliers` | 6.3 | 5.3 | 9.0 | 6.2 | 85.3 | 0/30 |
| `/suppliers/search/by-country?country=Spain` | 4.3 | 2.9 | 4.3 | 3.1 | 43.3 | 0/30 |
| `/users/directory` | 2.0 | 1.7 | 1.9 | 1.7 | 0.1 | 0/30 |
| `/profiles/me` | 2.0 | 1.7 | 2.8 | 2.0 | 0.2 | 0/30 |
| `/auth/me` | 2.0 | 1.7 | 1.8 | 1.8 | 0.3 | 0/30 |
