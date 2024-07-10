const Game = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    player: null,
    mixer: null,
    clock: null,
    trees: [],
    rocks: [],
    grass: [],
    interactiveObjects: [],
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    isSprinting: false,
    ammo: 30,
    maxAmmo: 30,
    health: 100,
    stamina: 100,
    playerGun: null,
    shootingSound: null,
    reloadSound: null,
    ambientSound: null,
    footstepSound: null,
    loadingManager: null,

    init() {
        this.initLoadingManager();
        this.initScene();
        this.initLighting();
        this.initSkybox();
        this.initTerrain();
        this.loadPlayerModel();
        this.createEnvironment();
        this.setupEventListeners();
        this.initSounds();
    },

    initLoadingManager() {
        this.loadingManager = new THREE.LoadingManager();
        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = (itemsLoaded / itemsTotal) * 100;
            document.getElementById('loadingProgress').style.width = `${progress}%`;
            document.getElementById('loadingText').textContent = `Loading assets: ${Math.round(progress)}%`;
        };
        this.loadingManager.onLoad = () => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('startButton').disabled = false;
            document.getElementById('startButton').textContent = 'Start Game';
        };
    },

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();

        this.controls = new THREE.PointerLockControls(this.camera, this.renderer.domElement);
    },

    initLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(100, 100, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        this.scene.add(sunLight);
    },

    initSkybox() {
        const loader = new THREE.CubeTextureLoader(this.loadingManager);
        const texture = loader.load([
            'textures/skybox/px.jpg', 'textures/skybox/nx.jpg',
            'textures/skybox/py.jpg', 'textures/skybox/ny.jpg',
            'textures/skybox/pz.jpg', 'textures/skybox/nz.jpg'
        ]);
        this.scene.background = texture;
    },

    initTerrain() {
        const geometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
        geometry.rotateX(-Math.PI / 2);
        
        const loader = new THREE.TextureLoader(this.loadingManager);
        const groundTexture = loader.load('textures/terrain/ground_diffuse.jpg');
        const groundNormal = loader.load('textures/terrain/ground_normal.jpg');
        const groundRoughness = loader.load('textures/terrain/ground_roughness.jpg');
        
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundNormal.wrapS = groundNormal.wrapT = THREE.RepeatWrapping;
        groundRoughness.wrapS = groundRoughness.wrapT = THREE.RepeatWrapping;
        
        groundTexture.repeat.set(50, 50);
        groundNormal.repeat.set(50, 50);
        groundRoughness.repeat.set(50, 50);

        const material = new THREE.MeshStandardMaterial({
            map: groundTexture,
            normalMap: groundNormal,
            roughnessMap: groundRoughness,
            roughness: 0.8,
            metalness: 0.2
        });

        const terrain = new THREE.Mesh(geometry, material);
        terrain.receiveShadow = true;
        this.scene.add(terrain);
    },

    loadPlayerModel() {
        const loader = new THREE.GLTFLoader(this.loadingManager);
        loader.load('models/player/player.glb', (gltf) => {
            this.player = gltf.scene;
            this.player.scale.set(0.1, 0.1, 0.1);
            this.player.position.set(0, 0, 0);
            this.camera.add(this.player);

            this.mixer = new THREE.AnimationMixer(this.player);
            this.animations = gltf.animations;
            this.idleAction = this.mixer.clipAction(this.animations.find(clip => clip.name === 'Idle'));
            this.walkAction = this.mixer.clipAction(this.animations.find(clip => clip.name === 'Walk'));
            this.runAction = this.mixer.clipAction(this.animations.find(clip => clip.name === 'Run'));
            this.idleAction.play();

            this.addPlayerGun();
            this.scene.add(this.camera);
        });
    },

    addPlayerGun() {
        const loader = new THREE.GLTFLoader(this.loadingManager);
        loader.load('models/weapons/rifle.glb', (gltf) => {
            this.playerGun = gltf.scene;
            this.playerGun.scale.set(0.05, 0.05, 0.05);
            this.playerGun.position.set(0.3, -0.3, -0.5);
            this.camera.add(this.playerGun);
        });
    },

    createEnvironment() {
        this.createTrees();
        this.createRocks();
        this.createGrass();
        this.createInteractiveObjects();
    },

    createTrees() {
        const loader = new THREE.GLTFLoader(this.loadingManager);
        loader.load('models/environment/tree.glb', (gltf) => {
            const treeModel = gltf.scene;
            for (let i = 0; i < 500; i++) {
                const tree = treeModel.clone();
                tree.scale.set(0.1, 0.1, 0.1);
                tree.position.set(
                    Math.random() * 1000 - 500,
                    0,
                    Math.random() * 1000 - 500
                );
                tree.rotation.y = Math.random() * Math.PI * 2;
                tree.castShadow = true;
                tree.receiveShadow = true;
                this.scene.add(tree);
                this.trees.push(tree);
            }
        });
    },

    createRocks() {
        const loader = new THREE.GLTFLoader(this.loadingManager);
        loader.load('models/environment/rock.glb', (gltf) => {
            const rockModel = gltf.scene;
            for (let i = 0; i < 200; i++) {
                const rock = rockModel.clone();
                rock.scale.set(0.05, 0.05, 0.05);
                rock.position.set(
                    Math.random() * 1000 - 500,
                    0,
                    Math.random() * 1000 - 500
                );
                rock.rotation.y = Math.random() * Math.PI * 2;
                rock.castShadow = true;
                rock.receiveShadow = true;
                this.scene.add(rock);
                this.rocks.push(rock);
            }
        });
    },

    createGrass() {
        const loader = new THREE.TextureLoader(this.loadingManager);
        const grassTexture = loader.load('textures/grass/grass_blade.png');
        const grassMaterial = new THREE.MeshStandardMaterial({
            map: grassTexture,
            alphaTest: 0.7,
            side: THREE.DoubleSide
        });

        const grassGeometry = new THREE.PlaneGeometry(1, 1);
        for (let i = 0; i < 50000; i++) {
            const grass = new THREE.Mesh(grassGeometry, grassMaterial);
            grass.position.set(
                Math.random() * 1000 - 500,
                0,
                Math.random() * 1000 - 500
            );
            grass.rotation.y = Math.random() * Math.PI;
            grass.scale.setScalar(0.3 + Math.random() * 0.2);
            this.scene.add(grass);
            this.grass.push(grass);
        }
    },

    createInteractiveObjects() {
        const geometries = [
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.SphereGeometry(0.5, 32, 32),
            new THREE.ConeGeometry(0.5, 1, 32)
        ];
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xff0000 }),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
            new THREE.MeshStandardMaterial({ color: 0x0000ff })
        ];

        for (let i = 0; i < 50; i++) {
            const geometry = geometries[Math.floor(Math.random() * geometries.length)];
            const material = materials[Math.floor(Math.random() * materials.length)];
            const object = new THREE.Mesh(geometry, material);
            object.position.set(
                Math.random() * 1000 - 500,
                0.5,
                Math.random() * 1000 - 500
            );
            object.castShadow = true;
            object.receiveShadow = true;
            this.scene.add(object);
            this.interactiveObjects.push(object);
        }
    },

    initSounds() {
        this.shootingSound = new Howl({
            src: ['sounds/gunshot.mp3'],
            volume: 0.5
        });

        this.reloadSound = new Howl({
            src: ['sounds/reload.mp3'],
            volume: 0.5
        });

        this.ambientSound = new Howl({
            src: ['sounds/forest_ambience.mp3'],
            loop: true,
            volume: 0.3
        });

        this.footstepSound = new Howl({
            src: ['sounds/footstep.mp3'],
            volume: 0.2,
            sprite: {
                step1: [0, 300],
                step2: [400, 300],
                step3: [800, 300],
                step4: [1200, 300]
            }
        });
    },

    setupEventListeners() {
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        document.addEventListener('mousedown', this.onMouseDown.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.getElementById('startButton').addEventListener('click', this.startGame.bind(this));
    },

    startGame() {
        document.getElementById('startScreen').style.display = 'none';
        this.controls.lock();
        this.ambientSound.play();
    },

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'ShiftLeft': this.isSprinting = true; break;
            case 'KeyR': this.reload(); break;
            case 'KeyE': this.interact(); break;
        }
    },

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'ShiftLeft': this.isSprinting = false; break;
        }
    },

    onMouseDown(event) {
        if (event.button === 0) { // Left mouse button
            this.shoot();
        }
    },

    onMouseUp(event) {
        if (event.button === 0) { // Left mouse button
            // Stop shooting animation if needed
        }
    },

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    shoot() {
        if (this.ammo > 0) {
            this.shootingSound.play();
            this.ammo--;
            this.updateUI();
            // Add muzzle flash effect
            this.createMuzzleFlash();
            // Add bullet trajectory visualization
            this.createBulletTrajectory();
        } else {
            // Play empty gun sound
        }
    },

    reload() {
        if (this.ammo < this.maxAmmo) {
            this.reloadSound.play();
            this.ammo = this.maxAmmo;
            this.updateUI();
        }
    },

    interact() {
        // Check for nearby interactive objects and perform actions
        const interactionDistance = 2;
        this.interactiveObjects.forEach(object => {
            if (this.camera.position.distanceTo(object.position) < interactionDistance) {
                // Perform interaction (e.g., pick up item, open door, etc.)
                console.log('Interacted with object');
            }
        });
    },

    createMuzzleFlash() {
        // Create a muzzle flash effect at the gun's position
    },

    createBulletTrajectory() {
        // Visualize bullet trajectory
    },

    updateUI() {
        document.getElementById('ammo').textContent = `Ammo: ${this.ammo} / ${this.maxAmmo}`;
        document.getElementById('healthText').textContent = this.health;
        document.getElementById('healthBar').style.width = `${this.health}%`;
        document.getElementById('staminaText').textContent = Math.round(this.stamina);
        document.getElementById('staminaBar').style.width = `${this.stamina}%`;
    },

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        if (this.controls.isLocked) {
            const speed = this.isSprinting ? 10 : 5;
            const velocity = new THREE.Vector3();

            if (this.moveForward) velocity.z -= speed * delta;
            if (this.moveBackward) velocity.z += speed * delta;
            if (this.moveLeft) velocity.x -= speed * delta;
            if (this.moveRight) velocity.x += speed * delta;

            this.controls.moveRight(velocity.x);
            this.controls.moveForward(velocity.z);

            // Update stamina
            if (this.isSprinting && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
                this.stamina = Math.max(0, this.stamina - 10 * delta);
            } else {
                this.stamina = Math.min(100, this.stamina + 5 * delta);
            }

            // Play footstep sounds
            if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
                if (!this.footstepTimeout) {
                    this.playFootstep();
                    this.footstepTimeout = setTimeout(() => {
                        this.footstepTimeout = null;
                    }, this.isSprinting ? 300 : 500);
                }
            }

            // Update animations
            if (this.mixer) {
                this.mixer.update(delta);
                if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
                    if (this.isSprinting) {
                        this.runAction.play();
                        this.walkAction.stop();
                        this.idleAction.stop();
                    } else {
                        this.walkAction.play();
                        this.runAction.stop();
                        this.idleAction.stop();
                    }
                } else {
                    this.idleAction.play();
                    this.walkAction.stop();
                    this.runAction.stop();
                }
            }

            // Update compass
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.camera.quaternion);
            const angle = Math.atan2(direction.x, direction.z);
            const compassDirection = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(angle / (Math.PI / 4) + 4) % 8];
            document.getElementById('compass').textContent = compassDirection;
        }

        // Update environment
        this.updateEnvironment(delta);

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    },

    playFootstep() {
        const footstepSounds = ['step1', 'step2', 'step3', 'step4'];
        const randomSound = footstepSounds[Math.floor(Math.random() * footstepSounds.length)];
        this.footstepSound.play(randomSound);
    },

    updateEnvironment(delta) {
        // Animate grass
        this.grass.forEach(grass => {
            grass.rotation.y += Math.sin(this.clock.elapsedTime + grass.position.x) * 0.01;
        });

        // Animate trees (subtle wind effect)
        this.trees.forEach(tree => {
            tree.rotation.z = Math.sin(this.clock.elapsedTime * 0.5 + tree.position.x) * 0.01;
        });

        // Update interactive objects
        this.interactiveObjects.forEach(object => {
            object.rotation.y += 0.01;
        });
    }
};

Game.init();
Game.animate();
