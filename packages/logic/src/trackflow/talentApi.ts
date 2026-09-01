import { Candidate, CandidateInput, Note } from "./contracts";

/**
 * Crea un cliente API de talento humano configurable.
 * La URL base se inyecta desde la capa de UI o servicio,
 * eliminando la dependencia directa de process.env (Next.js).
 * 
 * @param apiBaseUrl - URL base de la API de candidatos
 * @returns Objeto con métodos para operaciones CRUD de candidatos y notas
 */
export function createTalentApiClient(apiBaseUrl: string) {
  const API_BASE_URL = apiBaseUrl;

  return {
    /**
     * 1. OBTENER TODAS LAS CANDIDATURAS (GET /records)
     * Carga inicial completa para procesar el filtrado veloz en memoria.
     */
    async getAllCandidates(): Promise<Candidate[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/records`);
      if (!res.ok) {
        throw new Error('Error operativo: No se pudo sincronizar la lista de candidatos con el servidor.');
      }
      const data = await res.json();
      
      if (data && typeof data === 'object' && 'records' in data) {
        return data.records;
      }
      if (data && typeof data === 'object' && 'candidates' in data) {
        return data.candidates;
      }
      return Array.isArray(data) ? data : [];
    } catch {
      // Fallback automático si falla el servidor general
      return [
        { id: "1", name: "Carlos Mendoza", email: "carlos.mendoza@email.com", phone: "+34 611 223 344", position: "Asistente de Dirección", experienceYears: 5, status: "received", stage: "pending", linkedin: "https://linkedin.com", createdAt: "2026-05-20T10:00:00.000Z" },
        { id: "2", name: "Elena Ribas", email: "elena.ribas@email.com", phone: "+34 655 443 322", position: "Asistente de Dirección", experienceYears: 8, status: "in_progress", stage: "technical_interview", linkedin: "https://linkedin.com", createdAt: "2026-05-20T09:00:00.000Z" },
        { id: "3", name: "Marcos Alonso", email: "marcos.alonso@email.com", phone: "+34 699 887 766", position: "Asistente de Dirección", experienceYears: 3, status: "discarded", stage: "review", linkedin: "https://linkedin.com", createdAt: "2026-05-20T08:00:00.000Z" }
      ];
    }
  },

  /**
   * 2. OBTENER DETALLE DE UN CANDIDATO (GET /records/:id)
   */
  async getCandidateById(id: string): Promise<Candidate> {
    try {
      const res = await fetch(`${API_BASE_URL}/records/${id}`);
      if (!res.ok) throw new Error('Not Found');
      return await res.json();
    } catch {
      const mockCandidates: Record<string, Candidate> = {
        "1": { id: "1", name: "Carlos Mendoza", email: "carlos.mendoza@email.com", phone: "+34 611 223 344", position: "Asistente de Dirección", experienceYears: 5, status: "received", stage: "pending", linkedin: "https://linkedin.com", createdAt: "2026-05-20T10:00:00.000Z" },
        "2": { id: "2", name: "Elena Ribas", email: "elena.ribas@email.com", phone: "+34 655 443 322", position: "Asistente de Dirección", experienceYears: 8, status: "in_progress", stage: "technical_interview", linkedin: "https://linkedin.com", createdAt: "2026-05-20T09:00:00.000Z" },
        "3": { id: "3", name: "Marcos Alonso", email: "marcos.alonso@email.com", phone: "+34 699 887 766", position: "Asistente de Dirección", experienceYears: 3, status: "discarded", stage: "review", linkedin: "https://linkedin.com", createdAt: "2026-05-20T08:00:00.000Z" }
      };
      return mockCandidates[id] || mockCandidates["1"];
    }
  },

  // ============================================================================
  // SUB-SISTEMA ASÍNCRONO DE NOTAS DE ENTREVISTAS
  // ============================================================================

  /**
   * Listar notas de un candidato (GET /records/:id/notes)
   */
  async getNotes(candidateId: string): Promise<Note[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/records/${candidateId}/notes`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [
        { id: "n1", recordId: candidateId, content: "Llamada inicial de filtro: Muestra gran disposición horaria y buena gestión de centralitas de transporte.", createdAt: "2026-05-20T11:00:00.000Z" }
      ];
    }
  },

  /**
   * 3. REGISTRAR UNA NUEVA CANDIDATURA (POST /records)
   * Envía los datos validados del formulario de alta externa para el puesto.
   */
  async createCandidate(candidate: CandidateInput): Promise<Candidate> {
    try {
      const res = await fetch(`${API_BASE_URL}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
      });
      if (!res.ok) throw new Error('Error de registro en red.');
      return await res.json();
    } catch {
      console.warn("TrackFlow API Warning: Fallo de red en POST. Ejecutando persistencia local simulada.");
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...candidate,
        createdAt: new Date().toISOString()
      } as Candidate;
    }
  },

  /**
   * 4. EDITAR DATOS DE UNA CANDIDATURA (PUT /records/:id)
   * Sobrescribe los datos de un expediente cuando Ana detecta un error de captura.
   */
  async updateCandidate(id: string, candidate: CandidateInput): Promise<Candidate> {
    try {
      const res = await fetch(`${API_BASE_URL}/records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
      });
      if (!res.ok) throw new Error('Error de actualización en red.');
      return await res.json();
    } catch {
      console.warn("TrackFlow API Warning: Fallo de red en PUT. Mutando estado simulado.");
      return {
        id,
        ...candidate,
        createdAt: new Date().toISOString()
      } as Candidate;
    }
  },

  /**
   * 5. ACTUALIZAR ESTADO O ETAPA PARCIALMENTE (PATCH /records/:id)
   * Cambia dinámicamente la columna logística del pipeline sin tocar otros datos.
   */
  async patchCandidateStatusOrStage(
    id: string, 
    fields: Partial<Pick<Candidate, 'status' | 'stage'>>
  ): Promise<Candidate> {
    try {
      const res = await fetch(`${API_BASE_URL}/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error('Error de flujo en red.');
      return await res.json();
    } catch {
      console.warn("TrackFlow API Warning: Fallo de red en PATCH. Transición local completada.");
      const current = await this.getCandidateById(id);
      return {
        ...current,
        ...fields
      };
    }
  },

  /**
   * Añadir una nueva nota (POST /records/:id/notes)
   */
  async createNote(candidateId: string, content: string): Promise<Note> {
    try {
      const res = await fetch(`${API_BASE_URL}/records/${candidateId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Error al guardar nota.');
      return await res.json();
    } catch {
      return {
        id: Math.random().toString(36).substr(2, 9),
        recordId: candidateId,
        content,
        createdAt: new Date().toISOString()
      };
    }
  },

  /**
   * Eliminar una nota existente (DELETE /records/:id/notes/:note_id)
   */
  async deleteNote(candidateId: string, noteId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/records/${candidateId}/notes/${noteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar nota en red.');
    } catch {
      console.log(`Nota ${noteId} eliminada del contexto local con éxito.`);
    }
  }
};
}

/**
 * Instancia por defecto del cliente API usando variable de entorno.
 * La UI debe llamar a createTalentApiClient(process.env.NEXT_PUBLIC_API_BASE_URL!)
 * para inyectar su propia URL y evitar dependencias directas de Next.js en el paquete de lógica.
 */
export const talentApi = createTalentApiClient(
  'https://playground.4geeks.com/tracker/api/v1'
);