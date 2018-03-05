Game = function(canvasId) {
    // Canvas et engine défini ici
    var canvas = document.getElementById(canvasId);
    var engine = new BABYLON.Engine(canvas, true);
    this.engine = engine;

    var _this = this;

    _this.actualTime = Date.now();

    this.allSpawnPoints = [
        new BABYLON.Vector3(-20, 5, 0),
        new BABYLON.Vector3(0, 5, 0),
        new BABYLON.Vector3(20, 5, 0),
        new BABYLON.Vector3(-40, 5, 0)
    ];
    // On initie la scène avec une fonction associée à l'objet Game
    this.scene = this._initScene(engine);

    var armory = new Armory(this);
    _this.armory = armory;
    
    //Création d'un joueur
    var _player = new Player(_this, canvas);

    this._PlayerData = _player;

    //Création d'une arène
    var _arena = new Arena(_this);

    // Les roquettes générées dans Player.js
    this._rockets = [];

    // Les explosions qui découlent des roquettes
    this._explosionRadius = [];

    this._lasers = [];

    // Permet au jeu de tourner
    engine.runRenderLoop(function () {
        // Récuperer le ratio par les fps
        _this.fps = Math.round(1000/engine.getDeltaTime());

        // Checker le mouvement du joueur en lui envoyant le ratio de déplacement
        _player._checkMove((_this.fps)/60);

        _this.renderWeapons();

        // On apelle nos deux fonctions de calcul pour les roquettes
        _this.renderRockets();
        _this.renderExplosionRadius();
        //Fonction de calcul pour le rendu graphique du laser
        _this.renderLaser();

        // On calcule les animations des armes
        _this.scene.render();

        // Si launchBullets est a true, on tire
        if(_player.camera.weapons.launchBullets === true){
            _player.camera.weapons.launchFire();
        }
    });

    // Ajuste la vue 3D si la fenetre est agrandie ou diminuée
    window.addEventListener("resize", function () {
        if (engine) {
            engine.resize();
        }
    },false);

};


Game.prototype = {
    // Prototype d'initialisation de la scène
    _initScene : function(engine) {
        var scene = new BABYLON.Scene(engine);
        scene.clearColor=new BABYLON.Color3(0.9,0.9,0.9);
        scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
        scene.collisionsEnabled = true;
        return scene;
    },

    renderRockets : function() {
        for (var i = 0; i < this._rockets.length; i++) {
            // Les paramètres de la roquette
            var paramsRocket = this._rockets[i].paramsRocket;
            // On crée un rayon qui part de la base de la roquette vers l'avant
            var rayRocket = new BABYLON.Ray(this._rockets[i].position,this._rockets[i].direction);

            // On regarde quel est le premier objet qu'on touche
            var meshFound = this._rockets[i].getScene().pickWithRay(rayRocket);

            // Si la distance au premier objet touché est inférieure à 10, on détruit la roquette
            if(!meshFound || meshFound.distance < 10){
                // On vérifie qu'on a bien touché quelque chose
                if(meshFound.pickedMesh && !meshFound.pickedMesh.isMain){
                    // On crée une sphere qui représentera la zone d'impact
                    var explosionRadius = BABYLON.Mesh.CreateSphere("sphere", 5.0, 20, this.scene);
                    // On positionne la sphère là où il y a eu impact
                    explosionRadius.position = meshFound.pickedPoint;
                    // On fait en sorte que les explosions ne soient pas considérées pour le Ray de la roquette
                    explosionRadius.isPickable = false;
                    // On crée un petit material orange
                    explosionRadius.material = new BABYLON.StandardMaterial("textureExplosion", this.scene);
                    explosionRadius.material.diffuseColor = new BABYLON.Color3(1,0.6,0);
                    explosionRadius.material.specularColor = new BABYLON.Color3(0,0,0);
                    explosionRadius.material.alpha = 0.8;

                    // Calcule la matrice de l'objet pour les collisions
                    explosionRadius.computeWorldMatrix(true);

                    if (this._PlayerData.isAlive && this._PlayerData.camera.playerBox && explosionRadius.intersectsMesh(this._PlayerData.camera.playerBox)) {
                        // Envoi à la fonction d'affectation des dégâts
                        if(this._rockets[i].owner){
                            var whoDamage = this._rockets[i].owner;
                        }else{
                            var whoDamage = false;
                        }
                        this._PlayerData.getDamage(paramsRocket.damage,whoDamage);
                    }
                    //On ajoute l'explosion au tableau
                    this._explosionRadius.push(explosionRadius);

                }
                this._rockets[i].dispose();
                // On enlève de l'array _rockets le mesh numéro i (défini par la boucle)
                this._rockets.splice(i,1);
            }else{
                let relativeSpeed = paramsRocket.ammos.rocketSpeed / ((this.fps)/60);
                this._rockets[i].position.addInPlace(this._rockets[i].direction.scale(relativeSpeed))
            }
        };
    },

    renderExplosionRadius : function(){
       if(this._explosionRadius.length > 0){
            for (var i = 0; i < this._explosionRadius.length; i++) {
                this._explosionRadius[i].material.alpha -= 0.02;
                if(this._explosionRadius[i].material.alpha<=0){
                    this._explosionRadius[i].dispose();
                    this._explosionRadius.splice(i, 1);
                }
            }
        }
    },

    renderLaser : function(){
        if(this._lasers.length > 0){
            for (var i = 0; i < this._lasers.length; i++) {
                this._lasers[i].edgesWidth -= 0.5;
                if(this._lasers[i].edgesWidth<=0){
                    this._lasers[i].dispose();
                    this._lasers.splice(i, 1);
                }
            }
        }
    },

    renderWeapons : function(){
        if(this._PlayerData && this._PlayerData.camera.weapons.inventory){
            // On regarde toutes les armes dans inventory
            var inventoryWeapons = this._PlayerData.camera.weapons.inventory;
            
            for (var i = 0; i < inventoryWeapons.length; i++) {
                // Si l'arme est active et n'est pas à la position haute (topPositionY)
                if(inventoryWeapons[i].isActive && inventoryWeapons[i].position.y < this._PlayerData.camera.weapons.topPositionY){
                    inventoryWeapons[i].position.y += 0.1;
                }else if(!inventoryWeapons[i].isActive && inventoryWeapons[i].position.y != this._PlayerData.camera.weapons.bottomPosition.y){
                    // Sinon, si l'arme est inactive et pas encore à la position basse
                    inventoryWeapons[i].position.y -= 0.1;
                }
            }
        }
    },

    createGhostRocket : function(dataRocket) {
        var positionRocket = dataRocket[0];
        var rotationRocket = dataRocket[1];
        var directionRocket = dataRocket[2];
        var idPlayer = dataRocket[3];

        newRocket = BABYLON.Mesh.CreateBox('rocket', 0.5, this.scene);
        
        newRocket.scaling = new BABYLON.Vector3(1,0.7,2);

        newRocket.direction = new BABYLON.Vector3(directionRocket.x,directionRocket.y,directionRocket.z);

        newRocket.position = new BABYLON.Vector3(
            positionRocket.x + (newRocket.direction.x * 1) , 
            positionRocket.y + (newRocket.direction.y * 1) ,
            positionRocket.z + (newRocket.direction.z * 1));
        newRocket.rotation = new BABYLON.Vector3(rotationRocket.x,rotationRocket.y,rotationRocket.z);

        newRocket.scaling = new BABYLON.Vector3(0.5,0.5,1);
        newRocket.isPickable = false;
        newRocket.owner = idPlayer;

        newRocket.material = new BABYLON.StandardMaterial("textureWeapon", this.scene, false, BABYLON.Mesh.DOUBLESIDE);
        newRocket.material.diffuseColor = this.armory.weapons[2].setup.colorMesh;
        newRocket.paramsRocket = this.armory.weapons[2].setup;
        
        game._rockets.push(newRocket);
    },

    createGhostLaser : function(dataRocket){
        var position1 = dataRocket[0];
        var position2 = dataRocket[1];
        var idPlayer = dataRocket[2];

        let line = BABYLON.Mesh.CreateLines("lines", [
                    position1,
                    position2
                ], this.scene);
        var colorLine = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
        line.color = colorLine;
        line.enableEdgesRendering();
        line.isPickable = false;
        line.edgesWidth = 40.0;
        line.edgesColor = new BABYLON.Color4(colorLine.r, colorLine.g, colorLine.b, 1);
        this._lasers.push(line);
    },

    displayScore : function(room){
        if(room.length>=5){
            var limitLoop = 4;
        }else{
            var limitLoop = room.length-1;
        }
        var indexName = 0;
        for (var i = 0; i <= limitLoop ; i++) {
            document.getElementById('player'+indexName).innerText = room[i].name;
            document.getElementById('scorePlayer'+indexName).innerText = room[i].score;
            indexName++;
        }
    }
};

