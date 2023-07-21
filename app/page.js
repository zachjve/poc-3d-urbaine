'use client'

// Import des modules nécessaires
import { useEffect, useState } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

// Fonction pour calculer le centre du bâtiment
// Ceci est utile pour positionner correctement le bâtiment dans la scène
function calculateCenter(building) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // Parcourir chaque coordonnée pour trouver les valeurs min/max de x (longitude) et y (latitude)
  for (let polygon of building.geometry.coordinates) {
    for (let coord of polygon[0]) {
      minX = Math.min(minX, coord[0]);
      maxX = Math.max(maxX, coord[0]);
      minY = Math.min(minY, coord[1]);
      maxY = Math.max(maxY, coord[1]);
    }
  }

  // Le centre est calculé comme la moyenne des valeurs min/max
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

// Fonction pour charger les données du bâtiment à partir d'un fichier GeoJSON
async function loadBuildingData() {
  const response = await fetch('http://localhost:3000/assets/data.geojson');
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  return data.features;
}

export default function ThreeContainer() {
  const [buildingData, setBuildingData] = useState([]);

  // Lors de l'initialisation du composant, chargez les données du bâtiment et mettez à jour le state
  useEffect(() => {
    loadBuildingData().then(data => setBuildingData(data));
  }, []);

  useEffect(() => {
    // Assurez-vous que les données du bâtiment sont chargées avant de continuer
    if (buildingData.length > 0) {

      // Configuration initiale de la scène 3D, de la caméra et du rendu
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      // Calculer le centre du premier bâtiment pour positionner correctement la caméra
      const { centerX, centerY } = calculateCenter(buildingData[0]);

      // Boucle sur chaque bâtiment pour créer une forme 2D du cadastre
      buildingData.forEach((building) => {
        const buildingCenter = calculateCenter(building);
        const points = building.geometry.coordinates[0][0].map(coord => {
          const x = coord[0] - buildingCenter.centerX;
          const y = coord[1] - buildingCenter.centerY;
          return new THREE.Vector2(x, y);
        });
        
        // Créer une forme à partir des points
        const shape = new THREE.Shape(points);

        // Extruder la forme pour créer un objet 3D
        const extrudeSettings = { depth: building.properties.hauteur, bevelEnabled: false };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshBasicMaterial({ color: '#433F81' });
        const mesh = new THREE.Mesh(geometry, material);

        // Créer une géométrie des arêtes pour visualiser les arêtes du bâtiment en ligne blanche
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#ffffff' }));

        // Positionner le maillage et les lignes en fonction du centre du bâtiment
        mesh.position.x = buildingCenter.centerX - centerX;
        mesh.position.y = buildingCenter.centerY - centerY;
        line.position.x = buildingCenter.centerX - centerX;
        line.position.y = buildingCenter.centerY - centerY;

        // Ajouter le maillage et les lignes à la scène
        scene.add(mesh);
        scene.add(line);
      });

      // Positionnement de la caméra et ajout des contrôles pour permettre l'interaction avec la scène
      camera.position.z = 100;
      const controls = new OrbitControls(camera, renderer.domElement);

      // Boucle d'animation pour mettre à jour et rendre la scène
      function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }

      animate();
    }
  }, [buildingData]);

  return <div id="three-container"></div>;
}





