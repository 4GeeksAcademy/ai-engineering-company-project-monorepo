# Carpeta `data/eval`

Esta carpeta está orientada a **evaluación y validación**: datasets de evaluación, “golden sets”, resultados de experimentos, métricas, y artefactos usados para medir calidad de modelos, RAG, agentes o pipelines.

- **Propósito principal**: centralizar los insumos y salidas de evaluación para asegurar mejoras medibles a lo largo de los hitos del proyecto.
- **Recomendación**: documenta cada set de evaluación (qué mide, cómo se construyó, criterios de éxito) y evita incluir datos sensibles; si es necesario, usa datos sintéticos o anonimizados.

## Preguntas y respuestas de conocimiento

`knowledge_qa.jsonl` reúne preguntas tomadas de `docs/company-knowledge-base/`. `eval_knowledge_qa.py` informa la tasa de acierto de recuperación y las comprobaciones de la respuesta, sin claves de pago (embeddings locales).

```bash
python data/eval/eval_knowledge_qa.py
```
