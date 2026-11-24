"use client";

import { useEffect, useRef, type FocusEvent, type FormEvent } from "react";
import { track } from "@/lib/telemetry";

export type FormId = "inbound_order" | "outbound_order";
type ExitReason = "navigated_away" | "tab_closed" | "session_expired";

type FormFlow = { formId: FormId; startedAt: number; lastField?: string; form: HTMLFormElement | null };

/** Forms started and not yet submitted successfully: they are what "unsaved" and "abandoned" mean. */
const open = new Set<FormFlow>();

export function hasUnsavedForm(): boolean {
  return open.size > 0;
}

/** Fields (not read-only, not hidden) holding a value. Counts only: the values themselves are never read out. */
function filledFields(form: HTMLFormElement | null): number {
  if (!form) return 0;
  let filled = 0;
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
    if (element.disabled || ("readOnly" in element && element.readOnly)) continue;
    if (element.value.trim() !== "") filled++;
  }
  return filled;
}

function abandon(flow: FormFlow, reason: ExitReason): void {
  if (!open.delete(flow)) return;
  track("flow_abandoned", {
    form_id: flow.formId,
    last_field_focused: flow.lastField,
    fields_filled: filledFields(flow.form),
    seconds_since_start: Math.round((Date.now() - flow.startedAt) / 1000),
    exit_reason: reason,
  });
}

/** The session ended (401): every open form counts as abandoned for that reason. */
export function abandonOpenForms(reason: ExitReason): void {
  for (const flow of [...open]) abandon(flow, reason);
}

/**
 * Tracks one form: `form_started` on its first change, `flow_abandoned` if it is left (route change,
 * tab closed, session expired) without a successful submit. Spread `formProps` on the <form> and call
 * `completed()` after the order is saved. Inputs need a `name`: it is what `last_field_focused` reports.
 */
export function useFormTelemetry(formId: FormId) {
  const flow = useRef<FormFlow | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const onPageHide = () => flow.current && abandon(flow.current, "tab_closed");
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (flow.current) abandon(flow.current, "navigated_away");
    };
  }, []);

  return {
    formProps: {
      ref: formRef,
      onChange: () => {
        if (flow.current && open.has(flow.current)) return;
        flow.current = { formId, startedAt: Date.now(), form: formRef.current };
        open.add(flow.current);
        track("form_started", { form_id: formId });
      },
      onFocus: (event: FocusEvent<HTMLFormElement> | FormEvent<HTMLFormElement>) => {
        const target = event.target as HTMLElement & { name?: string };
        if (flow.current && target.name) flow.current.lastField = target.name;
      },
    },
    /** The form was submitted successfully: it is no longer open, and the next change starts a new flow. */
    completed: () => {
      if (flow.current) open.delete(flow.current);
      flow.current = null;
    },
  };
}
