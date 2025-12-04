/**
 * Configuración de la escena Three.js
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Scene3D {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.particleMeshes = new Map(); // Para almacenar los meshes de partículas
        
        this.init();
    }

    init() {
        // Crear cámara
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);

        // Crear renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x87CEEB); // Color cielo
        this.container.appendChild(this.renderer.domElement);

        // Controles de cámara
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);

        // Grid helper (opcional, para referencia)
        const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
        this.scene.add(gridHelper);

        // Ejes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Manejar resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Renderizar partículas
     */
    renderParticles(particles, cellSize = 0.25) {
        // Limpiar partículas anteriores
        this.clearParticles();

        // Mapa de colores por tipo de partícula
        const colorMap = {
            'hierba': 0x90EE90,      // lightgreen
            'madera': 0x8B4513,      // brown
            'hojas': 0x228B22,       // forestgreen
            'tierra': 0x8B7355,      // tan
            'piedra': 0x808080,      // gray
            'agua': 0x4169E1,        // royalblue
            'aire': 0xFFFFFF         // white (transparent)
        };

        particles.forEach(particle => {
            const color = colorMap[particle.tipo] || 0xFFFFFF;
            
            // Crear geometría de cubo
            const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
            const material = new THREE.MeshStandardMaterial({ 
                color: color,
                metalness: 0.1,
                roughness: 0.8
            });
            
            const cube = new THREE.Mesh(geometry, material);
            
            // Posicionar cubo (ajustar para centrar en celda)
            cube.position.set(
                particle.celda_x * cellSize + cellSize / 2,
                particle.celda_z * cellSize + cellSize / 2, // Z es altura
                particle.celda_y * cellSize + cellSize / 2
            );
            
            // Guardar referencia
            const key = `${particle.celda_x}_${particle.celda_y}_${particle.celda_z}`;
            this.particleMeshes.set(key, cube);
            
            // Agregar a la escena
            this.scene.add(cube);
        });
    }

    /**
     * Limpiar todas las partículas
     */
    clearParticles() {
        this.particleMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.particleMeshes.clear();
    }

    /**
     * Animar escena
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Centrar cámara en el mundo
     */
    centerCamera(centerX, centerY, centerZ) {
        this.camera.position.set(centerX + 10, centerZ + 10, centerY + 10);
        this.controls.target.set(centerX, centerZ, centerY);
        this.controls.update();
    }
}

