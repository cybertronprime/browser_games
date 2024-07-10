import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { SkeletonUtils } from 'three/addons/utils/SkeletonUtils.js';

const Game = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    clock: new THREE.Clock(),
    mixers: [],
    player: null,
    npcs: [],
    houses: [],

    init() {
        this.initScene();
        this.initLighting();
        this.loadEnvironment();
        this.loadPlayer();
        this.loadNPCs();
        this.loadHouses();
        this.setupEventListeners();
        this.animate();
    },

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    },

    initLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    },

    loadEnvironment() {
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a8f3c });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add trees, rocks, etc.
        this.addTrees();
        this.addRocks();
    },

    addTrees() {
        const treeGeometry = new THREE.ConeGeometry(1, 4, 6);
        const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4c1e });

        for (let i = 0; i < 100; i++) {
            const tree = new THREE.Mesh(treeGeometry, treeMaterial);
            tree.position.set(
                Math.random() * 200 - 100,
                2,
                Math.random() * 200 - 100
            );
            tree.castShadow = true;
            tree.receiveShadow = true;
            this.scene.add(tree);
        }
    },

    addRocks() {
        const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

        for (let i = 0; i < 50; i++) {
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(
                Math.random() * 200 - 100,
                0.5,
                Math.random() * 200 - 100
            );
            rock.scale.set(
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.5 + 0.5,
                Math.random() * 0.5 + 0.5
            );
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        }
    },

    loadPlayer() {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('path/to/draco/');
        loader.setDRACOLoader(dracoLoader);

        loader.load('models/player.glb', (gltf) => {
            this.player = gltf.scene;
            this.player.position.set(0, 0, 0);
            this.player.scale.set(1, 1, 1);
            this.scene.add(this.player);

            const mixer = new THREE.AnimationMixer(this.player);
            this.mixers.push(mixer);

            const idleAction = mixer.clipAction(gltf.animations[0]);
            idleAction.play();

            // Setup player controls here
        });
    },

    loadNPCs() {
        const loader = new GLTFLoader();
        loader.load('models/npc.glb', (gltf) => {
            for (let i = 0; i < 10; i++) {
                const npc = SkeletonUtils.clone(gltf.scene);
                npc.position.set(
                    Math.random() * 100 - 50,
                    0,
                    Math.random() * 100 - 50
                );
                this.scene.add(npc);

                const mixer = new THREE.AnimationMixer(npc);
                this.mixers.push(mixer);

                const walkAction = mixer.clipAction(gltf.animations[0]);
                walkAction.play();

                this.npcs.push(npc);
            }
        });
    },

    loadHouses() {
        const loader = new GLTFLoader();
        loader.load('models/house.glb', (gltf) => {
            for (let i = 0; i < 5; i++) {
                const house = gltf.scene.clone();
                house.position.set(
                    Math.random() * 150 - 75,
                    0,
                    Math.random() * 150 - 75
                );
                house.rotation.y = Math.random() * Math.PI * 2;
                this.scene.add(house);
                this.houses.push(house);
            }
        });
    },

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        // Add more event listeners for player controls, interactions, etc.
    },

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        // Update animations
        this.mixers.forEach(mixer => mixer.update(delta));

        // Update NPC movements
        this.npcs.forEach(npc => {
            // Add simple AI or movement patterns here
        });

        // Update player controls and camera

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
};

Game.init();
