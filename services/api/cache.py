import time
import threading
from typing import Any, Optional, Dict, Set

class InMemoryCache:

    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expires: Dict[str, float] = {}
        self._tags: Dict[str, Set[str]] = {}   # tag -> set de keys asociadas
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        """Obtiene un valor de la caché. Retorna None si no existe o ya expiró."""
        with self._lock:
            if key not in self._data:
                return None
            
            # Verificar si expiró el TTL
            if time.time() > self._expires.get(key, 0):
                self._delete_key(key)
                return None
                
            return self._data[key]
    
    def set(self, key: str, value: Any, ttl_seconds: int = 60, tag: Optional[str] = None) -> None:
        """Guarda un valor en la caché con su tiempo de vida (TTL) en segundos y etiqueta opcional."""
        with self._lock:
            self._data[key] = value
            self._expires[key] = time.time() + ttl_seconds
            
            if tag:
                if tag not in self._tags:
                    self._tags[tag] = set()
                self._tags[tag].add(key)
    def invalidate(self, key: str) -> None:
        """Invalida una clave específica inmediatamente."""
        with self._lock:
            self._delete_key(key)

    def invalidate_tag(self, tag: str) -> int:
        """Invalida todas las claves asociadas a una etiqueta (ej. 'inventory' o 'suppliers')."""
        with self._lock:
            if tag not in self._tags:
                return 0
            keys_to_delete = list(self._tags[tag])
            for key in keys_to_delete:
                self._delete_key(key)
            del self._tags[tag]
            return len(keys_to_delete)
    
    def clear(self) -> None:
        """Limpia toda la caché."""
        with self._lock:
            self._data.clear()
            self._expires.clear()
            self._tags.clear()
    
    def _delete_key(self, key: str) -> None:
        """Elimina una clave internamente sin adquirir lock (para uso interno)."""
        self._data.pop(key, None)
        self._expires.pop(key, None)
        # Limpiar referencias de tags
        for keys_set in self._tags.values():
            keys_set.discard(key)

# Instancia única (Singleton) para toda la aplicación
cache = InMemoryCache()