"""
Servicio de monitoreo de rendimiento del backend (cross-cutting).
"""
import asyncio
import logging
import json
from datetime import datetime
from typing import Dict, Optional

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil no está disponible. Las métricas de sistema no estarán disponibles.")

from src.config.performance_config import PERFORMANCE_CONFIG
from src.database.connection import get_pool

logger = logging.getLogger(__name__)


class PerformanceMonitorService:
    """Servicio para monitorear y loguear métricas de rendimiento del sistema."""

    def __init__(self, interval: float = None, enabled: bool = None):
        self.interval = interval or PERFORMANCE_CONFIG['LOG_INTERVAL']
        self.enabled = enabled if enabled is not None else PERFORMANCE_CONFIG['LOG_ENABLED']
        self._task: Optional[asyncio.Task] = None
        self._running = False

    def start(self):
        if not self.enabled:
            logger.debug("Performance monitoring is disabled")
            return
        if self._running:
            logger.warning("Performance monitoring is already running")
            return
        try:
            loop = asyncio.get_running_loop()
            self._running = True
            self._task = loop.create_task(self._monitor_loop())
            logger.info(f"Performance monitoring started (interval={self.interval}s)")
        except RuntimeError:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    self._running = True
                    self._task = loop.create_task(self._monitor_loop())
                    logger.info(f"Performance monitoring started (interval={self.interval}s)")
                else:
                    logger.error("Event loop is not running, cannot start performance monitoring")
            except RuntimeError as e2:
                logger.error(f"Cannot start performance monitoring: {e2}")

    def stop(self):
        if not self._running:
            return
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("Performance monitoring stopped")

    async def _monitor_loop(self):
        try:
            await asyncio.sleep(self.interval)
            while self._running:
                await self._collect_and_log()
                if self._running:
                    await asyncio.sleep(self.interval)
        except asyncio.CancelledError:
            logger.debug("Performance monitoring loop cancelled")
        except Exception as e:
            logger.error(f"Error in performance monitoring loop: {e}", exc_info=True)

    async def _collect_and_log(self):
        try:
            metrics = await self.collect_metrics()
            formatted = self.format_metrics(metrics)
            self.log_metrics(formatted)
        except Exception as e:
            logger.error(f"Error collecting performance metrics: {e}", exc_info=True)

    async def collect_metrics(self) -> Dict:
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "memory": self._collect_memory_metrics(),
            "cpu": self._collect_cpu_metrics(),
            "dbPool": await self._collect_db_pool_metrics(),
        }

    def _collect_memory_metrics(self) -> Dict:
        if not PSUTIL_AVAILABLE:
            return {"error": "psutil not available"}
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_percent = process.memory_percent()
            return {
                "rss": f"{memory_info.rss / 1024 / 1024:.2f} MB",
                "heapTotal": "N/A",
                "heapUsed": "N/A",
                "percent": f"{memory_percent:.2f}%",
            }
        except Exception as e:
            logger.warning(f"Error collecting memory metrics: {e}")
            return {"error": str(e)}

    def _collect_cpu_metrics(self) -> Dict:
        if not PSUTIL_AVAILABLE:
            return {"error": "psutil not available"}
        try:
            try:
                load_avg = psutil.getloadavg()
                load_avg_1m, load_avg_5m, load_avg_15m = f"{load_avg[0]:.2f}", f"{load_avg[1]:.2f}", f"{load_avg[2]:.2f}"
            except AttributeError:
                load_avg_1m, load_avg_5m, load_avg_15m = "N/A", "N/A", "N/A"
            cpu_percent = psutil.cpu_percent(interval=0.1)
            return {
                "loadAvg1m": load_avg_1m,
                "loadAvg5m": load_avg_5m,
                "loadAvg15m": load_avg_15m,
                "percent": f"{cpu_percent:.2f}%",
            }
        except Exception as e:
            logger.warning(f"Error collecting CPU metrics: {e}")
            return {"error": str(e)}

    async def _collect_db_pool_metrics(self) -> Dict:
        try:
            pool = await get_pool()
            if pool is None:
                return {"error": "Database pool not initialized"}
            try:
                pool_size = getattr(pool, '_size', 0)
                pool_idle = getattr(pool, '_idle', 0)
                pool_max_size = getattr(pool, '_maxsize', 0)
                return {
                    "totalConnections": pool_size,
                    "idleConnections": pool_idle,
                    "activeConnections": pool_size - pool_idle,
                    "maxSize": pool_max_size,
                    "waitingRequests": 0,
                }
            except (AttributeError, TypeError):
                return {
                    "totalConnections": "N/A",
                    "idleConnections": "N/A",
                    "activeConnections": "N/A",
                    "maxSize": "N/A",
                    "waitingRequests": 0,
                    "note": "Pool metrics not available",
                }
        except Exception as e:
            logger.warning(f"Error collecting DB pool metrics: {e}")
            return {"error": str(e)}

    def format_metrics(self, metrics: Dict) -> str:
        return json.dumps(metrics, indent=2)

    def log_metrics(self, formatted_metrics: str):
        log_level = PERFORMANCE_CONFIG['LOG_LEVEL'].upper()
        log_msg = f"[RUNTIME STATS] {formatted_metrics}"
        if log_level == "DEBUG":
            logger.debug(log_msg)
        elif log_level == "INFO":
            logger.info(log_msg)
        elif log_level == "WARNING":
            logger.warning(log_msg)
        elif log_level == "ERROR":
            logger.error(log_msg)
