import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import Stats from "stats.js";
import * as dat from "dat.gui";
import { gsap } from "gsap";


let scene, camera, renderer, controls, stats;
let gltfloader = new GLTFLoader();
const dLoader = new DRACOLoader();
dLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
dLoader.setDecoderConfig({ type: "js" });
gltfloader.setDRACOLoader(dLoader);

const clock = new THREE.Clock();
let pointsObjects = [];
let mixers = [];

const models = [
    { name: "Man", path: "./3.glb" },
    { name: "Man2 same man", path: "./3.glb" },
    // { name: "Building", path: "./6.glb" },
    // { name: "Scene 2", path: "./7.glb" },
    // { name: "Scene 3", path: "./4.glb" },

];
let currentModelIndex = 0;
  
const params = {
    circleRadius: 0,
    circleSpeed: 0,
    maxDisplacement: 0,
};

window.onload = () => {
    init();
    measure();
    loadModel(models[currentModelIndex].path);
    setupStats();
    setupGUI();
    render();
};


function resetAnimation() {
    gsap.to(params, {
        circleRadius: 0,
        circleSpeed: 0,
        maxDisplacement: 0,
        duration: 2.5,
        ease:"circ.out"
    })

    gsap.to(camera.position, {
        y: 2,
        z: 7,
        x: 0,
        ease:"circ.inOut",
        duration: 2,
        delay:.5
    })
}

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 2, 5);

    scene = new THREE.Scene();
    scene.add(camera);
    scene.position.y = -1;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor("black");
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;
    document.body.appendChild(renderer.domElement);
    setLighting();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    controls.movementSpeed = 1;
    controls.lookSpeed = 0.09;

    controls.autoRotate = true;
    controls.autoRotateSpeed = -1;
}

function setLighting() {
    const ambientLight = new THREE.AmbientLight("white", 5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight("lightblue", 1);
    directionalLight.position.y = 3;
    directionalLight.position.x = -3;
    scene.add(directionalLight);
}

function measure() {
    const GridHelper = new THREE.GridHelper(30, 30, new THREE.Color("red"), new THREE.Color("black"));
    // scene.add(GridHelper);
}

function bringToBase(model, offset) {
    const box = new THREE.Box3().setFromObject(model);
    const heightOffset = box.min.y;
    model.position.y -= heightOffset - offset;
  }


function loadModel(path) {
    gltfloader.load(path, (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.traverse(function (child) {
            if (child.isMesh | child.isPoints) {
                const vertices = child.geometry.attributes.position.array;
                const points = new THREE.Points(child.geometry, new THREE.PointsMaterial({size: 0.01 , color:"lime"}));

                const originalPositions = [];
                for (let i = 0; i < vertices.length; i += 3) {
                    originalPositions.push(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
                }
                pointsObjects.push({ model: model, points: points, originalPositions });
                child.userData.vertices = vertices;
                child.userData.points = points
            } 
        });

        if (gltf.animations[0]) {
            let mixer = new THREE.AnimationMixer(model);
            mixers.push(mixer);
            let action = mixer.clipAction(gltf.animations[0]);
            action.play();
        }
    });
}


function animateCircularBrownianMotion(elapsedTime) {
    pointsObjects.forEach(({ points, originalPositions }) => {
        const positions = points.geometry.attributes.position;
        const totalPoints = positions.count;

        for (let i = 0; i < totalPoints; i++) {
            const dx = (Math.random() - 0.5) * params.maxDisplacement;
            const dy = (Math.random() - 0.5) * params.maxDisplacement;
            const dz = (Math.random() - 0.5) * params.maxDisplacement;

            const angle = (i / totalPoints) * Math.PI * 2 + elapsedTime * params.circleSpeed;
            const x = Math.cos(angle) * params.circleRadius + dx;
            const z = Math.sin(angle) * params.circleRadius + dz;

            const originalPos = originalPositions[i];
            const newX = originalPos.x + x;
            const newY = originalPos.y + dy;
            const newZ = originalPos.z + z;

            positions.setXYZ(i, newX, newY, newZ);
        }

        positions.needsUpdate = true;
    });
}

function render() {
    const delta = clock.getDelta();
    controls.update(delta);
    stats.begin();

    const elapsedTime = clock.getElapsedTime();
    animateCircularBrownianMotion(elapsedTime);

    for (let i = 0; i < mixers.length; i++) {
        if (mixers[i]) {
            mixers[i].update(delta);
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);

    stats.end();
}

function setupStats() {
    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
}

function setupGUI() {
    const gui = new dat.GUI();
    gui.add(params, "circleRadius", 0, 20).name("Circle Radius");
    gui.add(params, "circleSpeed", 0, 10).name("Circle Speed");
    gui.add(params, "maxDisplacement", 0, 3.5).name("Displacement");
     const modelNames = models.map(model => model.name);
    gui.add({ selectedModel: modelNames[0] }, 'selectedModel', modelNames)
        .name("Select Model")
        .onChange((value) => {
            const index = modelNames.indexOf(value)
            switchModels(index)
        });
    gui.add({reset: resetAnimation}, 'reset').name("Merge")
}

function switchModels(index) {
    if (pointsObjects.length > 0) {
        animateParticlesOut(() => {
            pointsObjects.forEach(({ model, points }) => {
                scene.remove(model);
                points.geometry.dispose();
                points.material.dispose();
            });
            loadModel(models[index].path);
            resetAnimation()
            pointsObjects = [];
     
        });
    } else {
        loadModel(models[index].path);
        resetAnimation()
    }
}

function animateParticlesOut(onComplete) {
    gsap.to(params, {
        circleRadius: 8,
        circleSpeed: 6,
        maxDisplacement: 4,
        duration: 3,
        ease:"power1.in",
        onComplete: () => {
            gsap.to(params, {
                maxDisplacement: 10,
                circleRadius: 70,
                duration: 1,
                ease:"power1.inOut",
                onComplete: onComplete
            })
        }
    })

    gsap.to(camera.position, {
        y: 20,
        z: 20,
        ease:"power2.inOut",
        duration: 3,
    })
}


window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
