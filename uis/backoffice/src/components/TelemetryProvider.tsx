'use client'

import React, { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { telemetry } from '../services/telemetry';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname) {
            telemetry.track('page_viewed', {
                path: pathname
            });
        }
    }, [pathname])

    useEffect(() => {
        const handleGlobalError = (event: ErrorEvent) => {
            telemetry.track('client_unhandeled_error_capruted', {
                error_name: event.error?.name || 'Unknown',
                error_message_sanitized: event.message,
                current_url: window.location.href,
                stack_trace_hash: 'N/A'
            });
        };
        window.addEventListener('error', handleGlobalError);
    }, []);

    useReportWebVitals((metric) => {
        telemetry.track('web_vital_recorded', {
            metric_name: metric.name,
            value: Math.round(metric.value * (metric.name === 'CLS' ? 1000 : 1)),
            path: pathname || 'unknown'
        });
    });

    return <>{children}</>
}