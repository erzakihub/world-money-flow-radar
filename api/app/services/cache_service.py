import time
import functools
from typing import Any, Dict, Tuple

class TTLCache:
    """Thread-safe in-memory TTL Cache for FastAPI endpoints."""
    def __init__(self, default_ttl: int = 60):
        self.default_ttl = default_ttl
        self.cache: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Any:
        if key in self.cache:
            timestamp, data = self.cache[key]
            if time.time() - timestamp < self.default_ttl:
                return data
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: Any, ttl: int = None):
        expire_ttl = ttl if ttl is not None else self.default_ttl
        self.cache[key] = (time.time(), value)

    def clear(self):
        self.cache.clear()

global_ttl_cache = TTLCache(default_ttl=60)

def ttl_cache(seconds: int = 60):
    """Decorator for caching function results in memory for specified seconds."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Construct a unique string key from function name and arguments
            key_parts = [func.__name__]
            for arg in args:
                if not hasattr(arg, 'query'): # Skip SQLAlchemy Session DB objects
                    key_parts.append(str(arg))
            for k, v in sorted(kwargs.items()):
                if k != 'db': # Skip DB session
                    key_parts.append(f"{k}:{v}")
            cache_key = ":".join(key_parts)
            
            cached_val = global_ttl_cache.get(cache_key)
            if cached_val is not None:
                return cached_val
            
            result = func(*args, **kwargs)
            global_ttl_cache.set(cache_key, result, ttl=seconds)
            return result
        return wrapper
    return decorator
