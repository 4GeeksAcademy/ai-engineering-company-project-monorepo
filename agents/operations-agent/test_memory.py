"""
test_memory.py — Suite de Pruebas de Arquitectura de Memoria en Capas (Tiered Memory)

Verifica los requisitos clave de la Parte 1 del Hito de Memoria de Agentes:
1. Persistencia Multi-Sesión (Sesión 1 -> Guardado -> Sesión 2 independiente).
2. Prevención de saturación de contexto (Truncado FIFO en working memory).
3. Interfaz explícita de lectura/escritura (Solo recuerdos relevantes).
4. Desalojo (Eviction) y Olvido Explícito (Forget).
5. Memoria Semántica (Políticas inmutables de empresa).
"""

import os
import sys
from memory import TieredMemoryEngine, MemoryCategory
from agent import OperationsAgent

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".test_ops_memory.json")


def cleanup_test_db():
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except OSError:
            pass


def test_suite():
    print("🧪 ==========================================================")
    print("🧪 INICIANDO SUITE DE PRUEBAS: MEMORIA EN CAPAS (PARTE 1)")
    print("🧪 ==========================================================\n")

    cleanup_test_db()

    # ─────────────────────────────────────────────────────────────
    # PRUEBA 1: APRENDIZAJE EN SESIÓN 1 Y PERSISTENCIA EN DISCO
    # ─────────────────────────────────────────────────────────────
    print("📝 [TEST 1] Sesión 1: El operador declara preferencias y notas operativas...")
    agent_session1 = OperationsAgent(name="OpsBot-1", persistence_path=DB_PATH)

    # 1. Enseñar transportista
    r1 = agent_session1.process_message("Hola, mi transportista preferido es SEUR Frío")
    assert "SEUR Frío" in r1
    print("   ✅ Preferencia 1 aprendida:", r1.split("\n")[0])

    # 2. Enseñar almacén
    r2 = agent_session1.process_message("Anota que mi almacén por defecto es Zaragoza")
    assert "Zaragoza" in r2
    print("   ✅ Preferencia 2 aprendida:", r2.split("\n")[0])

    # 3. Enseñar nota de producto
    r3 = agent_session1.process_message("Nota para TF-ELEC-001: doble embalaje acolchado para evitar golpes")
    assert "TF-ELEC-001" in r3
    print("   ✅ Nota operativa aprendida:", r3.split("\n")[0])

    # Verificar que el archivo JSON en disco fue creado
    assert os.path.exists(DB_PATH), "El archivo de memoria en disco debería existir."
    print("   💾 Archivo de memoria persistente guardado en disco exitosamente.\n")

    # ─────────────────────────────────────────────────────────────
    # PRUEBA 2: SESIÓN 2 LIMPIA (COMPORTAMIENTO MULTI-SESIÓN)
    # ─────────────────────────────────────────────────────────────
    print("🔄 [TEST 2] Sesión 2: Nueva sesión independiente (chat limpio, sin historial previo)...")
    # Instanciamos un agente nuevo simulando un arranque al día siguiente
    agent_session2 = OperationsAgent(name="OpsBot-2", persistence_path=DB_PATH)

    # La memoria de corto plazo de la sesión actual debe estar en 0 turnos
    working_turns = agent_session2.memory.get_working_context()
    assert len(working_turns) == 0, "La nueva sesión no debe tener historial de conversación previo."
    print(f"   ✅ Verificación de amnesia en corto plazo: working_memory tiene {len(working_turns)} turnos.")

    # El usuario pregunta sobre un envío sin mencionar SEUR ni Zaragoza
    r_session2 = agent_session2.process_message("Necesito preparar un envío urgente frágil")
    print(f"   Respuesta del agente en Sesión 2:\n   \"{r_session2}\"")

    # El agente debe haber recordado automáticamente el transportista y la política semántica
    assert "SEUR Frío" in r_session2, "El agente debe recordar el transportista en una nueva sesión."
    assert "frágil" in r_session2.lower() or "frágiles" in r_session2.lower(), "Debe aplicar la política semántica de frágiles."
    print("   ✅ El agente recuperó de forma autónoma los recuerdos de largo plazo entre sesiones.\n")

    # ─────────────────────────────────────────────────────────────
    # PRUEBA 3: PREVENCIÓN DE SATURACIÓN DE CONTEXTO (CONTEXT BLOAT)
    # ─────────────────────────────────────────────────────────────
    print("🛡️  [TEST 3] Prevención de saturación de contexto (Bounded Working Memory)...")
    # Enviamos 12 turnos conversacionales
    for i in range(12):
        agent_session2.process_message(f"Mensaje de prueba número {i+1}")

    working_context = agent_session2.memory.get_working_context()
    max_turns = agent_session2.memory.max_working_memory_turns
    assert len(working_context) <= max_turns, f"Working memory no debe exceder {max_turns} turnos."
    print(f"   ✅ Límite respetado: Tras 12 mensajes, working_memory solo retiene los últimos {len(working_context)} turnos.")
    print("   ✅ Se evita el anti-patrón de acumular tokens infinitos en el prompt.\n")

    # ─────────────────────────────────────────────────────────────
    # PRUEBA 4: DESALOJO (EVICTION) Y OLVIDO EXPLÍCITO (FORGET)
    # ─────────────────────────────────────────────────────────────
    print("🧹 [TEST 4] Desalojo controlado y olvido explícito...")
    # Olvido explícito: El usuario revoca una preferencia antigua
    forgotten = agent_session2.memory.forget("preferred_carrier")
    assert forgotten is True, "El borrado explícito debe retornar True."
    assert len(agent_session2.memory.recall(query="preferred_carrier")) == 0, "El recuerdo no debe existir tras olvidarlo."
    print("   ✅ Olvido explícito completado: 'preferred_carrier' eliminado exitosamente.")

    # Prueba de límite de capacidad episódica y desalojo de menos relevante
    small_engine = TieredMemoryEngine(max_episodic_entries=3)
    small_engine.remember("fact1", "Dato 1")
    small_engine.remember("fact2", "Dato 2")
    small_engine.remember("fact3", "Dato 3")

    # Consultamos fact1 y fact2 varias veces para aumentar su access_count
    small_engine.recall(query="fact1")
    small_engine.recall(query="fact1")
    small_engine.recall(query="fact2")

    # Insertamos fact4 (supera el límite de 3) -> debe desalojar fact3 (menos consultado)
    small_engine.remember("fact4", "Dato 4")
    assert "fact3" not in small_engine.episodic_memory, "fact3 debió ser desalojado por baja relevancia."
    assert "fact1" in small_engine.episodic_memory, "fact1 debe conservarse por alta frecuencia de uso."
    assert "fact4" in small_engine.episodic_memory, "fact4 recién insertado debe conservarse."
    print("   ✅ Algoritmo de desalojo por relevancia validado: 'fact3' desalojado sin afectar a datos críticos.\n")

    # ─────────────────────────────────────────────────────────────
    # PRUEBA 5: CONSULTA DEL REPORTE DE RECUERDOS (INSPECTION)
    # ─────────────────────────────────────────────────────────────
    print("📊 [TEST 5] Consulta directa del estado de recuerdos del agente...")
    status_response = agent_session2.process_message("¿Qué recuerdas de mis preferencias?")
    print(f"   Reporte de memoria:\n{status_response}")
    assert "default_warehouse: Zaragoza" in status_response
    print("   ✅ El operador puede inspeccionar de forma transparente qué tiene guardado el agente.")

    # Limpieza final
    cleanup_test_db()

    print("\n🎉 ==========================================================")
    print("🎉 TODAS LAS PRUEBAS DE MEMORIA EN CAPAS PASARON AL 100%")
    print("🎉 ==========================================================")


if __name__ == "__main__":
    test_suite()
