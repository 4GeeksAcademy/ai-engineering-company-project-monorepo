// uis/backoffice/src/services/rfps.ts

export interface EvaluationDetail {
    passed: boolean;
    feedback?: string | null;
    [key: string]: unknown;
}

export interface EvaluationResultData {
    department_id: string;
    readability: EvaluationDetail;
    relevance: EvaluationDetail;
    compliance: EvaluationDetail;
    overall_pass: boolean;
    feedback_for_generator: string;
    iteration: number;
}

export interface ConflictTriggerData {
    trigger_id: string;
    detected: boolean;
    arbitrator: string;
    resolution_rule: string;
    applied_action: string;
    details?: string;
}

export interface ExecutionTraceEntryData {
    node: string;
    agent: string;
    input_summary: string;
    output_summary: string;
    timestamp: string;
}

export interface FinalProposalDocumentData {
    ticket_id: string;
    rfp_id: string;
    client_name?: string | null;
    client_hq?: string | null;
    currency: string;
    sections: Array<{
        department_id: string;
        department_name: string;
        approver: string;
        approved_at: string;
        content: string;
    }>;
    markdown_content: string;
    arbitration_log: ConflictTriggerData[];
    trace_log: ExecutionTraceEntryData[];
    generated_at: string;
}

export interface DepartmentApprovalPayload {
    department_id: string;
    decision: "approve" | "reject" | "request_changes";
    approver_name?: string;
    comments?: string;
}

export interface RFPDepartmentSection {
    id?: number | null;
    department_id: string;
    department_name: string;
    owner_name: string;
    key_aspects: string[];
    open_questions: string[];
    draft_content?: string | null;
    evaluation_results?: EvaluationResultData | null;
    approval_status?:
        | "borrador_generado"
        | "aprobado_evaluacion"
        | "needs_human_review"
        | "reintentando"
        | "esperando_aprobación"
        | "approved"
        | "rejected"
        | "request_changes"
        | string
        | null;
    approver?: string | null;
    approved_at?: string | null;
}

export interface RFPTicket {
    ticket_id: string;
    rfp_id: string;
    filename: string;
    raw_pdf_path: string;
    status:
    | "analizando"
    | "analisis_completo"
    | "generando_borrador"
    | "en_evaluacion"
    | "needs_human_review"
    | "listo_para_aprobacion"
    | "esperando_aprobación"
    | "terminado"
    | "descartado"
    | "error"
    | string;
    classification_reason?: string | null;
    client_name?: string | null;
    client_hq?: string | null;
    currency?: string | null;
    services_requested: string[];
    scope?: string | null;
    deadline?: string | null;
    budget_range?: string | null;
    departments_needed: string[];
    readability_metrics: Record<string, unknown>;
    synthesizer_summary?: string | null;
    handoff_payload: Record<string, unknown>;
    error_detail?: string | null;
    created_at: string;
    updated_at: string;
    sections: RFPDepartmentSection[];
    final_document?: FinalProposalDocumentData | null;
    conflict_triggers?: ConflictTriggerData[];
    trace_log?: ExecutionTraceEntryData[];
}

export interface RFPUploadResponse {
    ticket_id: string;
    rfp_id: string;
    status: string;
    raw_pdf_path: string;
    message: string;
}

class RFPService {
    private getAuthHeaders(isJson = true): HeadersInit {
        const token =
            typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        return {
            ...(isJson ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    private async handleResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
        if (res.status === 401) {
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
            throw new Error("Sesión expirada o no autorizada. Redirigiendo al login...");
        }

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg =
                typeof errorData.detail === "string"
                    ? errorData.detail
                    : `${fallbackMsg} (${res.status})`;
            throw new Error(errorMsg);
        }

        return res.json();
    }

    async uploadRfp(file: File): Promise<RFPUploadResponse> {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/rfps/upload", {
            method: "POST",
            headers: this.getAuthHeaders(false),
            body: formData,
        });

        return this.handleResponse<RFPUploadResponse>(res, "Error al subir el PDF de la RFP");
    }

    async triggerGeneration(ticketId: string): Promise<{ ticket_id: string; status: string; message: string }> {
        const res = await fetch(`/api/rfps/${encodeURIComponent(ticketId)}/generate`, {
            method: "POST",
            headers: this.getAuthHeaders(true),
        });

        return this.handleResponse(res, "Error al disparar la generación de propuesta");
    }

    async listTickets(): Promise<RFPTicket[]> {
        const res = await fetch("/api/rfps", {
            method: "GET",
            headers: this.getAuthHeaders(true),
        });

        return this.handleResponse<RFPTicket[]>(res, "Error al listar los tickets RFP");
    }

    async getTicket(ticketId: string): Promise<RFPTicket> {
        const res = await fetch(`/api/rfps/${encodeURIComponent(ticketId)}`, {
            method: "GET",
            headers: this.getAuthHeaders(true),
        });

        return this.handleResponse<RFPTicket>(res, "Error al consultar el detalle del ticket RFP");
    }

    async startApproval(ticketId: string): Promise<RFPTicket> {
        const res = await fetch(`/api/rfps/${encodeURIComponent(ticketId)}/start-approval`, {
            method: "POST",
            headers: this.getAuthHeaders(true),
        });

        return this.handleResponse<RFPTicket>(res, "Error al iniciar la aprobación humana");
    }

    async approveDepartment(ticketId: string, payload: DepartmentApprovalPayload): Promise<RFPTicket> {
        const res = await fetch(`/api/rfps/${encodeURIComponent(ticketId)}/approve`, {
            method: "POST",
            headers: this.getAuthHeaders(true),
            body: JSON.stringify(payload),
        });

        return this.handleResponse<RFPTicket>(res, "Error al registrar la aprobación del departamento");
    }

    async getFinalDocument(ticketId: string): Promise<FinalProposalDocumentData> {
        const res = await fetch(`/api/rfps/${encodeURIComponent(ticketId)}/final-document`, {
            method: "GET",
            headers: this.getAuthHeaders(true),
        });

        return this.handleResponse<FinalProposalDocumentData>(res, "Error al obtener el documento final");
    }
}

export const rfpService = new RFPService();