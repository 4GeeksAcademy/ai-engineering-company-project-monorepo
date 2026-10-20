### BEFORE (no cache) — 30 identical requests per endpoint

| Endpoint | 1st (ms) | median (ms) | p95 (ms) | mean (ms) | size (KB) | cache HITs |
|---|---:|---:|---:|---:|---:|---:|
| `/api/incidents/summary` | 118.7 | 98.7 | 136.4 | 104.6 | 1.1 | 0/30 |
| `/api/incidents/facets` | 73.2 | 79.3 | 104.1 | 85.7 | 1.0 | 0/30 |
| `/api/incidents?page=1&page_size=15` | 91.1 | 96.1 | 121.9 | 102.2 | 8.1 | 0/30 |
| `/api/incidents?status=open&category=TECHNICAL&page=1&page_size=15` | 80.3 | 81.1 | 106.5 | 84.4 | 8.2 | 0/30 |
| `/api/incidents/summary?status=open&status=in_progress` | 114.2 | 88.3 | 117.0 | 95.2 | 1.0 | 0/30 |
| `/inventory/products` | 43.8 | 36.5 | 44.9 | 38.4 | 100.8 | 0/30 |
| `/inventory/products?office=Valencia&category=hardware` | 9.3 | 7.2 | 9.6 | 7.8 | 9.6 | 0/30 |
| `/inventory/orders` | 1002.6 | 913.7 | 1030.7 | 925.9 | 9814.2 | 0/30 |
| `/suppliers` | 6.3 | 5.0 | 6.3 | 5.7 | 85.3 | 0/30 |
| `/suppliers/search/by-country?country=Spain` | 4.1 | 2.9 | 3.1 | 3.0 | 43.3 | 0/30 |
| `/users/directory` | 3.6 | 1.7 | 1.7 | 1.8 | 0.1 | 0/30 |
| `/profiles/me` | 2.8 | 1.7 | 1.8 | 1.7 | 0.2 | 0/30 |
| `/auth/me` | 2.0 | 1.8 | 2.0 | 1.9 | 0.3 | 0/30 |
