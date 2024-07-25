class EtherealQuest {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.npcs = [];
        this.environment = null;
        this.dayNightCycle = 0;
        this.weather = 'clear';
        this.quests = [];
        this.inventory = [];
        this.dialogState = null;
        this.clock = new THREE.Clock();
        this.mixer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.controls = null;
        this.composer = null;
        this.bloomPass = null;
        this.outlinePass = null;

        this.init();
    }

    init() {
        this.setupThreeJS();
        this.setupPostProcessing();
        this.setupEventListeners();
        this.loadAssets().then(() => {
            this.createEnvironment();
            this.createPlayer();
            this.createNPCs();
            this.createQuests();
            this.createParticleSystems();
            this.updateUI();
            this.animate();
        });
    }

    setupThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);

        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('game-canvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    setupPostProcessing() {
        this.composer = new THREE.EffectComposer(this.renderer);
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, 0.4, 0.85
        );
        this.composer.addPass(this.bloomPass);

        this.outlinePass = new THREE.OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.scene,
            this.camera
        );
        this.outlinePass.edgeStrength = 3;
        this.outlinePass.edgeGlow = 0.7;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.pulsePeriod = 2;
        this.outlinePass.visibleEdgeColor.set('#ffffff');
        this.outlinePass.hiddenEdgeColor.set('#190a05');
        this.composer.addPass(this.outlinePass);

        const effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
        effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        this.composer.addPass(effectFXAA);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.addEventListener('mousemove', (event) => this.onMouseMove(event), false);
        document.addEventListener('click', (event) => this.onMouseClick(event), false);
    }

    async loadAssets() {
        const loader = new THREE.GLTFLoader();
        const textureLoader = new THREE.TextureLoader();

        // Load player model
        this.playerModel = await loader.loadAsync('path/to/player/model.glb');
        
        // Load NPC models
        this.npcModels = await Promise.all([
            loader.loadAsync('path/to/npc1/model.glb'),
            loader.loadAsync('path/to/npc2/model.glb'),
            loader.loadAsync('path/to/npc3/model.glb')
        ]);

        // Load environment textures
        this.environmentTextures = {
            ground: await textureLoader.loadAsync('path/to/ground/texture.jpg'),
            trees: await textureLoader.loadAsync('path/to/tree/texture.jpg'),
            water: await textureLoader.loadAsync('path/to/water/texture.jpg')
        };

        // Load skybox textures
        this.skyboxTextures = await Promise.all([
            textureLoader.loadAsync('path/to/skybox/px.jpg'),
            textureLoader.loadAsync('path/to/skybox/nx.jpg'),
            textureLoader.loadAsync('path/to/skybox/py.jpg'),
            textureLoader.loadAsync('path/to/skybox/ny.jpg'),
            textureLoader.loadAsync('path/to/skybox/pz.jpg'),
            textureLoader.loadAsync('path/to/skybox/nz.jpg')
        ]);
    }

    createEnvironment() {
        // Create skybox
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyboxMaterials = this.skyboxTextures.map(texture => new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }));
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
        this.scene.add(skybox);

        // Create terrain
        const terrainGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
        const terrainMaterial = new THREE.MeshStandardMaterial({ 
            map: this.environmentTextures.ground,
            displacementMap: this.environmentTextures.ground,
            displacementScale: 10,
            roughness: 0.8,
            metalness: 0.2
        });
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.scene.add(terrain);

        // Create water
        const waterGeometry = new THREE.PlaneGeometry(200, 200);
        const water = new THREE.Water(waterGeometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: this.environmentTextures.water,
            alpha: 1.0,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: this.scene.fog !== undefined
        });
        water.rotation.x = -Math.PI / 2;
        water.position.y = -5;
        this.scene.add(water);

        // Add trees
        const treeGeometry = new THREE.CylinderGeometry(0, 1.5, 5, 8);
        const treeMaterial = new THREE.MeshStandardMaterial({ map: this.environmentTextures.trees });
        for (let i = 0; i < 100; i++) {
            const tree = new THREE.Mesh(treeGeometry, treeMaterial);
            tree.position.set(
                Math.random() * 180 - 90,
                0,
                Math.random() * 180 - 90
            );
            tree.scale.setScalar(Math.random() * 0.5 + 0.5);
            tree.castShadow = true;
            tree.receiveShadow = true;
            this.scene.add(tree);
        }

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 500;
        this.scene.add(directionalLight);

        const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        this.scene.add(hemisphereLight);
    }

    createPlayer() {
        this.player = this.playerModel.scene;
        this.player.scale.setScalar(0.05);
        this.player.position.set(0, 0, 0);
        this.player.castShadow = true;
        this.player.receiveShadow = true;
        this.scene.add(this.player);

        this.mixer = new THREE.AnimationMixer(this.player);
        const idle = this.mixer.clipAction(this.playerModel.animations[0]);
        idle.play();

        this.camera.lookAt(this.player.position);
    }

    createNPCs() {
        const npcPositions = [
            { x: 5, z: 5 },
            { x: -5, z: -5 },
            { x: -5, z: 5 },
            { x: 5, z: -5 }
        ];

        npcPositions.forEach((pos, index) => {
            const npc = this.npcModels[index % this.npcModels.length].scene.clone();
            npc.scale.setScalar(0.05);
            npc.position.set(pos.x, 0, pos.z);
            npc.castShadow = true;
            npc.receiveShadow = true;
            this.scene.add(npc);
            this.npcs.push(npc);
        });
    }

    createQuests() {
        this.quests = [
            { id: 1, title: "The Lost Artifact", description: "Find the ancient artifact hidden in the enchanted forest.", completed: false, reward: "Mystic Amulet" },
            { id: 2, title: "Village in Peril", description: "Save the village from the approaching horde of shadow creatures.", completed: false, reward: "Hero's Sword" },
            { id: 3, title: "The Alchemist's Request", description: "Gather rare ethereal herbs to create a powerful elixir.", completed: false, reward: "Potion of Immortality" }
        ];
    }

    createParticleSystems() {
        // Create fireflies
        const firefliesGeometry = new THREE.BufferGeometry();
        const firefliesCount = 1000;
        const posArray = new Float32Array(firefliesCount * 3);

        for (let i = 0; i < firefliesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 100;
        }

        firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        const firefliesMaterial = new THREE.PointsMaterial({
            size: 0.1,
            color: 0xffff00,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const fireflies = new THREE.Points(firefliesGeometry, firefliesMaterial);
        this.scene.add(fireflies);
    }

    updateUI() {
        // Update player stats
        document.getElementById('health-fill').style.width = '80%';
        document.getElementById('mana-fill').style.width = '60%';
        document.getElementById('exp-fill').style.width = '40%';

        // Update quest log
        const questList = document.getElementById('quest-list');
        questList.innerHTML = '';
        this.quests.forEach(quest => {
            const li = document.createElement('li');
            li.textContent = quest.title;
            if (quest.completed) {
                li.style.textDecoration = 'line-through';
            }
            questList.appendChild(li);
        });

        // Update inventory
        const inventorySlots = document.getElementById('inventory-slots');
        inventorySlots.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            inventorySlots.appendChild(slot);
        }

        // Update day/night cycle
        const dayNightIndicator = document.getElementById('day-night-cycle');
        dayNightIndicator.style.background = `linear-gradient(to bottom, 
            ${this.getLightColor()}, 
            ${this.getSkyColor()})`;
    }

    getLightColor() {
        const time = this.dayNightCycle % 24;
        if (time < 6 || time >= 18) {
            return '#001a33'; // Night
        } else if (time < 7 || time >= 17) {
            return '#ff6600'; // Sunrise/Sunset
        } else {
            return '#ffffff'; // Day
        }
    }

    getSkyColor() {
        const time = this.dayNightCycle % 24;
        if (time < 6 || time >= 18) {
            return '#000033'; // Night
        } else if (time < 7 || time >= 17) {
            return '#ff9933'; // Sunrise/Sunset
        } else {
            return '#87ceeb'; // Day
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }

    onMouseClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            if (this.npcs.includes(clickedObject)) {
                this.startDialog(clickedObject);
            } else if (clickedObject.userData.interactable) {
                this.interactWithObject(clickedObject);
            }
        }
    }

    startDialog(npc) {
        const dialogBox = document.getElementById('dialog-box');
        const dialogText = document.getElementById('dialog-text');
        const dialogOptions = document.getElementById('dialog-options');

        dialogBox.classList.remove('hidden');
        dialogText.textContent = "Greetings, traveler! How may I assist you on your journey?";

        dialogOptions.innerHTML = `
            <button class="dialog-option" onclick="game.selectDialogOption('quest')">Tell me about any quests</button>
            <button class="dialog-option" onclick="game.selectDialogOption('trade')">I'd like to trade</button>
            <button class="dialog-option" onclick="game.selectDialogOption('goodbye')">Goodbye</button>
        `;

        this.dialogState = { npc: npc, stage: 'initial' };
    }

    selectDialogOption(option) {
        const dialogText = document.getElementById('dialog-text');
        const dialogOptions = document.getElementById('dialog-options');

        switch (option) {
            case 'quest':
                const availableQuest = this.quests.find(q => !q.completed);
                if (availableQuest) {
                    dialogText.textContent = `Ah, I have a task for you: ${availableQuest.description}`;
                    dialogOptions.innerHTML = `
                        <button class="dialog-option" onclick="game.acceptQuest(${availableQuest.id})">Accept quest</button>
                        <button class="dialog-option" onclick="game.selectDialogOption('goodbye')">Not interested</button>
                    `;
                } else {
                    dialogText.textContent = "I'm afraid I don't have any tasks for you at the moment.";
                    dialogOptions.innerHTML = `
                        <button class="dialog-option" onclick="game.selectDialogOption('goodbye')">Goodbye</button>
                    `;
                }
                break;
            case 'trade':
                dialogText.textContent = "Here's what I have to offer:";
                dialogOptions.innerHTML = `
                    <button class="dialog-option" onclick="game.trade('health_potion')">Buy Health Potion (10 gold)</button>
                    <button class="dialog-option" onclick="game.trade('mana_potion')">Buy Mana Potion (15 gold)</button>
                    <button class="dialog-option" onclick="game.selectDialogOption('goodbye')">Nevermind</button>
                `;
                break;
            case 'goodbye':
                this.endDialog();
                break;
        }
    }

    acceptQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (quest) {
            quest.active = true;
            this.updateUI();
            this.endDialog();
        }
    }

    trade(item) {
        // Implement trading logic here
        console.log(`Trading ${item}`);
        this.endDialog();
    }

    endDialog() {
        document.getElementById('dialog-box').classList.add('hidden');
        this.dialogState = null;
    }

    interactWithObject(object) {
        switch (object.userData.type) {
            case 'chest':
                this.openChest(object);
                break;
            case 'collectible':
                this.collectItem(object);
                break;
            // Add more interaction types as needed
        }
    }

    openChest(chest) {
        const loot = this.generateLoot();
        this.addToInventory(loot);
        this.scene.remove(chest);
        // Add particle effect or animation for chest opening
    }

    collectItem(item) {
        this.addToInventory(item.userData.item);
        this.scene.remove(item);
        // Add particle effect or animation for item collection
    }

    generateLoot() {
        // Implement loot generation logic
        return { name: 'Gold Coin', quantity: Math.floor(Math.random() * 10) + 1 };
    }

    addToInventory(item) {
        this.inventory.push(item);
        this.updateUI();
    }

    updateDayNightCycle() {
        this.dayNightCycle += 0.1;
        if (this.dayNightCycle >= 24) {
            this.dayNightCycle = 0;
        }

        const skyColor = this.getSkyColor();
        this.scene.background.setHex(parseInt(skyColor.replace('#', '0x')));
        this.scene.fog.color.setHex(parseInt(skyColor.replace('#', '0x')));

        const lightColor = this.getLightColor();
        this.scene.children.forEach(child => {
            if (child instanceof THREE.DirectionalLight) {
                child.color.setHex(parseInt(lightColor.replace('#', '0x')));
            }
        });

        this.updateUI();
    }

    updateWeather() {
        // Implement weather changes (e.g., rain, snow, clear)
        const weathers = ['clear', 'rain', 'snow'];
        this.weather = weathers[Math.floor(Math.random() * weathers.length)];

        switch (this.weather) {
            case 'rain':
                this.createRain();
                break;
            case 'snow':
                this.createSnow();
                break;
            case 'clear':
                this.clearWeatherEffects();
                break;
        }

        document.getElementById('weather-display').textContent = `Weather: ${this.weather}`;
    }

    createRain() {
        // Implement rain particle system
    }

    createSnow() {
        // Implement snow particle system
    }

    clearWeatherEffects() {
        // Remove existing weather particle systems
    }

    startGame() {
        document.getElementById('start-screen').classList.add('hidden');
        this.updateUI();
    }

    gameLoop() {
        const delta = this.clock.getDelta();

        // Update animations
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Update player movement
        this.updatePlayerMovement(delta);

        // Update NPCs
        this.updateNPCs(delta);

        // Update day/night cycle
        this.updateDayNightCycle();

        // Update weather (less frequently)
        if (Math.random() < 0.001) {
            this.updateWeather();
        }

        // Update quests
        this.updateQuests();

        // Update UI
        this.updateUI();

        // Render scene
        this.composer.render();
    }

    updatePlayerMovement(delta) {
        // Implement player movement based on user input
        // Update this.player position and rotation
    }

    updateNPCs(delta) {
        // Implement NPC movement and behavior
        this.npcs.forEach(npc => {
            // Update NPC position and rotation
            // Implement basic AI for NPCs
        });
    }

    updateQuests() {
        // Check for quest completion conditions
        this.quests.forEach(quest => {
            if (quest.active && !quest.completed) {
                // Check if quest conditions are met
                // If met, mark as completed and give rewards
                // quest.completed = true;
                // this.giveQuestReward(quest);
            }
        });
    }

    giveQuestReward(quest) {
        // Implement quest reward logic
        console.log(`Completed quest: ${quest.title}. Reward: ${quest.reward}`);
        this.addToInventory({ name: quest.reward, quantity: 1 });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.gameLoop();
    }
}

// Initialize the game
const game = new EtherealQuest();

// Make the game instance available globally for event handlers
window.game = game;
