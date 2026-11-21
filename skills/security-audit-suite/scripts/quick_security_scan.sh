#!/usr/bin/env bash
# skills/security-audit-suite/scripts/quick_security_scan.sh
# Reconocimiento estático de solo lectura y agnóstico al stack en 3 capas: Web/API, LLM y Servidor.
# Uso: bash skills/security-audit-suite/scripts/quick_security_scan.sh [directorio_objetivo]

set -u

TARGET_DIR="${1:-.}"

if [ ! -d "$TARGET_DIR" ]; then
  echo "[ERROR] Directorio objetivo no encontrado: $TARGET_DIR" >&2
  exit 1
fi

EXCLUDES=(
  "--exclude-dir=.git"
  "--exclude-dir=node_modules"
  "--exclude-dir=.venv"
  "--exclude-dir=venv"
  "--exclude-dir=__pycache__"
  "--exclude-dir=.next"
  "--exclude-dir=dist"
  "--exclude-dir=build"
  "--exclude-dir=.pytest_cache"
  "--exclude-dir=security-audit-suite"
  "--exclude=*.lock"
  "--exclude=package-lock.json"
  "--exclude=yarn.lock"
  "--exclude=*.min.js"
  "--exclude=*.map"
)

section() {
  echo ""
  echo "======================================================================"
  echo "  $1"
  echo "======================================================================"
}

scan_grep() {
  local label="$1"
  local pattern="$2"
  echo ""
  echo "--- $label ---"
  local output
  output=$(grep -rnE "${EXCLUDES[@]}" "$pattern" "$TARGET_DIR" 2>/dev/null | head -n 40 || true)
  if [ -z "$output" ]; then
    echo "  [OK] Sin coincidencias."
  else
    echo "$output"
  fi
}

echo "Security Audit Suite — Reconocimiento Estático"
echo "Objetivo: $TARGET_DIR"

section "1. OWASP Web 2025 — Secretos, Misconfiguración y Sumideros Peligrosos"
scan_grep "Posibles Claves Hardcodeadas / Claves Privadas" "(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})"
scan_grep "CORS Permisivo con Comodín (*)" "(allow_origins\s*=\s*\[\s*['\"]\*['\"]|origin:\s*['\"]\*['\"]|Access-Control-Allow-Origin.*\*)"
scan_grep "Flags de Debug Activados" "(debug\s*=\s*True|DEBUG\s*=\s*(true|True|1)|app\.run\(.*debug=True)"
scan_grep "Sumideros Peligrosos de Ejecución / Deserialización (SQLi/RCE/XSS)" "(shell\s*=\s*True|pickle\.loads?\(|yaml\.load\([^)]*\)|dangerouslySetInnerHTML|innerHTML\s*=|\beval\()"

section "2. OWASP Web y LLM — Cadena de Suministro y Lockfiles"
echo ""
echo "--- Archivos de Bloqueo e Imágenes Mutables :latest ---"
[ -f "$TARGET_DIR/pyproject.toml" ] && { [ -f "$TARGET_DIR/uv.lock" ] && echo "  [OK] uv.lock presente junto a pyproject.toml" || echo "  [ALERTA] pyproject.toml encontrado SIN uv.lock"; }
while IFS= read -r pkg; do
  dir=$(dirname "$pkg")
  if [ -f "$dir/package-lock.json" ] || [ -f "$dir/yarn.lock" ] || [ -f "$dir/pnpm-lock.yaml" ]; then
    echo "  [OK] Lockfile presente en $dir"
  else
    echo "  [ALERTA] package.json encontrado SIN lockfile en $dir"
  fi
done < <(find "$TARGET_DIR" -maxdepth 4 -name "package.json" -not -path "*/node_modules/*" 2>/dev/null || true)

scan_grep "Imágenes de Contenedor Mutables (:latest) en Docker/Compose" "(image:\s*[^[:space:]]+:latest|^FROM\s+[^[:space:]]+:latest)"

section "3. OWASP LLM 2026 — Unicode Invisible y Revisiones de Prompt/Vectores"
echo ""
echo "--- Caracteres Unicode Invisibles (Ancho Cero / Bloque Tag U+E0000..U+E007F) ---"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$TARGET_DIR" <<'PYEOF'
import os, re, sys
root = sys.argv[1]
skip_dirs = {".git", "node_modules", ".venv", "venv", "__pycache__", ".next", "dist", "build", "security-audit-suite"}
pattern = re.compile(r"[\u200B-\u200D\uFEFF\U000E0000-\U000E007F]")
hits = 0
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in skip_dirs]
    for fn in filenames:
        if not fn.endswith((".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".txt", ".json", ".yml", ".yaml")):
            continue
        fp = os.path.join(dirpath, fn)
        try:
            with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                for idx, line in enumerate(f, 1):
                    if pattern.search(line):
                        print(f"  [ALERTA] Unicode invisible en {fp}:{idx}")
                        hits += 1
                        if hits >= 25:
                            break
        except OSError:
            pass
    if hits >= 25:
        break
if hits == 0:
    print("  [OK] No se detectaron caracteres Unicode invisibles.")
PYEOF
else
  echo "  [OMITIDO] python3 no disponible para el escaneo Unicode."
fi

section "4. Endurecimiento de Servidor — Permisos (777) y Enlaces 0.0.0.0"
scan_grep "Uso Explícito de chmod 777 en Scripts/Dockerfiles" "chmod[^;\n]*777"
scan_grep "Puertos de Almacenes Internos Expuestos sin 127.0.0.1 en Compose" "['\"]?(5432|6379|6333|6334|27017):[0-9]+['\"]?"

echo ""
echo "======================================================================"
echo "  Reconocimiento estático finalizado. Continúa con la auditoría manual."
echo "======================================================================"
