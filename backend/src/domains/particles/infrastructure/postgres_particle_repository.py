"""
Adaptador de persistencia: implementa IParticleRepository contra Postgres.
Las llamadas del caso de uso (get_particle_by_id, get_particles_by_viewport, etc.) terminan aquí.
"""
from typing import List, Optional
from uuid import UUID

from src.database.connection import get_connection
from src.domains.particles.application.ports.particle_repository import IParticleRepository
from src.domains.particles.schemas import (
    ParticleResponse,
    ParticleTypeResponse,
    ParticleViewportQuery,
)
from src.domains.shared.schemas import parse_jsonb_field


class PostgresParticleRepository(IParticleRepository):
    """Implementación concreta del puerto: lee/escribe partículas en juego_dioses.particulas y tipos_particulas."""

    async def bloque_exists(self, bloque_id: UUID) -> bool:
        """Consulta EXISTS en juego_dioses.bloques para el bloque_id."""
        async with get_connection() as conn:
            return await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM juego_dioses.bloques WHERE id = $1)",
                bloque_id
            )

    async def get_types_in_viewport(
        self, bloque_id: UUID, viewport: ParticleViewportQuery
    ) -> List[ParticleTypeResponse]:
        """DISTINCT tipo_particula_id en viewport; luego SELECT tipos_particulas por IDs; mapea a ParticleTypeResponse."""
        async with get_connection() as conn:
            tipo_ids_rows = await conn.fetch("""
                SELECT DISTINCT p.tipo_particula_id
                FROM juego_dioses.particulas p
                WHERE p.bloque_id = $1
                  AND p.celda_x BETWEEN $2 AND $3
                  AND p.celda_y BETWEEN $4 AND $5
                  AND p.celda_z BETWEEN $6 AND $7
                  AND p.extraida = false
            """, bloque_id, viewport.x_min, viewport.x_max, viewport.y_min, viewport.y_max,
                viewport.z_min, viewport.z_max)
            tipo_ids_list = [row["tipo_particula_id"] for row in tipo_ids_rows]
            if not tipo_ids_list:
                return []
            tipos = await conn.fetch("""
                SELECT id, nombre, color, geometria, opacidad
                FROM juego_dioses.tipos_particulas
                WHERE id = ANY($1::uuid[])
            """, tipo_ids_list)
            return [
                ParticleTypeResponse(
                    id=str(row["id"]),
                    nombre=row["nombre"],
                    color=row["color"] if row["color"] else None,
                    geometria=parse_jsonb_field(row["geometria"]) or None,
                    opacidad=float(row["opacidad"]) if row["opacidad"] is not None else None,
                )
                for row in tipos
            ]

    async def get_by_viewport(
        self, bloque_id: UUID, viewport: ParticleViewportQuery
    ) -> List[ParticleResponse]:
        async with get_connection() as conn:
            rows = await conn.fetch("""
                SELECT
                    p.id, p.bloque_id, p.celda_x, p.celda_y, p.celda_z,
                    p.tipo_particula_id, p.estado_materia_id, p.cantidad, p.temperatura, p.energia,
                    p.extraida, p.agrupacion_id, p.es_nucleo, p.propiedades, p.creado_por,
                    p.creado_en, p.modificado_en,
                    tp.nombre as tipo_nombre, em.nombre as estado_nombre
                FROM juego_dioses.particulas p
                JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
                JOIN juego_dioses.estados_materia em ON p.estado_materia_id = em.id
                WHERE p.bloque_id = $1
                  AND p.celda_x BETWEEN $2 AND $3
                  AND p.celda_y BETWEEN $4 AND $5
                  AND p.celda_z BETWEEN $6 AND $7
                  AND p.extraida = false
                ORDER BY p.celda_z, p.celda_y, p.celda_x
            """, bloque_id, viewport.x_min, viewport.x_max, viewport.y_min, viewport.y_max,
                viewport.z_min, viewport.z_max)
            return [ParticleResponse.from_row(row) for row in rows]

    async def count_by_viewport(
        self, bloque_id: UUID, viewport: ParticleViewportQuery
    ) -> int:
        """COUNT(*) de partículas en viewport y extraida=false."""
        async with get_connection() as conn:
            total = await conn.fetchval("""
                SELECT COUNT(*)
                FROM juego_dioses.particulas
                WHERE bloque_id = $1
                  AND celda_x BETWEEN $2 AND $3
                  AND celda_y BETWEEN $4 AND $5
                  AND celda_z BETWEEN $6 AND $7
                  AND extraida = false
            """, bloque_id, viewport.x_min, viewport.x_max, viewport.y_min, viewport.y_max,
                viewport.z_min, viewport.z_max)
            return total or 0

    async def get_by_id(
        self, bloque_id: UUID, particle_id: UUID
    ) -> Optional[ParticleResponse]:
        """SELECT partícula por id y bloque_id; JOIN tipos y estados; devuelve ParticleResponse o None."""
        async with get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT
                    p.id, p.bloque_id, p.celda_x, p.celda_y, p.celda_z,
                    p.tipo_particula_id, p.estado_materia_id, p.cantidad, p.temperatura, p.energia,
                    p.extraida, p.agrupacion_id, p.es_nucleo, p.propiedades, p.creado_por,
                    p.creado_en, p.modificado_en,
                    tp.nombre as tipo_nombre, em.nombre as estado_nombre
                FROM juego_dioses.particulas p
                JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
                JOIN juego_dioses.estados_materia em ON p.estado_materia_id = em.id
                WHERE p.id = $1 AND p.bloque_id = $2
            """, particle_id, bloque_id)
            if not row:
                return None
            return ParticleResponse.from_row(row)

    async def get_distinct_bloque_ids_for_temperature_update(self) -> List[str]:
        """SELECT DISTINCT bloque_id de partículas no extraídas (para tarea de temperatura)."""
        async with get_connection() as conn:
            rows = await conn.fetch(
                "SELECT DISTINCT bloque_id FROM juego_dioses.particulas WHERE extraida = false"
            )
            return [str(row["bloque_id"]) for row in rows]

    async def get_particles_with_thermal_inertia(
        self, bloque_id: str, inercia_minima: float = 0.1
    ) -> List[dict]:
        """SELECT partículas del bloque con inercia_termica > inercia_minima (id, celda_*, temperatura, inercia_termica)."""
        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT p.id, p.celda_x, p.celda_y, p.celda_z, p.temperatura,
                       tp.inercia_termica
                FROM juego_dioses.particulas p
                JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
                WHERE p.bloque_id = $1 AND p.extraida = false AND tp.inercia_termica > $2
                """,
                bloque_id,
                inercia_minima,
            )
            return [
                {
                    "id": row["id"],
                    "celda_x": float(row["celda_x"]),
                    "celda_y": float(row["celda_y"]),
                    "celda_z": float(row["celda_z"]),
                    "temperatura": float(row["temperatura"]) if row["temperatura"] is not None else 20.0,
                    "inercia_termica": float(row["inercia_termica"]),
                }
                for row in rows
            ]

    async def update_particle_temperature(
        self, particula_id: str, temperatura: float
    ) -> None:
        """UPDATE juego_dioses.particulas SET temperatura = $1 WHERE id = $2."""
        async with get_connection() as conn:
            await conn.execute(
                "UPDATE juego_dioses.particulas SET temperatura = $1 WHERE id = $2",
                temperatura,
                particula_id,
            )

    async def get_particles_near(
        self,
        bloque_id: str,
        celda_x: float,
        celda_y: float,
        celda_z: float,
        radio: int = 1,
    ) -> List[dict]:
        """Partículas en radio euclidiano de (celda_x, celda_y, celda_z); dicts con tipo_nombre, temperatura, celda_*, etc."""
        async with get_connection() as conn:
            rows = await conn.fetch(
                """
                SELECT p.*, tp.nombre as tipo_nombre, tp.tipo_fisico
                FROM juego_dioses.particulas p
                JOIN juego_dioses.tipos_particulas tp ON p.tipo_particula_id = tp.id
                WHERE p.bloque_id = $1
                AND ABS(p.celda_x - $2) <= $5 AND ABS(p.celda_y - $3) <= $5 AND ABS(p.celda_z - $4) <= $5
                AND (POWER(p.celda_x - $2, 2) + POWER(p.celda_y - $3, 2) + POWER(p.celda_z - $4, 2)) <= POWER($5, 2)
                ORDER BY POWER(p.celda_x - $2, 2) + POWER(p.celda_y - $3, 2) + POWER(p.celda_z - $4, 2)
                """,
                bloque_id,
                celda_x,
                celda_y,
                celda_z,
                radio,
            )
            return [dict(row) for row in rows]

    async def get_particle_type_by_name(self, nombre: str) -> Optional[dict]:
        """SELECT * FROM juego_dioses.tipos_particulas WHERE nombre = $1; devuelve fila como dict o None."""
        async with get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM juego_dioses.tipos_particulas WHERE nombre = $1",
                nombre,
            )
            return dict(row) if row else None
