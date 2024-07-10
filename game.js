const Game = {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    npcs: [],
    birds: [],
    clouds: [],
    water: null,
    sun: null,
    controls: null,
    clock: null,
    simplex: null,
    dayTime: 0,
    score: 0,
    level: 1,

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.simplex = new SimplexNoise();

        this.createEnvironment();
        this.createPlayer();
        this.createNPCs();
        this.createBirds();
        this.createClouds();
        this.setupLighting();
        this.setupControls();

        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.getElementById('startButton').addEventListener('click', () => this.startGame());

        this.animate();
    },

    createEnvironment() {
        // Skybox
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyboxMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
        const groundTexture = new THREE.TextureLoader().load('https://threejsfundamentals.org/threejs/resources/images/grass.jpg');
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            map: groundTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;

        // Apply noise to the ground
        const vertices = ground.geometry.attributes.position.array;
        for (let i = 0; i <= vertices.length; i += 3) {
            vertices[i+2] = this.simplex.noise2D(vertices[i]/100, vertices[i+1]/100) * 10;
        }
        ground.geometry.attributes.position.needsUpdate = true;
        ground.geometry.computeVertexNormals();

        this.scene.add(ground);

        // Water
        const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x0077be,
            transparent: true,
            opacity: 0.6
        });
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -5;
        this.scene.add(this.water);

        // Trees
        const treeGeometry = new THREE.CylinderGeometry(0, 1.5, 5, 8);
        const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4c1e });
        const leafGeometry = new THREE.SphereGeometry(2, 8, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x33aa33 });
        
        for (let i = 0; i < 200; i++) {
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(treeGeometry, treeMaterial);
            const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
            leaves.position.y = 3;
            tree.add(trunk);
            tree.add(leaves);
            tree.position.set(
                Math.random() * 500 - 250,
                0,
                Math.random() * 500 - 250
            );
            tree.scale.setScalar(Math.random() * 0.5 + 0.5);
            tree.castShadow = true;
            tree.receiveShadow = true;
            this.scene.add(tree);
        }

        // Rocks
        const rockGeometry = new THREE.DodecahedronGeometry(1);
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        for (let i = 0; i < 100; i++) {
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(
                Math.random() * 500 - 250,
                0,
                Math.random() * 500 - 250
            );
            rock.scale.setScalar(Math.random() * 0.5 + 0.5);
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
        }

        // Flowers
        const flowerGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
        const flowerColors = [0xff0000, 0xffff00, 0xff00ff, 0xffffff];
        for (let i = 0; i < 1000; i++) {
            const flowerMaterial = new THREE.MeshStandardMaterial({ color: flowerColors[Math.floor(Math.random() * flowerColors.length)] });
            const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
            flower.position.set(
                Math.random() * 500 - 250,
                0,
                Math.random() * 500 - 250
            );
            flower.scale.setScalar(Math.random() * 0.5 + 0.5);
            this.scene.add(flower);
        }
    },

    createPlayer() {
        const loader = new THREE.GLTFLoader();
        loader.load('https://threejs.org/examples/models/gltf/Soldier.glb', (gltf) => {
            this.player = gltf.scene;
            this.player.scale.setScalar(0.1);
            this.player.position.set(0, 0, 0);
            this.player.castShadow = true;
            this.player.receiveShadow = true;
            this.scene.add(this.player);

            this.mixer = new THREE.AnimationMixer(this.player);
            this.animations = gltf.animations;
            this.idleAction = this.mixer.clipAction(this.animations[0]);
            this.walkAction = this.mixer.clipAction(this.animations[3]);
            this.idleAction.play();

            this.camera.position.set(0, 2, 5);
            this.camera.lookAt(this.player.position);
        });
    },

    createNPCs() {
        const loader = new THREE.GLTFLoader();
        loader.load('https://threejs.org/examples/models/gltf/Soldier.glb', (gltf) => {
            for (let i = 0; i < 20; i++) {
                const npc = gltf.scene.clone();
                npc.scale.setScalar(0.1);
                npc.position.set(
                    Math.random() * 100 - 50,
                    0,
                    Math.random() * 100 - 50
                );
                npc.castShadow = true;
                npc.receiveShadow = true;
                this.scene.add(npc);
                this.npcs.push(npc);
            }
        });
    },

    createBirds() {
        const birdGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
        const birdMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        for (let i = 0; i < 50; i++) {
            const bird = new THREE.Mesh(birdGeometry, birdMaterial);
            bird.position.set(
                Math.random() * 500 - 250,
                Math.random() * 50 + 50,
                Math.random() * 500 - 250
            );
            bird.rotation.x = Math.PI / 2;
            this.scene.add(bird);
            this.birds.push(bird);
        }
    },

    createClouds() {
        const cloudGeometry = new THREE.SphereGeometry(5, 8, 8);
        const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        for (let i = 0; i < 20; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                Math.random() * 500 - 250,
                Math.random() * 30 + 70,
                Math.random() * 500 - 250
            );
            cloud.scale.setScalar(Math.random() * 0.5 + 0.5);
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    },

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        this.sun = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sun.position.set(100, 100, 0);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 1;
        this.sun.shadow.camera.far = 500;
        this.scene.add(this.sun);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);
    },

    setupControls() {
        this.controls = {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            jump: false
        };

        document.addEventListener('keydown', (event) => this.onKeyDown(event), false);
        document.addEventListener('keyup', (event) => this.onKeyUp(event), false);
    },

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.controls.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.controls.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.controls.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.controls.moveRight = true;
                break;
            case 'Space':
                this.controls.jump = true;
                break;
        }
    },

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.controls.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.controls.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.controls.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.controls.moveRight = false;
                break;
            case 'Space':
                this.controls.jump = false;
                break;
        }
    },

    movePlayer() {
        if (!this.player) return;

        const speed = 0.15;
        let moving = false;

        if (this.controls.moveForward) {
            this.player.position.z -= speed;
            moving = true;
        }
        if (this.controls.moveBackward) {
            this.player.position.z += speed;
            moving = true;
        }
        if (this.controls.moveLeft) {
            this.player.position.x -= speed;
            moving = true;
        }
        if (this.controls.moveRight) {
            this.player.position.x += speed;
            moving = true;
        }

        if (moving) {
            this.walkAction.play();
            this.idleAction.stop();
        } else {
            this.idleAction.play();
            this.walkAction.stop();
        }
        
        // Update camera position
        this.camera.position.x = this.player.position.x;
        this.camera.position.z = this.player.position.z + 5;
        this.camera.lookAt(this.player.position);
    },

    moveNPCs() {
        this.npcs.forEach(npc => {
            npc.position.x += (Math.random() - 0.5) * 0.1;
            npc.position.z += (Math.random() - 0.5) * 0.1;
            npc.rotation.y += 0.02;
        });
    },

    moveBirds() {
        this.birds.forEach(bird => {
            bird.position.x += Math.sin(Date.now() * 0.001) * 0.1;
            bird.position.z += Math.cos(Date.now() * 0.001) * 0.1;
        });
    },

    moveClouds() {
        this.clouds.forEach(cloud => {
            cloud.position.x += 0.05;
            if (cloud.position.x > 250) cloud.position.x = -250;
        });
    },

    updateDayNightCycle() {
        this.dayTime += 0.001;
        if (this.dayTime > Math.PI *if (this.dayTime > Math.PI * 2) this.dayTime = 0;

        const sunPosition = Math.sin(this.dayTime);
        this.sun.position.y = sunPosition * 100 + 50;
        this.sun.intensity = sunPosition * 0.8 + 0.2;
        this.scene.background.setHSL((sunPosition + 1) / 2, 0.5, 0.5);
    },

    updateWaterMaterial() {
        this.water.material.uniforms.time.value += 0.01;
    },

    updateScore() {
        this.score++;
        document.getElementById('score').textContent = `Score: ${this.score}`;

        if (this.score % 100 === 0) {
            this.level++;
            document.getElementById('level').textContent = `Level: ${this.level}`;
        }
    },

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    },

    startGame() {
        document.getElementById('startScreen').style.display = 'none';
        this.score = 0;
        this.level = 1;
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('level').textContent = `Level: ${this.level}`;
    },

    gameOver() {
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('finalScore').textContent = `Final Score: ${this.score}`;
        this.score = 0;
        this.level = 1;
    },

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        if (this.mixer) this.mixer.update(delta);

        this.movePlayer();
        this.moveNPCs();
        this.moveBirds();
        this.moveClouds();
        this.updateDayNightCycle();
        this.updateWaterMaterial();
        this.updateScore();

        this.renderer.render(this.scene, this.camera);
    }
};

Game.init();
