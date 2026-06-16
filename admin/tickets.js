/*
      Este archivo contiene la logica de gestion de tickets de soporte para el panel de agentes.
      Se encarga de:    
        - Cargar y renderizar los tickets desde localStorage.*/
const TICKETS_STORAGE_KEY = "nexova_support_tickets_v3";
let activeTicketId = null;

const seedTickets = [
  {
    ticket_id: "TK-240601",
    fecha: "2026-06-10 09:35",
    cliente_info: {
      nombre: "RetailNova",
      email: "soporte@retailnova.example.com",
    },
    nivel_gravedad: "Alta",
    resumen_problema: "Fallo crítico de sincronización del catálogo de productos con el CRM central.",
    historial_transcripcion: [
      { role: "bot", text: "Hola, soy Nexova Assist. Para comenzar, indicame el nombre de tu empresa." },
      { role: "user", text: "RetailNova" },
      { role: "bot", text: "Comparte tu email de contacto corporativo." },
      { role: "user", text: "soporte@retailnova.example.com" },
      { role: "bot", text: "Describe brevemente la incidencia principal." },
      { role: "user", text: "Desde la última actualización, la API de sincronización con nuestro CRM no actualiza el stock y devuelve un timeout." },
    ],
    estado: "Abierto",
  },
  {
    ticket_id: "TK-240602",
    fecha: "2026-06-11 14:20",
    cliente_info: {
      nombre: "FinAxis Group",
      email: "mesa.ayuda@finaxis.example.com",
    },
    nivel_gravedad: "Media",
    resumen_problema: "Latencia elevada y timeouts intermitentes en el portal de acceso B2B.",
    historial_transcripcion: [
      { role: "bot", text: "Hola, soy Nexova Assist. Para comenzar, indicame el nombre de tu empresa." },
      { role: "user", text: "FinAxis Group" },
      { role: "bot", text: "Comparte tu email de contacto corporativo." },
      { role: "user", text: "mesa.ayuda@finaxis.example.com" },
      { role: "bot", text: "Describe brevemente la incidencia principal." },
      { role: "user", text: "Reportamos tiempos de carga superiores a 15 segundos en el portal B2B, afectando a la operativa de los asesores." },
    ],
    estado: "Abierto",
  },
  {
    ticket_id: "TK-240603",
    fecha: "2026-06-12 11:05",
    cliente_info: {
      nombre: "TechBridge",
      email: "it@techbridge.example.com",
    },
    nivel_gravedad: "Baja",
    resumen_problema: "Solicitud de asistencia para la configuración de webhooks y notificaciones.",
    historial_transcripcion: [
      { role: "bot", text: "Hola, soy Nexova Assist. Para comenzar, indicame el nombre de tu empresa." },
      { role: "user", text: "TechBridge" },
      { role: "bot", text: "Comparte tu email de contacto corporativo." },
      { role: "user", text: "it@techbridge.example.com" },
      { role: "bot", text: "Describe brevemente la incidencia principal." },
      { role: "user", text: "Necesitamos documentacion adicional o soporte para configurar el envío de eventos vía webhook hacia nuestro ERP." },
    ],
    estado: "Resuelto",
  },
  {
    ticket_id: "TK-240604",
    fecha: "2026-06-14 10:00",
    cliente_info: {
      nombre: "InnoTech",
      email: "dev@innotech.example.com",
    },
    nivel_gravedad: "Media",
    resumen_problema: "Divergencia de datos en la generación de reportes consolidados del módulo financiero.",
    historial_transcripcion: [],
    estado: "Abierto",
  },
  {
    ticket_id: "TK-240605",
    fecha: "2026-06-14 11:30",
    cliente_info: {
      nombre: "Global Retail",
      email: "ops@globalretail.example.com",
    },
    nivel_gravedad: "Baja",
    resumen_problema: "Consulta operativa sobre la importación masiva de perfiles de usuario vía CSV.",
    historial_transcripcion: [],
    estado: "Abierto",
  },
  {
    ticket_id: "TK-240606",
    fecha: "2026-06-14 15:45",
    cliente_info: {
      nombre: "SecureBank",
      email: "security@securebank.example.com",
    },
    nivel_gravedad: "Alta",
    resumen_problema: "Auditoría de seguridad reporta vulnerabilidad potencial en la autenticación SSO.",
    historial_transcripcion: [],
    estado: "Abierto",
  },
  {
    ticket_id: "TK-240607",
    fecha: "2026-06-15 09:00",
    cliente_info: {
      nombre: "DataCorp",
      email: "it@datacorp.example.com",
    },
    nivel_gravedad: "Media",
    resumen_problema: "Desincronización en el pipeline de datos que alimenta los dashboards de BI.",
    historial_transcripcion: [],
    estado: "Abierto",
  },
  {
    ticket_id: "TK-240608",
    fecha: "2026-06-15 11:20",
    cliente_info: {
      nombre: "HealthFirst",
      email: "support@healthfirst.example.com",
    },
    nivel_gravedad: "Baja",
    resumen_problema: "Requerimiento de actualización de políticas de acceso y rotación de contraseñas de administradores.",
    historial_transcripcion: [],
    estado: "Resuelto",
  },
  {
    ticket_id: "TK-240609",
    fecha: "2026-06-15 14:00",
    cliente_info: {
      nombre: "MarketPlaza",
      email: "admin@marketplaza.example.com",
    },
    nivel_gravedad: "Alta",
    resumen_problema: "Interrupción crítica en la pasarela de pagos impidiendo la liquidación de facturas.",
    historial_transcripcion: [],
    estado: "Abierto",
  },
];

/**
 * Normaliza un objeto de ticket para asegurar que siempre tenga la estructura esperada,
 * especialmente para `cliente_info` e `historial_transcripcion`.
 * @param {object} ticket - El objeto de ticket original.
 * @returns {object} El objeto de ticket normalizado.
 */
function normalizeTicket(ticket) {
  return {
    ...ticket,
    asignado_a: ticket.asignado_a || "Sin asignar",
    cliente_info: ticket.cliente_info || {
      nombre: ticket.cliente || "Cliente no identificado",
      email: "no-disponible@nexova.example.com",
    },
    historial_transcripcion: Array.isArray(ticket.historial_transcripcion)
      ? ticket.historial_transcripcion
      : [],
  };
}

/**
 * Se asegura de que haya datos iniciales (seed) en localStorage. Si no hay tickets,
 * guarda el array `seedTickets` para iniciar.
 */
function ensureTicketsSeeded() {
  const existing = localStorage.getItem(TICKETS_STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(seedTickets));
  }
}

/**
 * Lee los tickets desde localStorage. Llama a ensureTicketsSeeded para garantizar
 * que siempre haya datos y luego los parsea y normaliza.
 * @returns {Array<object>} Un array de objetos de ticket.
 */
function readTickets() {
  ensureTicketsSeeded();
  const data = localStorage.getItem(TICKETS_STORAGE_KEY);
  const parsed = data ? JSON.parse(data) : [];
  return parsed.map(normalizeTicket);
}

/**
 * Guarda un array de tickets en localStorage, convirtiéndolo a formato JSON.
 * @param {Array<object>} tickets - El array de tickets a guardar.
 */
function writeTickets(tickets) {
  localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
}

/**
 * Genera una marca de tiempo con el formato "YYYY-MM-DD HH:MM".
 * @returns {string} La fecha y hora actual formateada.
 */
function nowTimestamp() {
  const d = getSimulatedNow();
  const date = d.toISOString().slice(0, 10);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

/**
 * Infiere la gravedad de un ticket (Alta, Media, Baja) basándose en palabras clave
 * encontradas en el resumen del problema.
 * @param {string} summaryText - El texto del resumen del problema.
 * @returns {string} El nivel de gravedad inferido.
 */
function inferSeverity(summaryText) {
  const text = summaryText.toLowerCase();
  if (text.includes("caida") || text.includes("no funciona") || text.includes("bloque") || text.includes("urgente")) {
    return "Alta";
  }

  if (text.includes("lento") || text.includes("error") || text.includes("demora") || text.includes("intermitente")) {
    return "Media";
  }

  return "Baja";
}

/**
 * Devuelve las clases de Tailwind CSS correspondientes a la gravedad y estado de un ticket.
 * Esto se usa para colorear las etiquetas visuales.
 * @param {string} level - El nivel de gravedad ('Alta', 'Media', 'Baja').
 * @param {string} status - El estado del ticket ('Abierto', 'Resuelto').
 * @returns {string} Las clases de Tailwind para el fondo, texto y borde.
 */
function severityClasses(level, status) {
  if (status === "Resuelto") {
    return "bg-emerald-100 text-emerald-800 border-emerald-300";
  }

  if (level === "Alta") {
    return "bg-rose-100 text-rose-800 border-rose-300";
  }

  if (level === "Media") {
    return "bg-amber-100 text-amber-800 border-amber-300";
  }

  return "bg-emerald-100 text-emerald-800 border-emerald-300";
}

/**
 * Crea el elemento DOM para una burbuja de chat.
 * @param {string} text - El contenido del mensaje.
 * @param {string} role - El rol del emisor ('user', 'bot', 'agent').
 * @returns {HTMLElement} El elemento <article> de la burbuja de chat.
 */
function createMessageBubble(text, role) {
  const bubble = document.createElement("article");
  bubble.className = `max-w-[85%] rounded-xl px-3 py-2 text-sm leading-6 shadow-sm ${
    role === "user"
      ? "ml-auto bg-blue-900 text-white"
      : "mr-auto border border-slate-200 bg-white text-slate-800"
  }`;
  bubble.textContent = text;
  return bubble;
}

/**
 * Hace scroll automático en un contenedor de chat para mostrar el último mensaje.
 * @param {HTMLElement} container - El contenedor del chat.
 */
function scrollChatBottom(container) {
  container.scrollTop = container.scrollHeight;
}

/**
 * Añade una burbuja de chat al contenedor de mensajes y hace scroll.
 * @param {HTMLElement} container - El contenedor del chat.
 * @param {string} text - El contenido del mensaje.
 * @param {string} role - El rol del emisor.
 */
function addChatMessage(container, text, role) {
  const bubble = createMessageBubble(text, role);
  container.appendChild(bubble);
  scrollChatBottom(container);
}

/**
 * Muestra un indicador visual de "Escribiendo..." en el chat.
 * @param {HTMLElement} container - El contenedor del chat.
 */
function addTypingIndicator(container) {
  const indicator = document.createElement("p");
  indicator.id = "typingIndicator";
  indicator.className = "mr-auto mt-2 inline-flex rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800";
  indicator.textContent = "Escribiendo...";
  container.appendChild(indicator);
  scrollChatBottom(container);
}

/**
 * Elimina el indicador de "Escribiendo..." del chat.
 */
function removeTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) {
    indicator.remove();
  }
}

/**
 * Crea un nuevo objeto de ticket escalado desde el chat y lo guarda en localStorage.
 * @param {string} clientName - Nombre del cliente.
 * @param {string} clientEmail - Email del cliente.
 * @param {string} summaryText - Resumen del problema.
 * @param {Array<object>} transcript - El historial de la conversación del chat.
 * @returns {object} El nuevo objeto de ticket creado.
 */
function createEscalatedTicket(clientName, clientEmail, summaryText, transcript) {
  const tickets = readTickets();
  const ticket = {
    ticket_id: `TK-${Date.now().toString().slice(-6)}`,
    fecha: nowTimestamp(),
    cliente_info: {
      nombre: clientName || "Cliente no identificado",
      email: clientEmail || "no-disponible@nexova.example.com",
    },
    asignado_a: "Sin asignar",
    nivel_gravedad: inferSeverity(summaryText),
    resumen_problema: summaryText,
    historial_transcripcion: transcript,
    estado: "Abierto",
  };

  tickets.unshift(ticket);
  writeTickets(tickets);
  return ticket;
}

/**
 * Configura la lógica y los event listeners para el chatbot de soporte.
 * Gestiona el flujo de la conversación y la creación de tickets.
 */
function setupSupportChatbot() {
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatStatus = document.getElementById("chatStatus");
  const ticketSuccess = document.getElementById("ticketSuccess");
  const ticketSuccessText = document.getElementById("ticketSuccessText");

  if (!chatMessages || !chatForm || !chatInput || !chatStatus || !ticketSuccess || !ticketSuccessText) {
    return;
  }

  const flow = [
    "Hola, soy Nexova Assist. Para comenzar, indicame el nombre de tu empresa.",
    "Gracias. Comparte tu email de contacto corporativo.",
    "Perfecto. Ahora describe brevemente la incidencia principal.",
    "Entendido. Antes de escalar, intento una resolucion rapida: reiniciaste sesion y limpiaste cache?",
    "Gracias por validar. Voy a escalar este caso al panel de agentes con el contexto recopilado.",
  ];

  let step = 0;
  let clientName = "";
  let clientEmail = "";
  let summaryText = "";
  const transcript = [];

  addChatMessage(chatMessages, flow[0], "bot");
  transcript.push({ role: "bot", text: flow[0] });

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const userText = chatInput.value.trim();
    if (!userText) return;

    addChatMessage(chatMessages, userText, "user");
    transcript.push({ role: "user", text: userText });
    chatInput.value = "";

    if (step === 0) {
      clientName = userText;
      step = 1;
    } else if (step === 1) {
      clientEmail = userText;
      step = 2;
    } else if (step === 2) {
      summaryText = userText;
      step = 3;
    } else if (step === 3) {
      step = 4;
    }

    addTypingIndicator(chatMessages);
    chatStatus.textContent = "Analizando contexto con IA...";

    setTimeout(() => {
      removeTypingIndicator();

      if (step === 1) {
        addChatMessage(chatMessages, flow[1], "bot");
        transcript.push({ role: "bot", text: flow[1] });
        chatStatus.textContent = "Triaje inicial completado.";
        return;
      }

      if (step === 2) {
        addChatMessage(chatMessages, flow[2], "bot");
        transcript.push({ role: "bot", text: flow[2] });
        chatStatus.textContent = "Intento de resolucion guiada en curso.";
        return;
      }

      if (step === 3) {
        addChatMessage(chatMessages, flow[3], "bot");
        transcript.push({ role: "bot", text: flow[3] });
        chatStatus.textContent = "Intento de resolucion guiada en curso.";
        return;
      }

      addChatMessage(chatMessages, flow[4], "bot");
      transcript.push({ role: "bot", text: flow[4] });
      chatStatus.textContent = "Escalando ticket al panel de agentes...";

      const ticket = createEscalatedTicket(clientName, clientEmail, summaryText, transcript);
      chatForm.classList.add("hidden");
      ticketSuccess.classList.remove("hidden");
      ticketSuccessText.textContent = `Ticket ${ticket.ticket_id} creado para ${ticket.cliente_info.nombre} con gravedad ${ticket.nivel_gravedad}.`;
    }, 900);
  });
}

/**
 * Crea el elemento DOM para la tarjeta de un ticket en la vista principal (master).
 * @param {object} ticket - El objeto de ticket.
 * @returns {HTMLElement} El elemento <article> de la tarjeta del ticket.
 */
function createTicketCard(ticket) {
  const card = document.createElement("article");
  card.className = "rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300 transition-colors";
  card.dataset.ticketId = ticket.ticket_id;

  const badgeClasses = severityClasses(ticket.nivel_gravedad, ticket.estado);

  card.innerHTML = `
    <article
      class="w-full text-left flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-4 sm:w-1/4 cursor-pointer" data-ticket-trigger="${ticket.ticket_id}" aria-label="Ver detalle del ticket ${ticket.ticket_id}">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-blue-700">${ticket.ticket_id}</p>
          <h3 class="text-sm font-semibold text-slate-900 leading-tight mt-0.5">${ticket.cliente_info.nombre}</h3>
        </div>
      </div>
      
      <div class="sm:w-1/4 px-3">
        <label for="assign-${ticket.ticket_id}" class="sr-only">Asignado a</label>
        <select id="assign-${ticket.ticket_id}" data-assign-ticket="${ticket.ticket_id}" class="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none">
          <option value="Sin asignar" ${ticket.asignado_a === 'Sin asignar' ? 'selected' : ''}>Sin asignar</option>
          <option value="Roberto Diaz" ${ticket.asignado_a === 'Roberto Diaz' ? 'selected' : ''}>Roberto Diaz</option>
          <option value="Laura Mendoza" ${ticket.asignado_a === 'Laura Mendoza' ? 'selected' : ''}>Laura Mendoza</option>
          <option value="Carlos Gomez" ${ticket.asignado_a === 'Carlos Gomez' ? 'selected' : ''}>Carlos Gomez</option>
          <option value="Elena Vargas" ${ticket.asignado_a === 'Elena Vargas' ? 'selected' : ''}>Elena Vargas</option>
        </select>
      </div>

      <div class="flex-1 text-sm text-slate-600 line-clamp-1 sm:line-clamp-2 sm:px-5 cursor-pointer" data-ticket-trigger="${ticket.ticket_id}">
        ${ticket.resumen_problema}
      </div>

      <div class="flex items-center justify-between sm:w-[180px] sm:justify-end gap-4 sm:gap-5 cursor-pointer" data-ticket-trigger="${ticket.ticket_id}">
        <p class="text-xs text-slate-500 whitespace-nowrap">${ticket.fecha.split(" ")[0]}</p>
        <span class="inline-flex min-w-[75px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses}">
          ${ticket.nivel_gravedad}
        </span>
      </div>
    </article>
  `;

  return card;
}

/**
 * Busca un ticket por su ID y, si lo encuentra, abre su vista de detalle.
 * @param {string} ticketId - El ID del ticket a mostrar.
 */
function openTicketDetailById(ticketId) {
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.ticket_id === ticketId);
  if (!ticket) return;
  renderTicketDetail(ticket);
}

/**
 * Asigna event listeners a cada tarjeta de ticket para que abran la vista de detalle al hacer clic.
 * Evita duplicar listeners si se vuelve a renderizar.
 */
function bindTicketCardTriggers() {
  const triggers = document.querySelectorAll("[data-ticket-trigger]");
  triggers.forEach((trigger) => {
    // Evita registrar mas de una vez si se vuelve a renderizar.
    if (trigger.dataset.bound === "true") return;

    trigger.addEventListener("click", () => {
      openTicketDetailById(trigger.dataset.ticketTrigger);
    });

    trigger.dataset.bound = "true";
  });
}

/**
 * Asigna event listeners a los selects de cada tarjeta para guardar a qué trabajador
 * se le ha asignado el ticket de soporte.
 */
function bindTicketAssignees() {
  const selects = document.querySelectorAll("[data-assign-ticket]");
  selects.forEach((select) => {
    if (select.dataset.bound === "true") return;

    select.addEventListener("change", (e) => {
      const ticketId = e.target.dataset.assignTicket;
      const newAssignee = e.target.value;
      const tickets = readTickets();
      const index = tickets.findIndex((t) => t.ticket_id === ticketId);
      
      if (index > -1) {
        tickets[index].asignado_a = newAssignee;
        writeTickets(tickets);
      }
    });

    select.dataset.bound = "true";
  });
}

/**
 * Convierte el nivel de gravedad en un valor numérico para facilitar la ordenación.
 */
function getSeverityWeight(level) {
  if (level === "Alta") return 3;
  if (level === "Media") return 2;
  return 1;
}

/**
 * Rellena el DOM de la vista de detalle (modal) con los datos de un ticket específico.
 * También gestiona la visibilidad del chat de seguimiento según el estado del ticket.
 * @param {object} ticket - El objeto de ticket a renderizar.
 */
function renderTicketDetail(ticket) {
  const detailOverlay = document.getElementById("ticketDetailOverlay");
  const detailTicketId = document.getElementById("detailTicketId");
  const detailClientName = document.getElementById("detailClientName");
  const detailClientEmail = document.getElementById("detailClientEmail");
  const detailSeverity = document.getElementById("detailSeverity");
  const detailStatus = document.getElementById("detailStatus");
  const detailSummary = document.getElementById("detailSummary");
  const detailTranscript = document.getElementById("detailTranscript");
  const detailChatComposer = document.getElementById("detailChatComposer");
  const detailChatHint = document.getElementById("detailChatHint");
  const detailChatInput = document.getElementById("detailChatInput");
  const detailChatSend = document.getElementById("detailChatSend");

  if (
    !detailOverlay ||
    !detailTicketId ||
    !detailClientName ||
    !detailClientEmail ||
    !detailSeverity ||
    !detailStatus ||
    !detailSummary ||
    !detailTranscript
  ) {
    return;
  }

  detailTicketId.textContent = ticket.ticket_id;
  activeTicketId = ticket.ticket_id;
  detailClientName.textContent = ticket.cliente_info.nombre;
  detailClientEmail.textContent = ticket.cliente_info.email;
  detailSeverity.textContent = ticket.nivel_gravedad;
  detailStatus.textContent = ticket.estado;
  detailSeverity.className = `rounded-md border px-2 py-1 text-xs font-semibold ${severityClasses(
    ticket.nivel_gravedad,
    ticket.estado
  )}`;
  detailSummary.textContent = ticket.resumen_problema;

  detailTranscript.innerHTML = "";
  if (!ticket.historial_transcripcion.length) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate-600";
    empty.textContent = "No hay transcripcion disponible para este ticket.";
    detailTranscript.appendChild(empty);
  } else {
    ticket.historial_transcripcion.forEach((row) => {
      const item = document.createElement("article");
      item.className = `rounded-md px-3 py-2 text-sm ${
        row.role === "agent"
          ? "ml-auto max-w-[90%] bg-blue-900 text-white"
          : row.role === "user"
            ? "mr-auto max-w-[90%] border border-slate-200 bg-white text-slate-800"
            : "mr-auto max-w-[90%] border border-blue-200 bg-blue-50 text-blue-900"
      }`;
      item.textContent = row.text;
      detailTranscript.appendChild(item);
    });
  }

  if (detailChatComposer && detailChatHint && detailChatInput && detailChatSend) {
    const isOpen = ticket.estado === "Abierto";
    detailChatComposer.classList.toggle("opacity-60", !isOpen);
    detailChatInput.disabled = !isOpen;
    detailChatSend.disabled = !isOpen;
    detailChatHint.textContent = isOpen
      ? "Puedes enviar mensajes mientras el ticket este abierto."
      : "Ticket cerrado: el canal de seguimiento esta solo en modo lectura.";
  }

  detailOverlay.classList.remove("hidden");
}

/**
 * Se asegura de que el overlay (modal) del detalle del ticket exista en el DOM.
 * Si no existe (p. ej., en el panel principal), lo crea dinámicamente y lo añade al body.
 */
function ensureTicketDetailOverlay() {
  if (document.getElementById("ticketDetailOverlay")) {
    return;
  }

  const overlay = document.createElement("section");
  overlay.id = "ticketDetailOverlay";
  overlay.className = "fixed inset-0 z-40 hidden bg-slate-900/50 p-4 sm:p-6";
  overlay.setAttribute("aria-label", "Detalle de ticket");

  overlay.innerHTML = `
    <article class="mx-auto max-h-[90vh] max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
      <header class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">Detalle de ticket</p>
          <h2 id="detailTicketId" class="mt-1 text-2xl font-bold text-blue-950">TK-XXXXXX</h2>
        </div>
        <button id="closeTicketDetail" type="button" class="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Cerrar
        </button>
      </header>

      <section class="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <article>
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-600">Cliente</h3>
          <p id="detailClientName" class="mt-1 text-sm font-semibold text-slate-900">-</p>
          <p id="detailClientEmail" class="text-sm text-slate-700">-</p>
        </article>
        <article>
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-600">Estado</h3>
          <div class="mt-1 flex items-center gap-2">
            <span id="detailSeverity" class="rounded-md border px-2 py-1 text-xs font-semibold">-</span>
            <span id="detailStatus" class="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">-</span>
          </div>
        </article>
      </section>

      <section class="mt-5">
        <h3 class="text-sm font-semibold text-blue-950">Resumen del problema</h3>
        <p id="detailSummary" class="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">-</p>
      </section>

      <section class="mt-5">
        <h3 class="text-sm font-semibold text-blue-950">Historial de transcripcion</h3>
        <div id="detailTranscript" class="mt-2 max-h-48 overflow-y-auto grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3"></div>
      </section>

      <section id="detailChatComposer" class="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4">
        <h3 class="text-sm font-semibold text-blue-950">Canal de seguimiento con cliente</h3>
        <p id="detailChatHint" class="mt-1 text-xs text-blue-800">Puedes enviar mensajes mientras el ticket este abierto.</p>
        <form id="detailChatForm" class="mt-3">
          <label for="detailChatInput" class="sr-only">Escribe un mensaje al cliente</label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <input
              id="detailChatInput"
              name="detailChatInput"
              type="text"
              placeholder="Escribe una actualizacion para el cliente..."
              class="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
            />
            <button
              id="detailChatSend"
              type="submit"
              class="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Enviar mensaje
            </button>
          </div>
        </form>
      </section>

      <section id="detailActions" class="mt-5 rounded-md border border-blue-200 bg-blue-50 p-4">
        <h3 class="text-sm font-semibold text-blue-950">Acciones operativas</h3>
        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <button id="actionContactClient" type="button" class="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100">
            Contactar Cliente
          </button>
          <button id="actionVideoCall" type="button" class="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100">
            Videollamada
          </button>
          <button id="actionInviteEngineer" type="button" class="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100">
            Invitar Ingeniero
          </button>
        </div>
      </section>
    </article>
  `;

  document.body.appendChild(overlay);
}

/**
 * Configura todos los event listeners para la vista de detalle del ticket,
 * incluyendo el botón de cierre, el click en el overlay y las acciones operativas.
 */
function setupTicketDetailInteractions() {
  const board = document.getElementById("ticketsBoard");
  const closeButton = document.getElementById("closeTicketDetail");
  const overlay = document.getElementById("ticketDetailOverlay");
  const contactButton = document.getElementById("actionContactClient");
  const callButton = document.getElementById("actionVideoCall");
  const inviteButton = document.getElementById("actionInviteEngineer");
  const detailChatForm = document.getElementById("detailChatForm");
  const detailChatInput = document.getElementById("detailChatInput");

  if (!board) return;

  board.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-ticket-trigger]");
    if (!trigger) return;
    openTicketDetailById(trigger.dataset.ticketTrigger);
  });

  if (closeButton && overlay) {
    closeButton.addEventListener("click", () => {
      overlay.classList.add("hidden");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.classList.add("hidden");
      }
    });
  }

  if (contactButton) {
    contactButton.addEventListener("click", () => {
      alert("Canal de contacto con cliente abierto (simulacion).");
      console.log("Accion: Contactar Cliente");
    });
  }

  if (callButton) {
    callButton.addEventListener("click", () => {
      alert("Enlace de videollamada generado (simulacion).");
      console.log("Accion: Videollamada");
    });
  }

  if (inviteButton) {
    inviteButton.addEventListener("click", () => {
      alert("Ingeniero Nivel 2 invitado al caso (simulacion).");
      console.log("Accion: Invitar Ingeniero");
    });
  }

  if (detailChatForm && detailChatInput) {
    detailChatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = detailChatInput.value.trim();
      if (!message || !activeTicketId) return;

      const tickets = readTickets();
      const index = tickets.findIndex((item) => item.ticket_id === activeTicketId);
      if (index === -1) return;

      if (tickets[index].estado !== "Abierto") {
        alert("El ticket esta cerrado. No se pueden enviar nuevos mensajes.");
        return;
      }

      tickets[index].historial_transcripcion.push({ role: "agent", text: message });
      writeTickets(tickets);
      detailChatInput.value = "";

      renderTicketDetail(tickets[index]);
      // No re-renderizamos el panel completo aquí para no perder foco ni scroll
    });
  }
}

/**
 * Renderiza el panel completo de agentes: actualiza las métricas y el listado de tickets,
 * organizándolos en una lista horizontal y ordenándolos según la preferencia del usuario.
 */
function renderAgentPanel() {
  const board = document.getElementById("ticketsBoard");
  const metricActive = document.getElementById("metricActive");
  const metricHigh = document.getElementById("metricHigh");
  const metricResolved = document.getElementById("metricResolved");
  const sortSelect = document.getElementById("sortTickets");

  if (!board || !metricActive || !metricHigh || !metricResolved) {
    return;
  }

  const tickets = readTickets();
  board.innerHTML = "";

  const openTickets = tickets.filter((ticket) => ticket.estado === "Abierto");

  if (openTickets.length === 0) {
    const empty = document.createElement("p");
    empty.className = "rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600";
    empty.textContent = "No hay tickets abiertos en este momento.";
    board.appendChild(empty);
  } else {
    const sortOrder = sortSelect ? sortSelect.value : "desc";
    
    openTickets.sort((a, b) => {
      const weightA = getSeverityWeight(a.nivel_gravedad);
      const weightB = getSeverityWeight(b.nivel_gravedad);
      return sortOrder === "desc" ? weightB - weightA : weightA - weightB;
    });

    openTickets.forEach((ticket) => {
      board.appendChild(createTicketCard(ticket));
    });
  }

  metricActive.textContent = String(openTickets.length);
  metricHigh.textContent = String(openTickets.filter((ticket) => ticket.nivel_gravedad === "Alta").length);
  metricResolved.textContent = String(tickets.filter((ticket) => ticket.estado === "Resuelto").length);

  bindTicketCardTriggers();
  bindTicketAssignees();
}

function setupRefreshButton() {
  const refreshButton = document.getElementById("refreshTickets");
  if (!refreshButton) return;

  refreshButton.addEventListener("click", () => {
    renderAgentPanel();
  });
}

function setupSortDropdown() {
  const sortSelect = document.getElementById("sortTickets");
  if (!sortSelect) return;

  sortSelect.addEventListener("change", () => {
    renderAgentPanel();
  });
}

// Inicializa todos los módulos al cargar el DOM.
document.addEventListener("DOMContentLoaded", () => {
  ensureTicketsSeeded();
  ensureTicketDetailOverlay();
  setupSupportChatbot();
  setupRefreshButton();
  setupSortDropdown();
  setupTicketDetailInteractions();
});
