/**
 * useIncidents — React hooks for the Centralized Incident Manager
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listIncidents,
  getIncident,
  createIncident,
  updateIncidentStatus,
  getIncidentsSummary,
  type Incident,
  type IncidentCreateRequest,
  type IncidentStatus,
  type IncidentSummary,
} from '@/lib/incidents-api';

// ---------------------------------------------------------------------------
// useIncidentList
// ---------------------------------------------------------------------------

export function useIncidentList(filters?: {
  status?: string;
  category?: string;
  branch?: string;
}) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listIncidents(filters);
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading incidents');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.category, filters?.branch]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { incidents, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// useIncidentDetail
// ---------------------------------------------------------------------------

export function useIncidentDetail(id: string | null) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getIncident(id);
      setIncident(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading incident');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { incident, loading, error, refresh };
}

// ---------------------------------------------------------------------------
// useIncidentMutations
// ---------------------------------------------------------------------------

export function useIncidentMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: IncidentCreateRequest): Promise<Incident | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await createIncident(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating incident');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const transition = useCallback(
    async (id: string, newStatus: IncidentStatus): Promise<Incident | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await updateIncidentStatus(id, { status: newStatus });
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error updating status');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { create, transition, loading, error };
}

// ---------------------------------------------------------------------------
// useIncidentSummary
// ---------------------------------------------------------------------------

export function useIncidentSummary() {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIncidentsSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
