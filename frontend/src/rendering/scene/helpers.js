/**
 * Helpers visuales (grid, axes) con gestión dinámica
 */
import * as THREE from 'three';
import { COLOR_GRID_PRIMARY, COLOR_GRID_SECONDARY } from '../../config/constants.js';

export class Helpers {
    constructor() {
        this.gridHelper = null;
        this.axesHelper = null;
    }

    update(scene, anchoMetros, altoMetros) {
        if (this.gridHelper) { scene.remove(this.gridHelper); this.gridHelper = null; }
        if (this.axesHelper) { scene.remove(this.axesHelper); this.axesHelper = null; }
        const gridSize = Math.max(anchoMetros, altoMetros) * 1.2;
        const gridDivisions = Math.max(20, Math.floor(gridSize / 2));
        this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, COLOR_GRID_PRIMARY, COLOR_GRID_SECONDARY);
        this.gridHelper.position.set(anchoMetros / 2, 0, altoMetros / 2);
        scene.add(this.gridHelper);
        this.axesHelper = new THREE.AxesHelper(Math.max(anchoMetros, altoMetros) * 0.3);
        this.axesHelper.position.set(anchoMetros / 2, 0, altoMetros / 2);
        scene.add(this.axesHelper);
    }

    remove(scene) {
        if (this.gridHelper) { scene.remove(this.gridHelper); this.gridHelper = null; }
        if (this.axesHelper) { scene.remove(this.axesHelper); this.axesHelper = null; }
    }
}
