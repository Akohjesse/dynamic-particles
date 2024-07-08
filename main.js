import './style.css'

import * as THREE from "three"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

let scene, camera, renderer, controls, mixer, mixer2;
let gltfloader = new GLTFLoader();
const clock = new THREE.Clock();


window.onload = () => {
    init();
    measure();
    // setEnvironment();
    // loadHDRI();
    // loadModels();
    render();
  }
  
  function init() { 
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 2, 5); 
    camera.lookAt(0, 2, 5);
    
  
    scene = new THREE.Scene();
    scene.add(camera);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor("white");
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .6;
    document.body.appendChild( renderer.domElement );
    setLighting();
  
    // controls = new FirstPersonControls(camera, renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.update()
    controls.movementSpeed = 1; 
    controls.lookSpeed = 0.09;
  
    controls.autoRotate = true;
    controls.autoRotateSpeed= 1.5
  }

  function setLighting() {
    const ambientLight = new THREE.AmbientLight('white', 3);
    scene.add(ambientLight)
     const directionalLight = new THREE.DirectionalLight('lightblue', 3);
     directionalLight.position.y = 3;
     directionalLight.position.x = -3;
    scene.add(directionalLight);
  }
  
   function measure() {
    const GridHelper = new THREE.GridHelper(100,100);
     scene.add(GridHelper);
     
     const axes = new THREE.AxesHelper();
     scene.add(axes)
  
   }
  
   function render() {
    const delta = clock.getDelta();
    controls.update(delta);
    // if (mixer && mixer2) {
    //   mixer2.update(delta)
    //   mixer.update(delta)
    // }
    renderer.render(scene, camera);
    requestAnimationFrame(render)
  }

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
})
  
