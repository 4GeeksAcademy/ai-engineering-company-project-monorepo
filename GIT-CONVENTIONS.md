# Git Conventions

> **Versión**: 1.0
> **Propósito**: Estandarizar los commits y la gestión de ramas en todos los proyectos
> **Sistema**: DeepSeek Agent Orchestrator v2.0

---

## Formato de commit (Conventional Commits)

```
<tipo>(<alcance opcional>): <descripción breve>

<cuerpo opcional (detalle, contexto, por qué)>

<issue o referencia opcional>
```

### Tipos permitidos

| Tipo | Cuándo usarlo | Ejemplo |
|------|---------------|---------|
| `feat` | Nueva funcionalidad | `feat(agent): agregar perfil de CTO` |
| `fix` | Corrección de bug | `fix(security): ocultar API key en logs` |
| `docs` | Cambios en documentación | `docs(agents): actualizar tabla de ruteo` |
| `style` | Formato, estilo (no afecta lógica) | `style(memory): alinear columnas en tabla` |
| `refactor` | Refactorización (sin agregar funcionalidad) | `refactor(soul): simplificar protocolo` |
| `perf` | Mejora de rendimiento | `perf(agents): optimizar carga de perfiles` |
| `test` | Agregar o corregir tests | `test(backend): agregar tests de API` |
| `chore` | Mantenimiento, tareas rutinarias | `chore: poblar package.json con scripts` |
| `ci` | Cambios en CI/CD | `ci: agregar pipeline de lint` |
| `memory` | Actualización de archivos de memoria | `memory(session): registrar decisión sobre stack` |

### Reglas
- **Máximo 72 caracteres** en la línea de asunto.
- **Un solo cambio lógico por commit** (commits atómicos).
- Usar **imperativo** en la descripción ("agregar", no "agregado" ni "agrega").
- No terminar el asunto con punto.

---

## Estrategia de ramas

### Para proyectos individuales (flujo simplificado)

```
main        → Rama estable, siempre deployable
  └── dev   → Rama de desarrollo activo
       ├── feat/nombre-corto    → Features nuevas
       ├── fix/nombre-corto     → Correcciones
       └── refactor/nombre      → Refactors
```

### Para proyectos colaborativos (GitHub Flow)

```
main           → Siempre deployable, protegida
  └── feat/xxx → Ramas de feature, se fusionan vía PR
  └── fix/xxx  → Ramas de fix, se fusionan vía PR
  └── docs/xxx → Ramas de documentación
```

---

## Pull Requests

### Estructura de PR

```markdown
## Descripción
[Qué hace este PR, por qué es necesario]

## Cambios
- [Archivo 1]: [qué cambió]
- [Archivo 2]: [qué cambió]

## Checklist
- [ ] Código sigue las convenciones del proyecto
- [ ] Commits atómicos y con mensajes claros
- [ ] Sin secretos ni archivos sensibles
- [ ] Documentación actualizada si aplica

## Closes
Closes #[issue-number]
```

### Reglas de PR
- PRs **pequeños** (< 200 líneas idealmente).
- **Un propósito** por PR (no mezclar features con fixes).
- **Rebase** contra main antes de abrir el PR.
- **Sin merges** de main en la rama de feature (usar rebase).

---

## Buenas prácticas

### Commits
- `git commit -m "feat: ..."` para cambios pequeños.
- `git commit` (sin -m) con mensaje multilínea para cambios complejos.
- `git commit --amend` solo en ramas locales (no en público).
- `git rebase -i` para limpiar historial local antes de push.

### Ramas
- Borrar ramas después de fusionar: `git branch -d feat/xxx`.
- Mantener `main` siempre verde (tests pasan, lint ok).
- No pushear a `main` directamente sin PR.

### Etiquetas
```bash
git tag -a v1.0.0 -m "v1.0.0 — Sistema de agentes completo"
git push origin v1.0.0
```

---

## Hooks recomendados

### Pre-commit (verificar secretos)
```bash
#!/bin/bash
# .git/hooks/pre-commit
if git diff --cached --name-only | xargs grep -l "sk-\|api_key\|API_KEY\|token\|TOKEN" 2>/dev/null; then
  echo "⚠️  Posibles secretos encontrados en archivos staged:"
  git diff --cached --name-only | xargs grep -n "sk-\|api_key\|token" 2>/dev/null
  exit 1
fi
```

### Commit-msg (validar formato)
```bash
#!/bin/bash
# .git/hooks/commit-msg
# VALIDA QUE EL MENSAJE SIGA CONVENTIONAL COMMITS
COMMIT_MSG=$(cat "$1")
if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore|ci|memory)(\(.+\))?: .+$"; then
  echo "⚠️  Formato de commit inválido. Usa: <tipo>(<alcance>): <descripción>"
  echo "    Tipos: feat, fix, docs, style, refactor, perf, test, chore, ci, memory"
  exit 1
fi
```

---

> *Git Conventions v1.0 — Sistema de Agentes DeepSeek — 2026-09-25*