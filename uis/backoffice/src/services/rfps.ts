// uis/backoffice/src/services/rfps.ts

export interface RFPDepartmentSection {
    id?: number | null;
    department_id: string;
    department_name: string;
    owner_name: string;
    key_aspects: string[];
    open_questions: string[];
}

export interface RFPTicket {
    ticket_id: string;
    rfp_id: string;
    filename: string;
    raw_pdf_path: string;
    status: "analizando" | "descartado" | "analisis_completo" | "error" | string;
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
}

export const rfpService = new RFPService();