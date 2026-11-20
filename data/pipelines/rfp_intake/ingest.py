"""
data/pipelines/rfp_intake/ingest.py
Conversión de PDF a Markdown (MarkItDown) y cálculo de métricas de legibilidad
(py-readability-metrics) antes de que cualquier agente LLM lea el documento.
"""
from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any, Dict

from markitdown import MarkItDown
from readability import Readability

logger = logging.getLogger("nexova.rfp_ingest")


def convert_pdf_to_markdown(pdf_path: str | Path) -> str:
    """
    Convierte un archivo PDF a Markdown usando MarkItDown.
    Falla explícitamente si el archivo no existe o no produce texto legible.
    """
    path = Path(pdf_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"No se encontró el PDF en '{path}'.")

    converter = MarkItDown()
    result = converter.convert(str(path))
    markdown_text = (result.text_content or "").strip()

    if not markdown_text:
        raise ValueError(f"El PDF '{path.name}' no contiene texto extraíble.")

    return markdown_text


def compute_readability_metrics(markdown_text: str) -> Dict[str, Any]:
    """
    Calcula métricas de legibilidad y estimación de tokens para anticipar
    el coste de procesamiento del pipeline (sin usarlas como nota literaria).
    """
    words = markdown_text.split()
    word_count = len(words)
    char_count = len(markdown_text)
    estimated_tokens = max(1, math.ceil(char_count / 4))

    metrics: Dict[str, Any] = {
        "word_count": word_count,
        "char_count": char_count,
        "estimated_tokens": estimated_tokens,
        "flesch_kincaid_grade": None,
        "gunning_fog": None,
        "processing_cost_tier": "low" if estimated_tokens < 1500 else ("medium" if estimated_tokens < 6000 else "high"),
        "metrics_note": None,
    }

    try:
        r = Readability(markdown_text)
        fk = r.flesch_kincaid()
        gf = r.gunning_fog()
        metrics["flesch_kincaid_grade"] = round(float(fk.score), 2)
        metrics["gunning_fog"] = round(float(gf.score), 2)
    except Exception as exc:
        # py-readability-metrics exige >= 100 palabras; manejamos PDFs cortos sin romper el flujo
        logger.info(f"Métricas completas omitidas ({exc}); usando estimación de tokens.")
        metrics["metrics_note"] = str(exc)

    return metrics