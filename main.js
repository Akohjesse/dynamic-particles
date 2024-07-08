import "./style.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import Stats from "stats.js";
import * as dat from "dat.gui";
import { gsap } from "gsap";

const params = {
    circleRadius: 0,
    circleSpeed: 0,
    maxDisplacement: 0,
};

let scene, camera, renderer, controls, stats;
let gltfloader = new GLTFLoader();
const clock = new THREE.Clock();
let pointsObjects = [];

window.onload = () => {
    init();
    measure();
    loadModels();
    setupStats();
    setupGUI();
    setupButton();
    render();
};

function setupButton() {
    const button = document.getElementById("resetButton");
    button.addEventListener("click", () => {
        resetAnimation();
    });
}

function resetAnimation() {
    gsap.to(params, {
        circleRadius: 0,
        circleSpeed: 0,
        maxDisplacement: 0,
        duration: 2,
        ease: "power2.inOut",
        onComplete: () => {
            pointsObjects.forEach(({ points, originalPositions }) => {
                gsap.to(points.position, {
                    x: 0,
                    duration: 0.5,
                });
                gsap.to(points.rotation, {
                    y: 1.5,
                    duration: 1,
                });
            });
        },
    });
}

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, -2, 5);

    scene = new THREE.Scene();
    scene.add(camera);
    scene.position.y = -1;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor("black");
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.6;
    document.body.appendChild(renderer.domElement);
    setLighting();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    controls.movementSpeed = 1;
    controls.lookSpeed = 0.09;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
}

function setLighting() {
    const ambientLight = new THREE.AmbientLight("white", 3);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight("lightblue", 3);
    directionalLight.position.y = 3;
    directionalLight.position.x = -3;
    scene.add(directionalLight);
}

function measure() {
    const GridHelper = new THREE.GridHelper(100, 100, new THREE.Color("lime"), new THREE.Color("orange"));
    scene.add(GridHelper);
}

function loadModels() {
    gltfloader.load("./3.glb", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        model.traverse(function (child) {
            if (child.isPoints) {
                const vertices = child.geometry.attributes.position.array;
                const points1 = new THREE.Points(child.geometry, new THREE.PointsMaterial({ color: "red", size: 0.001 }));

                const originalPositions = [];
                for (let i = 0; i < vertices.length; i += 3) {
                    originalPositions.push(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
                }

                scene.add(points1);
                pointsObjects.push({ points: points1, originalPositions });

                scene.add(points1);
                points1.position.x = 1;
                points1.rotation.y = -1;
                const points2 = new THREE.Points(child.geometry, new THREE.PointsMaterial({ color: "lime", size: 0.001 }));
                scene.add(points2);
                pointsObjects.push({ points: points2, originalPositions });
                points2.rotation.y = 2;
                points2.position.x = -1;
                child.userData.vertices = vertices;
                child.userData.points = points1;
                child.userData.points = points2;
            } else if (child.isObject3D) {
                const randomColor = new THREE.Color("pink");
                if (child.material) {
                    child.material.color = randomColor;
                } else if (child.children.length > 0) {
                    child.children.forEach((subChild) => {
                        if (subChild.material) {
                            subChild.material.color = randomColor;
                        }
                    });
                }
            }
        });
    });
}

const minSize = 0.0;
const maxSize = 0.5;
const speed = 4;
let previousSign = 1;
let colorChangeCounter = 0;
const colorChangeInterval = 10;

function animatePointSize(elapsedTime) {
    const size = minSize + (maxSize - minSize) * (0.5 * (1 + Math.sin(elapsedTime * speed)));
    const currentSign = Math.sin(elapsedTime * speed);

    scene.traverse(function (child) {
        if (child.isPoints) {
            child.material.size = size;

            colorChangeCounter++;
            if (Math.sign(currentSign) !== Math.sign(previousSign) && colorChangeCounter >= colorChangeInterval) {
                const randomColor = new THREE.Color(Math.random(), Math.random() * Math.random(), Math.random());
                child.material.color = randomColor;
                colorChangeCounter = 0;
            }
        }
    });

    previousSign = currentSign;
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

    animatePointSize(elapsedTime);
    animateCircularBrownianMotion(elapsedTime);

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
    gui.add(params, "maxDisplacement", 0, 5).name("Displacement");
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
