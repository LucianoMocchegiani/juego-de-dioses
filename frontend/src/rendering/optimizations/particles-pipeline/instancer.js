/**
 * Instancer helper for particles pipeline
 *
 * Creates InstancedMesh objects from groups and attaches them to the scene.
 */

import * as THREE from 'three';

/**
 * Create instanced meshes for groups.
 * @param {Array} groupsToRender - array of {group, geometryKey}
 * @param {Object} opts - helper functions/values:
 *   - MAX_INSTANCES_PER_MESH
 *   - getMaterial(estilo)
 *   - calculateParticlePosition(particle, cellSize)
 *   - particleIndex (Map) to populate
 *   - scene (THREE.Scene)
 *   - cellSize
 * @returns {Map} instancedMeshes (meshKey -> InstancedMesh)
 */
export function createInstancedMeshes(groupsToRender, opts) {
    const { MAX_INSTANCES_PER_MESH, getMaterial, calculateParticlePosition, particleIndex, scene, cellSize } = opts;
    const instancedMeshes = new Map();

    groupsToRender.forEach(({ group, geometryKey }) => {
        const count = group.particles.length;
        const material = getMaterial(group.estilo);
        const numMeshes = Math.ceil(count / MAX_INSTANCES_PER_MESH);

        for (let meshIndex = 0; meshIndex < numMeshes; meshIndex++) {
            const start = meshIndex * MAX_INSTANCES_PER_MESH;
            const end = Math.min(start + MAX_INSTANCES_PER_MESH, count);
            const particlesChunk = group.particles.slice(start, end);

            const instancedMesh = new THREE.InstancedMesh(group.geometry, material, particlesChunk.length);
            const matrix = new THREE.Matrix4();
            const meshKey = numMeshes > 1 ? `${geometryKey}_${meshIndex}` : geometryKey;

            particlesChunk.forEach((particle, chunkIndex) => {
                const pos = calculateParticlePosition(particle, cellSize);
                matrix.setPosition(pos.x, pos.y, pos.z);
                instancedMesh.setMatrixAt(chunkIndex, matrix);
                particleIndex.set(particle.id, {
                    meshKey: meshKey,
                    instanceIndex: chunkIndex
                });
            });

            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMeshes.set(meshKey, instancedMesh);
            scene.add(instancedMesh);
        }
    });

    return instancedMeshes;
}

