// uis/backoffice/src/services/reporting.ts

export interface ExecutiveKPI {
  kpi_id: string;
  window_date: string;
  window_granularity: string;
  department: string;
  metric_name: string;
  metric_value: number;
  target_value: number;
  sla_status: "ON_TRACK" | "AT_RISK" | "BREACHED" | string;
  calculated_at: string;
  run_id: string;
}

export interface KPIsResponse {
  total_kpis: number;
  department_filter: string | null;
  kpis: ExecutiveKPI[];
}

export interface PipelineStatusResponse {
  run_id: string;
  flow_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_processed: number;
  error_message?: string | null;
  message?: string;
}

class ReportingService {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Obtiene los KPIs de negocio calculados desde services/reporting/
   */
  async getKPIs(department?: string, startDate?: string, endDate?: string): Promise<KPIsResponse> {
    const params = new URLSearchParams();
    if (department && department !== "all") params.append("department", department);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/backend-api/reporting/kpis${queryString}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Sesión expirada o no autorizada");
    }

    if (!res.ok) {
      throw new Error(`Error al consultar KPIs (${res.status})`);
    }

    return res.json();
  }

  /**
   * Consulta el estado de la última ejecución del pipeline de Prefect 3
   */
  async getPipelineStatus(): Promise<PipelineStatusResponse> {
    const res = await fetch("/backend-api/reporting/status", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Sesión no autorizada");
    }

    if (!res.ok) {
      throw new Error(`Error al consultar estado del pipeline (${res.status})`);
    }

    return res.json();
  }

  /**
   * Dispara una corrida manual del pipeline de Prefect
   */
  async triggerRun(windowDate?: string): Promise<{ message: string; target_date: string; status: string }> {
    const res = await fetch("/backend-api/reporting/trigger", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ window_date: windowDate || null }),
    });

    if (!res.ok) {
      throw new Error(`Error al disparar pipeline (${res.status})`);
    }

    return res.json();
  }
}

export const reportingService = new ReportingService();
