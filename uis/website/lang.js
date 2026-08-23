(function () {
    const STORAGE_KEY = "brasaland-lang";
    const STRINGS = {
        en: {
            "meta.home.title": "Brasaland — Grilled food in Colombia and Florida",
            "meta.home.desc": "Brasaland is a grilled food restaurant chain in Colombia and Florida. Menu, locations, Brasa Points loyalty, and allergen information.",
            "meta.menu.title": "Menu — Brasaland",
            "meta.menu.desc": "Brasaland guest menu: grilled sirloin (Lomo a la Brasa), BBQ ribs, classic grilled chicken, tropical salad, corn arepa, and house sauce.",
            "meta.locations.title": "Locations — Brasaland",
            "meta.locations.desc": "Brasaland locations in Florida (miami-downtown) and Colombia (bogota-norte and COL-01 through COL-10).",
            "meta.loyalty.title": "Brasa Points — Brasaland",
            "meta.loyalty.desc": "Brasa Points loyalty: earn 1 point per 10,000 COP or 10 USD. Bronze, Silver, and Gold tiers, redemption rules, and FAQ.",
            "meta.allergens.title": "Allergens — Brasaland",
            "meta.allergens.desc": "Brasaland allergen protocol: INVIMA and FDA disclosure, kitchen steps, and gluten-free limitations for BBQ Ribs.",
            "meta.staff.title": "Staff tools — Brasaland",
            "meta.staff.desc": "Brasaland internal tools used with the company API: leadership KPIs, telemetry, knowledge assistant, and incident analysis.",
            "meta.404.title": "Page not found — Brasaland",
            "skip": "Skip to content",
            "nav.home": "Home",
            "nav.menu": "Menu",
            "nav.locations": "Locations",
            "nav.loyalty": "Brasa Points",
            "nav.allergens": "Allergens",
            "nav.pages": "Pages",
            "nav.close": "Close",
            "nav.pagesAria": "Open site pages",
            "nav.primary": "Primary",
            "theme.dark": "Dark mode",
            "theme.light": "Light mode",
            "lang.button": "ES",
            "lang.aria": "Switch to Spanish",
            "footer.tagline": "Public site for guests. Operations tools stay behind sign-in.",
            "footer.staff": "Staff tools",
            "footer.github": "GitHub repository",
            "home.kicker": "Grilled food · Colombia + Florida",
            "home.h1": "Fire, protein and the same table on both sides of the map.",
            "home.hero": "Brasaland is a grilled food restaurant chain. We cook sirloin, ribs and chicken over the brasa, serve them with house sauce and arepas, and keep Brasa Points valid at every location in Colombia and Florida.",
            "home.cta.menu": "See the menu",
            "home.cta.loyalty": "Join Brasa Points",
            "home.cook.h2": "What we cook",
            "home.cook.lede": "The disclosed guest menu is six dishes. The first list is the grill. The second is salad, arepa, and house sauce. Dish detail is on the menu page.",
            "home.grill.h3": "From the grill",
            "home.grill.lede": "Sirloin, ribs, and chicken cooked over the brasa.",
            "home.sides.h3": "Salad, side, and sauce",
            "home.sides.lede": "Tropical salad, corn arepa, and house sauce.",
            "home.fullmenu": "Open the full menu",
            "home.markets.h2": "Two markets, one program",
            "home.markets.lede": "Florida prices and redemptions are in USD. Colombia prices and redemptions are in COP. We never convert one into the other on this site.",
            "home.florida.h3": "Florida",
            "home.florida.p": "miami-downtown — USD market. Earn 1 Brasa Point for every 10 USD spent.",
            "home.colombia.h3": "Colombia",
            "home.colombia.p": "bogota-norte plus locations COL-01 through COL-10 — COP market. Earn 1 Brasa Point for every 10,000 COP spent.",
            "home.protocol.h3": "Allergen protocol",
            "home.protocol.p": "Servers notify the kitchen before preparation. Separate utensils and surfaces are used. We never claim zero cross-contamination risk.",
            "kind.main": "Main",
            "kind.mainGrill": "Main · grilled",
            "kind.side": "Side",
            "kind.sauce": "Sauce",
            "dish.sirloin": "Grilled Sirloin",
            "dish.sirloinAlso": "Lomo a la Brasa",
            "dish.sirloinHome": "Beef sirloin over the brasa, with a marinade.",
            "dish.ribs": "Brasaland BBQ Ribs",
            "dish.ribsHome": "Grilled ribs with imported sauce.",
            "dish.chicken": "Classic Grilled Chicken",
            "dish.chickenHome": "Chicken cooked over the brasa.",
            "dish.salad": "Tropical Salad",
            "dish.saladHome": "With cashew and feta.",
            "dish.arepa": "Corn Arepa",
            "dish.arepaHome": "Served with the grill.",
            "dish.sauce": "House Sauce",
            "dish.sauceHome": "Brasaland house sauce.",
            "alt.sirloin": "Grilled sirloin, Lomo a la Brasa",
            "alt.sirloinLong": "Grilled sirloin, Lomo a la Brasa, sliced with grill marks",
            "alt.ribs": "Brasaland BBQ ribs",
            "alt.ribsLong": "Brasaland BBQ ribs with house barbecue glaze",
            "alt.chicken": "Classic grilled chicken",
            "alt.chickenLong": "Classic grilled chicken with charcoal grill marks",
            "alt.salad": "Tropical salad with feta and cashews",
            "alt.saladLong": "Tropical salad with feta cheese and cashews",
            "alt.arepa": "Corn arepa",
            "alt.arepaLong": "Corn arepa, toasted golden corn cake",
            "alt.sauce": "Brasaland house sauce",
            "alt.sauceLong": "Brasaland house sauce in a small ramekin",
            "chip.gf": "gluten-free",
            "chip.df": "dairy-free",
            "chip.nf": "nut-free",
            "chip.soy": "contains soy",
            "chip.peanut": "may contain trace peanuts",
            "chip.notgf": "not certified gluten-free",
            "chip.cashew": "contains nuts (cashew)",
            "chip.feta": "contains dairy (feta)",
            "chip.dairy": "contains dairy",
            "chip.egg": "contains egg",
            "chip.sulfites": "contains sulfites",
            "menu.kicker": "Guest menu",
            "menu.lede": "Six dishes. No prices here — Florida is USD, Colombia is COP.",
            "menu.grill.lede": "Sirloin, ribs, and chicken.",
            "menu.ribsAlso": "With imported sauce",
            "menu.sirloin.copy": "Beef sirloin over the brasa, with a marinade.",
            "menu.ribs.copy": "Grilled ribs with imported sauce.",
            "menu.chicken.copy": "Chicken cooked over the brasa.",
            "menu.salad.copy": "With cashew and feta.",
            "menu.arepa.copy": "Served with the grill.",
            "menu.sauce.copy": "Brasaland house sauce.",
            "menu.allergens.sirloin": "Contains soy.",
            "menu.allergens.ribs": "Contains soy. Not certified gluten-free.",
            "menu.allergens.chicken": "Gluten-free, dairy-free, nut-free.",
            "menu.allergens.salad": "Contains nuts and dairy.",
            "menu.allergens.arepa": "Contains dairy and egg.",
            "menu.allergens.sauce": "Contains soy and sulfites.",
            "menu.note": "Allergens and kitchen steps: <a href=\"allergens.html\">Allergens</a>.",
            "loc.kicker": "Company locations",
            "loc.h2": "Where we operate",
            "loc.lede": "Location identifiers match operations (tickets, stock, and loyalty). Street addresses are not published in the company knowledge base, so they are not listed here.",
            "loc.fl.h3": "Florida · USD",
            "loc.fl.p": "Spend and Brasa Points redemption use USD. 1 point for every 10 USD spent.",
            "loc.co.h3": "Colombia · COP",
            "loc.co.p": "Spend and Brasa Points redemption use COP. 1 point for every 10,000 COP spent.",
            "loc.ids.h2": "All location IDs",
            "loc.ids.lede": "Colombia sites COL-01 through COL-10 use COP. bogota-norte also uses COP. miami-downtown uses USD.",
            "loc.th.id": "Location ID",
            "loc.th.country": "Country",
            "loc.th.currency": "Market currency",
            "loc.country.co": "Colombia",
            "loc.country.us": "United States (Florida)",
            "loc.note": "Brasa Points earned in one country remain valid at any Brasaland location in Colombia and Florida, using that day’s exchange rate at redemption — we do not convert amounts on this page.",
            "loy.kicker": "Loyalty",
            "loy.lede": "For every 10,000 COP (or 10 USD in Florida) spent, you earn 1 point. Points do not expire while the account stays active (at least one purchase every 12 months).",
            "loy.bronze": "Bronze · 0–19 points",
            "loy.bronze.p": "5% off drinks on Tuesdays.",
            "loy.silver": "Silver · 20–49 points",
            "loy.silver.p": "10% off the main dish, once a month.",
            "loy.gold": "Gold · 50+ points",
            "loy.gold.p": "15% permanent discount and early access to the seasonal menu before the general public.",
            "loy.how": "How redemption works",
            "loy.how.1": "Redeem starting at 15 accumulated points, in increments of 5.",
            "loy.how.2": "Every 5 points redeemed equal a discount of 20,000 COP (20 USD) on the bill.",
            "loy.how.3": "Points cannot be combined with other active monthly promotions.",
            "loy.how.4": "The program exists on physical stamp cards (being phased out) and in the digital app.",
            "loy.how.5": "A physical card can be transferred to the app only once, by presenting the completed card at any location.",
            "loy.faq": "Guest questions",
            "loy.faq1.h": "Can points be used on delivery?",
            "loy.faq1.p": "Yes. They apply the same way as in-store, as long as the order is placed through the app.",
            "loy.faq2.h": "Can I share my account?",
            "loy.faq2.p": "No. Every Brasa Points account is individual and non-transferable between people.",
            "loy.faq3.h": "What if I move countries?",
            "loy.faq3.p": "Points are valid at any Brasaland location in Colombia and Florida, at that day’s exchange rate.",
            "all.kicker": "Customer safety",
            "all.h2": "Allergen information",
            "all.lede": "Brasaland discloses allergens according to INVIMA in Colombia and the FDA in the United States. Floor staff must be able to answer allergen questions without hesitation.",
            "all.report": "If you report an allergy",
            "all.1": "The server informs the kitchen before preparation begins.",
            "all.2": "The kitchen uses clean utensils and a surface separate from the general prep area.",
            "all.3": "“Zero cross-contamination risk” is never guaranteed — the server must say this explicitly if you have a severe allergy.",
            "all.note": "There is no certified gluten-free version of the BBQ Ribs because of the imported sauce. Ask a server about that dish every time.",
            "all.byDish": "Declared allergens by dish",
            "all.dish.sirloin": "Gluten-free and dairy-free. Marinade contains soy.",
            "all.dish.ribs": "Sauce contains soy. Some production lines of the imported sauce may contain trace peanuts. There is no certified gluten-free version.",
            "all.dish.chicken": "Gluten-free, dairy-free, and nut-free.",
            "all.dish.salad": "Contains nuts (cashew) and dairy (feta cheese).",
            "all.dish.arepa": "Contains dairy and egg.",
            "all.dish.sauce": "Contains soy and sulfites.",
            "all.cta": "Open the guest menu",
            "staff.kicker": "Class presentation",
            "staff.h2": "Internal tools",
            "staff.lede": "The guest site is this public URL. Operations tools run on the FastAPI app in the same repository. Sign-in for those screens is mariana / brasaland.",
            "staff.kpi.h": "Leadership dashboard",
            "staff.kpi.p": "Weekly purchase cost, waste cost, waste ratio, stockouts, and price alerts by location. Live tickets over SSE.",
            "staff.tel.h": "Telemetry",
            "staff.tel.p": "Events per day, api_error / user_login_failed counts, and authentication failure rate. Guest pages send page_view when this site is served by the API. Login attempts are recorded on /auth/login. Live query against Supabase when the host is reachable.",
            "staff.know.h": "Knowledge assistant",
            "staff.know.p": "WebSocket chat over the Brasaland knowledge base: ordering, waste protocol, Brasa Points, and allergens.",
            "staff.inc.h": "Incident analysis",
            "staff.inc.p": "Upload or analyze a CSV, show summary metrics, and export results.",
            "staff.mcp.h": "MCP and n8n",
            "staff.mcp.p": "Stdio MCP at mcps/brasaland-ops. Weekly waste watch workflow at workflows/brasaland-weekly-kpi for import into n8n.",
            "staff.note": "Class launch from the repo root: ./scripts/start_presentation.sh then open local /backoffice/, /knowledge/, and /incidents/. Guest menu with photos: <a href=\"https://rickycastro1940.github.io/ai-engineering-company-project-monorepo/menu.html\">GitHub Pages menu</a>.",
            "nf.h2": "Page not found",
            "nf.lede": "That address is not part of the Brasaland public site.",
            "nf.cta": "Back to home",
            "bot.open": "Reserve",
            "bot.title": "Reservations",
            "bot.close": "Close",
            "bot.send": "Send",
            "bot.reset": "New reservation",
            "bot.placeholder": "Type here…",
            "bot.hello": "I can take a reservation for a published Brasaland location ID.",
            "bot.ask.location": "Which location ID? miami-downtown (USD), bogota-norte, or COL-01 through COL-10 (COP).",
            "bot.ask.party": "How many people?",
            "bot.ask.date": "What date? Use YYYY-MM-DD.",
            "bot.ask.time": "What time? Use HH:MM.",
            "bot.ask.name": "What name should go on the reservation?",
            "bot.bad.location": "Use a published ID: miami-downtown, bogota-norte, or COL-01 through COL-10.",
            "bot.bad.party": "Enter how many people, as a number.",
            "bot.bad.date": "Use a date like 2026-08-30.",
            "bot.bad.time": "Use a time like 19:00.",
            "bot.bad.name": "Enter a name.",
            "bot.confirmed": "Your reservation is confirmed.",
            "bot.code": "Confirmation code: {code}.",
            "bot.summary": "{location} ({currency}). {party} people. {date} at {time}. Name: {name}.",
            "bot.keep": "Keep this code. It is saved on this device.",
            "bot.already": "This reservation is already confirmed. Choose New reservation to start again.",
            "bot.chip.miami": "miami-downtown",
            "bot.chip.bogota": "bogota-norte",
            "bot.chip.col": "COL-01",
        },
        es: {
            "meta.home.title": "Brasaland — Comida a la brasa en Colombia y Florida",
            "meta.home.desc": "Brasaland es una cadena de comida a la brasa en Colombia y Florida. Menú, sedes, programa Brasa Points e información de alérgenos.",
            "meta.menu.title": "Menú — Brasaland",
            "meta.menu.desc": "Menú Brasaland: lomo a la brasa, costillas BBQ, pollo a la brasa clásico, ensalada tropical, arepa de maíz y salsa de la casa.",
            "meta.locations.title": "Sedes — Brasaland",
            "meta.locations.desc": "Sedes Brasaland en Florida (miami-downtown) y Colombia (bogota-norte y COL-01 a COL-10).",
            "meta.loyalty.title": "Brasa Points — Brasaland",
            "meta.loyalty.desc": "Programa Brasa Points: 1 punto por cada 10.000 COP o 10 USD. Niveles Bronce, Plata y Oro, canje y preguntas frecuentes.",
            "meta.allergens.title": "Alérgenos — Brasaland",
            "meta.allergens.desc": "Protocolo de alérgenos Brasaland: divulgación INVIMA y FDA, pasos en cocina y limitación sin gluten de las costillas BBQ.",
            "meta.staff.title": "Herramientas de personal — Brasaland",
            "meta.staff.desc": "Herramientas internas de Brasaland en la API de la empresa: KPI, telemetría, asistente de conocimiento y análisis de incidentes.",
            "meta.404.title": "Página no encontrada — Brasaland",
            "skip": "Saltar al contenido",
            "nav.home": "Inicio",
            "nav.menu": "Menú",
            "nav.locations": "Sedes",
            "nav.loyalty": "Brasa Points",
            "nav.allergens": "Alérgenos",
            "nav.pages": "Páginas",
            "nav.close": "Cerrar",
            "nav.pagesAria": "Abrir páginas del sitio",
            "nav.primary": "Principal",
            "theme.dark": "Modo oscuro",
            "theme.light": "Modo claro",
            "lang.button": "EN",
            "lang.aria": "Cambiar a inglés",
            "footer.tagline": "Sitio público para visitantes. Las herramientas de operación requieren inicio de sesión.",
            "footer.staff": "Herramientas de personal",
            "footer.github": "Repositorio de GitHub",
            "home.kicker": "Comida a la brasa · Colombia + Florida",
            "home.h1": "Fuego, proteína y la misma mesa a ambos lados del mapa.",
            "home.hero": "Brasaland es una cadena de comida a la brasa. Asamos lomo, costillas y pollo a la brasa, los servimos con salsa de la casa y arepas, y mantenemos Brasa Points válidos en todas las sedes de Colombia y Florida.",
            "home.cta.menu": "Ver el menú",
            "home.cta.loyalty": "Unirse a Brasa Points",
            "home.cook.h2": "Qué cocinamos",
            "home.cook.lede": "El menú divulgado a visitantes tiene seis platos. La primera lista es la parrilla. La segunda es ensalada, arepa y salsa de la casa. El detalle de cada plato está en la página de menú.",
            "home.grill.h3": "A la brasa",
            "home.grill.lede": "Lomo, costillas y pollo cocinados a la brasa.",
            "home.sides.h3": "Ensalada, acompañamiento y salsa",
            "home.sides.lede": "Ensalada tropical, arepa de maíz y salsa de la casa.",
            "home.fullmenu": "Abrir el menú completo",
            "home.markets.h2": "Dos mercados, un programa",
            "home.markets.lede": "En Florida los precios y canjes son en USD. En Colombia son en COP. En este sitio nunca convertimos una moneda en la otra.",
            "home.florida.h3": "Florida",
            "home.florida.p": "miami-downtown — mercado USD. Se gana 1 Brasa Point por cada 10 USD gastados.",
            "home.colombia.h3": "Colombia",
            "home.colombia.p": "bogota-norte más las sedes COL-01 a COL-10 — mercado COP. Se gana 1 Brasa Point por cada 10.000 COP gastados.",
            "home.protocol.h3": "Protocolo de alérgenos",
            "home.protocol.p": "El mesero avisa a la cocina antes de preparar. Se usan utensilios y superficies aparte. Nunca afirmamos riesgo cero de contaminación cruzada.",
            "kind.main": "Plato fuerte",
            "kind.mainGrill": "Plato fuerte · a la brasa",
            "kind.side": "Acompañamiento",
            "kind.sauce": "Salsa",
            "dish.sirloin": "Lomo a la brasa",
            "dish.sirloinAlso": "Grilled Sirloin",
            "dish.sirloinHome": "Lomo de res a la brasa, con adobo.",
            "dish.ribs": "Costillas BBQ Brasaland",
            "dish.ribsHome": "Costillas a la brasa con salsa importada.",
            "dish.chicken": "Pollo a la brasa clásico",
            "dish.chickenHome": "Pollo cocinado a la brasa.",
            "dish.salad": "Ensalada tropical",
            "dish.saladHome": "Con anacardo y feta.",
            "dish.arepa": "Arepa de maíz",
            "dish.arepaHome": "Se sirve con la parrilla.",
            "dish.sauce": "Salsa de la casa",
            "dish.sauceHome": "Salsa de la casa Brasaland.",
            "alt.sirloin": "Lomo a la brasa",
            "alt.sirloinLong": "Lomo a la brasa, en rodajas con marcas de parrilla",
            "alt.ribs": "Costillas BBQ Brasaland",
            "alt.ribsLong": "Costillas BBQ Brasaland con salsa",
            "alt.chicken": "Pollo a la brasa clásico",
            "alt.chickenLong": "Pollo a la brasa clásico con marcas de parrilla",
            "alt.salad": "Ensalada tropical con feta y anacardo",
            "alt.saladLong": "Ensalada tropical con queso feta y anacardo",
            "alt.arepa": "Arepa de maíz",
            "alt.arepaLong": "Arepa de maíz tostada",
            "alt.sauce": "Salsa de la casa Brasaland",
            "alt.sauceLong": "Salsa de la casa Brasaland en un cuenco pequeño",
            "chip.gf": "sin gluten",
            "chip.df": "sin lácteos",
            "chip.nf": "sin frutos secos",
            "chip.soy": "contiene soya",
            "chip.peanut": "puede contener trazas de maní",
            "chip.notgf": "no certificado sin gluten",
            "chip.cashew": "contiene frutos secos (anacardo)",
            "chip.feta": "contiene lácteos (feta)",
            "chip.dairy": "contiene lácteos",
            "chip.egg": "contiene huevo",
            "chip.sulfites": "contiene sulfitos",
            "menu.kicker": "Menú para visitantes",
            "menu.lede": "Seis platos. Sin precios aquí: Florida en USD, Colombia en COP.",
            "menu.grill.lede": "Lomo, costillas y pollo.",
            "menu.ribsAlso": "Con salsa importada",
            "menu.sirloin.copy": "Lomo de res a la brasa, con adobo.",
            "menu.ribs.copy": "Costillas a la brasa con salsa importada.",
            "menu.chicken.copy": "Pollo cocinado a la brasa.",
            "menu.salad.copy": "Con anacardo y feta.",
            "menu.arepa.copy": "Se sirve con la parrilla.",
            "menu.sauce.copy": "Salsa de la casa Brasaland.",
            "menu.allergens.sirloin": "Contiene soya.",
            "menu.allergens.ribs": "Contiene soya. No certificado sin gluten.",
            "menu.allergens.chicken": "Sin gluten, sin lácteos, sin frutos secos.",
            "menu.allergens.salad": "Contiene frutos secos y lácteos.",
            "menu.allergens.arepa": "Contiene lácteos y huevo.",
            "menu.allergens.sauce": "Contiene soya y sulfitos.",
            "menu.note": "Alérgenos y pasos en cocina: <a href=\"allergens.html\">Alérgenos</a>.",
            "loc.kicker": "Sedes de la empresa",
            "loc.h2": "Dónde operamos",
            "loc.lede": "Los identificadores de sede coinciden con operaciones (tickets, inventario y lealtad). Las direcciones de calle no están en la base de conocimiento de la empresa, así que no aparecen aquí.",
            "loc.fl.h3": "Florida · USD",
            "loc.fl.p": "El gasto y el canje de Brasa Points usan USD. 1 punto por cada 10 USD gastados.",
            "loc.co.h3": "Colombia · COP",
            "loc.co.p": "El gasto y el canje de Brasa Points usan COP. 1 punto por cada 10.000 COP gastados.",
            "loc.ids.h2": "Todos los ID de sede",
            "loc.ids.lede": "Las sedes COL-01 a COL-10 usan COP. bogota-norte también usa COP. miami-downtown usa USD.",
            "loc.th.id": "ID de sede",
            "loc.th.country": "País",
            "loc.th.currency": "Moneda del mercado",
            "loc.country.co": "Colombia",
            "loc.country.us": "Estados Unidos (Florida)",
            "loc.note": "Los Brasa Points ganados en un país siguen válidos en cualquier sede Brasaland de Colombia y Florida, con la tasa de cambio del día al canjear — no convertimos montos en esta página.",
            "loy.kicker": "Lealtad",
            "loy.lede": "Por cada 10.000 COP (o 10 USD en Florida) gastados, se gana 1 punto. Los puntos no vencen mientras la cuenta siga activa (al menos una compra cada 12 meses).",
            "loy.bronze": "Bronce · 0–19 puntos",
            "loy.bronze.p": "5% de descuento en bebidas los martes.",
            "loy.silver": "Plata · 20–49 puntos",
            "loy.silver.p": "10% de descuento en el plato fuerte, una vez al mes.",
            "loy.gold": "Oro · 50+ puntos",
            "loy.gold.p": "15% de descuento permanente y acceso anticipado al menú de temporada antes del público general.",
            "loy.how": "Cómo funciona el canje",
            "loy.how.1": "Se puede canjear desde 15 puntos acumulados, en incrementos de 5.",
            "loy.how.2": "Cada 5 puntos canjeados equivalen a 20.000 COP (20 USD) de descuento en la cuenta.",
            "loy.how.3": "Los puntos no se combinan con otras promociones mensuales activas.",
            "loy.how.4": "El programa existe en tarjetas de sellos físicas (en retiro) y en la app digital.",
            "loy.how.5": "Una tarjeta física se puede pasar a la app una sola vez, presentando la tarjeta completa en cualquier sede.",
            "loy.faq": "Preguntas de visitantes",
            "loy.faq1.h": "¿Se pueden usar puntos en domicilio?",
            "loy.faq1.p": "Sí. Aplican igual que en el local, si el pedido se hace por la app.",
            "loy.faq2.h": "¿Puedo compartir mi cuenta?",
            "loy.faq2.p": "No. Cada cuenta Brasa Points es individual y no se transfiere entre personas.",
            "loy.faq3.h": "¿Qué pasa si me mudo de país?",
            "loy.faq3.p": "Los puntos valen en cualquier sede Brasaland de Colombia y Florida, a la tasa de cambio del día.",
            "all.kicker": "Seguridad del cliente",
            "all.h2": "Información de alérgenos",
            "all.lede": "Brasaland declara alérgenos según INVIMA en Colombia y la FDA en Estados Unidos. El personal de piso debe poder responder preguntas de alérgenos sin dudar.",
            "all.report": "Si reporta una alergia",
            "all.1": "El mesero informa a la cocina antes de que empiece la preparación.",
            "all.2": "La cocina usa utensilios limpios y una superficie aparte del área general.",
            "all.3": "Nunca se garantiza “riesgo cero de contaminación cruzada”: el mesero debe decirlo de forma explícita si la alergia es grave.",
            "all.note": "No hay versión certificada sin gluten de las costillas BBQ por la salsa importada. Pregunte por ese plato cada vez.",
            "all.byDish": "Alérgenos declarados por plato",
            "all.dish.sirloin": "Sin gluten y sin lácteos. El adobo contiene soya.",
            "all.dish.ribs": "La salsa contiene soya. Algunas líneas de producción de la salsa importada pueden tener trazas de maní. No hay versión certificada sin gluten.",
            "all.dish.chicken": "Sin gluten, sin lácteos y sin frutos secos.",
            "all.dish.salad": "Contiene frutos secos (anacardo) y lácteos (queso feta).",
            "all.dish.arepa": "Contiene lácteos y huevo.",
            "all.dish.sauce": "Contiene soya y sulfitos.",
            "all.cta": "Abrir el menú para visitantes",
            "staff.kicker": "Presentación de clase",
            "staff.h2": "Herramientas internas",
            "staff.lede": "El sitio para visitantes es esta URL pública. Las herramientas de operación corren en la app FastAPI del mismo repositorio. El acceso es mariana / brasaland.",
            "staff.kpi.h": "Tablero de liderazgo",
            "staff.kpi.p": "Costo de compra semanal, costo de merma, ratio de merma, quiebres de stock y alertas de precio por sede. Tickets en vivo por SSE.",
            "staff.tel.h": "Telemetría",
            "staff.tel.p": "Eventos por día, conteos de api_error / user_login_failed y tasa de fallo de autenticación. Las páginas de visitantes envían page_view cuando la API sirve el sitio. Los intentos de acceso se registran en /auth/login. Consulta en vivo a Supabase cuando el host responde.",
            "staff.know.h": "Asistente de conocimiento",
            "staff.know.p": "Chat por WebSocket sobre la base de conocimiento Brasaland: pedidos, protocolo de merma, Brasa Points y alérgenos.",
            "staff.inc.h": "Análisis de incidentes",
            "staff.inc.p": "Cargue o analice un CSV, vea métricas de resumen y exporte resultados.",
            "staff.mcp.h": "MCP y n8n",
            "staff.mcp.p": "MCP stdio en mcps/brasaland-ops. Flujo semanal de merma en workflows/brasaland-weekly-kpi para importar en n8n.",
            "staff.note": "Arranque de clase desde la raíz del repo: ./scripts/start_presentation.sh y abra /backoffice/, /knowledge/ e /incidents/. Menú con fotos: <a href=\"https://rickycastro1940.github.io/ai-engineering-company-project-monorepo/menu.html\">menú en GitHub Pages</a>.",
            "nf.h2": "Página no encontrada",
            "nf.lede": "Esa dirección no forma parte del sitio público de Brasaland.",
            "nf.cta": "Volver al inicio",
            "bot.open": "Reservar",
            "bot.title": "Reservas",
            "bot.close": "Cerrar",
            "bot.send": "Enviar",
            "bot.reset": "Nueva reserva",
            "bot.placeholder": "Escriba aquí…",
            "bot.hello": "Puedo tomar una reserva para un ID de sede publicado de Brasaland.",
            "bot.ask.location": "¿Qué ID de sede? miami-downtown (USD), bogota-norte o COL-01 a COL-10 (COP).",
            "bot.ask.party": "¿Cuántas personas?",
            "bot.ask.date": "¿Qué fecha? Use AAAA-MM-DD.",
            "bot.ask.time": "¿Qué hora? Use HH:MM.",
            "bot.ask.name": "¿Qué nombre va en la reserva?",
            "bot.bad.location": "Use un ID publicado: miami-downtown, bogota-norte o COL-01 a COL-10.",
            "bot.bad.party": "Indique cuántas personas, en número.",
            "bot.bad.date": "Use una fecha como 2026-08-30.",
            "bot.bad.time": "Use una hora como 19:00.",
            "bot.bad.name": "Indique un nombre.",
            "bot.confirmed": "Su reserva está confirmada.",
            "bot.code": "Código de confirmación: {code}.",
            "bot.summary": "{location} ({currency}). {party} personas. {date} a las {time}. Nombre: {name}.",
            "bot.keep": "Guarde este código. Queda almacenado en este dispositivo.",
            "bot.already": "Esta reserva ya está confirmada. Elija Nueva reserva para empezar de nuevo.",
            "bot.chip.miami": "miami-downtown",
            "bot.chip.bogota": "bogota-norte",
            "bot.chip.col": "COL-01",
        },
    };

    function resolveLang() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === "es" || stored === "en") {
                return stored;
            }
        } catch (error) {
            /* ignore */
        }
        return "en";
    }

    function t(lang, key) {
        return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.en && STRINGS.en[key]) || "";
    }

    function applyLang(lang) {
        document.documentElement.lang = lang;
        const page = document.documentElement.getAttribute("data-page") || "";
        if (page) {
            const title = t(lang, "meta." + page + ".title");
            const desc = t(lang, "meta." + page + ".desc");
            if (title) {
                document.title = title;
            }
            const meta = document.querySelector('meta[name="description"]');
            if (meta && desc) {
                meta.setAttribute("content", desc);
            }
        }
        document.querySelectorAll("[data-i18n]").forEach((node) => {
            const key = node.getAttribute("data-i18n");
            const value = t(lang, key);
            if (!value) {
                return;
            }
            if (node.hasAttribute("data-i18n-html")) {
                node.innerHTML = value;
            } else {
                node.textContent = value;
            }
        });
        document.querySelectorAll("[data-i18n-alt]").forEach((node) => {
            const value = t(lang, node.getAttribute("data-i18n-alt"));
            if (value) {
                node.setAttribute("alt", value);
            }
        });
        document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
            const value = t(lang, node.getAttribute("data-i18n-aria"));
            if (value) {
                node.setAttribute("aria-label", value);
            }
        });
        const nav = document.getElementById("primary-nav");
        if (nav) {
            nav.setAttribute("aria-label", t(lang, "nav.primary"));
        }
        const pagesOpen = nav && nav.classList.contains("is-open");
        document.querySelectorAll("[data-nav-toggle]").forEach((button) => {
            button.textContent = pagesOpen ? t(lang, "nav.close") : t(lang, "nav.pages");
            button.setAttribute("aria-label", t(lang, "nav.pagesAria"));
        });
        const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.textContent = theme === "dark" ? t(lang, "theme.light") : t(lang, "theme.dark");
        });
        document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
            button.textContent = t(lang, "lang.button");
            button.setAttribute("aria-label", t(lang, "lang.aria"));
        });
    }

    function toggleLang() {
        const next = resolveLang() === "es" ? "en" : "es";
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch (error) {
            /* ignore */
        }
        applyLang(next);
        document.dispatchEvent(new CustomEvent("brasaland-lang"));
    }

    function wire() {
        document.querySelectorAll("[data-lang-toggle]").forEach((button) => {
            button.addEventListener("click", toggleLang);
        });
        applyLang(resolveLang());
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", wire);
    } else {
        wire();
    }

    window.BrasalandLang = {
        applyLang: function () {
            applyLang(resolveLang());
        },
        resolveLang,
        toggleLang,
        t: function (key) {
            return t(resolveLang(), key);
        },
    };
})();
