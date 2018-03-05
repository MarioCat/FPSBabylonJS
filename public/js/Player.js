Player = function(game, canvas) {
    // _this est l'accès à la caméraà l'interieur de Player
    var _this = this;

    this.textHealth = document.getElementById('textHealth');
    this.textArmor = document.getElementById('textArmor');

    //Sensibilité souris
    _this.angularSensibility = 200;

    //Vitesse de déplacement du joueur
    _this.speed = 0.5;

    // Si le tir est activée ou non
    this.weponShoot = false;

    this.ghostPlayers=[];

    // Le jeu, chargé dans l'objet Player
    this.game = game;

    // Axe de mouvement X et Z
    this.axisMovement = [false,false,false,false];

    // On récupère le canvas de la scène 
    var canvas = this.game.scene.getEngine().getRenderingCanvas();

    // On affecte le clic et on vérifie qu'il est bien utilisé dans la scène (_this.controlEnabled)
    canvas.addEventListener("mousedown", function(evt) {
        if (_this.controlEnabled && !_this.weponShoot) {
            _this.weponShoot = true;
            _this.handleUserMouseDown();
        }
    }, false);

    // On fait pareil quand l'utilisateur relache le clic de la souris
    canvas.addEventListener("mouseup", function(evt) {
        if (_this.controlEnabled && _this.weponShoot) {
            _this.weponShoot = false;
            _this.handleUserMouseUp();
        }
    }, false);

    // Changement des armes
    this.previousWheeling = 0;

    canvas.addEventListener("mousewheel", function(evt) {
        // Si la différence entre les deux tours de souris sont minimes
        if(Math.round(evt.timeStamp - _this.previousWheeling)>10){
            if(evt.deltaY<0){
                // Si on scroll vers le haut, on va chercher l'arme suivante
                _this.camera.weapons.nextWeapon(1);
            }else{
                // Si on scroll vers le bas, on va chercher l'arme précédente
                _this.camera.weapons.nextWeapon(-1);
            }
            //On affecte a previousWheeling la valeur actuelle
            _this.previousWheeling = evt.timeStamp;
        }
        
    }, false);

    window.addEventListener("keyup", function(evt) {
    if(evt.keyCode == 90 || evt.keyCode == 83 || evt.keyCode == 81 || evt.keyCode == 68 ){
        switch(evt.keyCode){
            case 90:
            _this.camera.axisMovement[0] = false;
            break;
            case 83:
            _this.camera.axisMovement[1] = false;
            break;
            case 81:
            _this.camera.axisMovement[2] = false;
            break;
            case 68:
            _this.camera.axisMovement[3] = false;
            break;
        }
        var data={
            axisMovement : _this.camera.axisMovement
        };
        _this.sendNewData(data)
        
        }
    }, false);

        // Quand les touches sont relachées
        window.addEventListener("keydown", function(evt) {
            if(evt.keyCode == 90 || evt.keyCode == 83 || evt.keyCode == 81 || evt.keyCode == 68 ){
                switch(evt.keyCode){
                    case 90:
                    _this.camera.axisMovement[0] = true;
                    break;
                    case 83:
                    _this.camera.axisMovement[1] = true;
                    break;
                    case 81:
                    _this.camera.axisMovement[2] = true;
                    break;
                    case 68:
                    _this.camera.axisMovement[3] = true;
                    break;
                }
                var data={
                    axisMovement : _this.camera.axisMovement
                };
                _this.sendNewData(data)
            }
            
        }, false);

    // Quand la souris bouge dans la scène
    window.addEventListener("mousemove", function(evt) {
        if(_this.rotEngaged === true){
            _this.camera.playerBox.rotation.y+=evt.movementX * 0.001 * (_this.angularSensibility / 250);
            var nextRotationX = _this.camera.playerBox.rotation.x + (evt.movementY * 0.001 * (_this.angularSensibility / 250));
        if( nextRotationX < degToRad(90) && nextRotationX > degToRad(-90)){
            _this.camera.playerBox.rotation.x+=evt.movementY * 0.001 * (_this.angularSensibility / 250);
        }
        var data={
            rotation : _this.camera.playerBox.rotation
        };
            _this.sendNewData(data)
        }
    }, false);
    
    // Initialisation de la caméra
    this._initCamera(this.game.scene, canvas);

    // Le joueur doit cliquer dans la scène pour que controlEnabled soit changé
    this.controlEnabled = false;

    // On lance l'event _initPointerLock pour checker le clic dans la scène
    this._initPointerLock(); 
    
};



Player.prototype = {
    _initPointerLock : function() {
    var _this = this;
    
    // Requete pour la capture du pointeur
    var canvas = this.game.scene.getEngine().getRenderingCanvas();
    canvas.addEventListener("click", function(evt) {
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }, false);

    // Evenement pour changer le paramètre de rotation
    var pointerlockchange = function (event) {
        _this.controlEnabled = (document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas || document.msPointerLockElement === canvas || document.pointerLockElement === canvas);
        if (!_this.controlEnabled) {
            _this.rotEngaged = false;
        } else {
            _this.rotEngaged = true;
        }
    };
    
    // Event pour changer l'état du pointeur, sous tout les types de navigateur
    document.addEventListener("pointerlockchange", pointerlockchange, false);
    document.addEventListener("mspointerlockchange", pointerlockchange, false);
    document.addEventListener("mozpointerlockchange", pointerlockchange, false);
    document.addEventListener("webkitpointerlockchange", pointerlockchange, false);
    },

    _initCamera : function(scene, canvas) {
        // Math.random nous donne un nombre entre 0 et 1
        let randomPoint = Math.random();

        // randomPoint fait un arrondi de ce chiffre et du nombre de spawnPoints
        randomPoint = Math.round(randomPoint * (this.game.allSpawnPoints.length - 1));

        // On dit que le spawnPoint est celui choisi selon le random plus haut
        this.spawnPoint = this.game.allSpawnPoints[randomPoint];

        var playerBox = BABYLON.Mesh.CreateBox("headMainPlayer", 3, scene);
        // On donne le spawnPoint avec clone() pour que celui-ci ne soit pas affecté par le déplacement du joueur
        playerBox.position = this.spawnPoint.clone();
        playerBox.ellipsoid = new BABYLON.Vector3(2, 2, 2);

        // On crée la caméra
        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, 0), scene);
        // On réinitialise la position de la caméra
        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.game.scene.activeCamera = this.camera;

        this.camera.playerBox = playerBox
        this.camera.parent = this.camera.playerBox;

        // Ajout des collisions avec playerBox
        this.camera.playerBox.checkCollisions = true;
        this.camera.playerBox.applyGravity = true;

        // Si le joueur est en vie ou non
        this.isAlive = true;

        // On crée les armes !
        this.camera.weapons = new Weapons(this);

        // La santé du joueur
        this.camera.health = 100;
        // Pour savoir que c'est le joueur principal
        this.camera.isMain = true;
        // L'armure du joueur
        this.camera.armor = 0;

        // Axe de mouvement X et Z
        this.camera.axisMovement = [false,false,false,false];

        // Affichage de la vie et de l'armure
        this.textHealth.innerText = this.camera.health;
        this.textArmor.innerText = this.camera.armor;

        var hitBoxPlayer = BABYLON.Mesh.CreateBox("hitBoxPlayer", 3, scene);
        hitBoxPlayer.parent = this.camera.playerBox;
        hitBoxPlayer.scaling.y = 2;
        hitBoxPlayer.isPickable = true;
        hitBoxPlayer.isMain = true;
    },

    _checkMove : function(ratioFps){
        // On bouge le player en lui attribuant la caméra
        this._checkUniqueMove(ratioFps,this.camera);
        for (var i = 0; i < this.ghostPlayers.length; i++) {
            // On bouge chaque ghost présent dans ghostPlayers
            this._checkUniqueMove(ratioFps,this.ghostPlayers[i]);
        }
    },

    _checkUniqueMove : function(ratioFps, player) {
    let relativeSpeed = this.speed / ratioFps;
    var playerSelected = player

    if(playerSelected.head){
        var rotationPoint = playerSelected.head.rotation;
    }else{
        var rotationPoint = playerSelected.playerBox.rotation;
    }
    if(playerSelected.axisMovement[0]){  
        forward = new BABYLON.Vector3(
            parseFloat(Math.sin(parseFloat(rotationPoint.y))) * relativeSpeed, 
                0, 
            parseFloat(Math.cos(parseFloat(rotationPoint.y))) * relativeSpeed
            );
        playerSelected.playerBox.moveWithCollisions(forward);
    }
    if(playerSelected.axisMovement[1]){
        backward = new BABYLON.Vector3(
            parseFloat(-Math.sin(parseFloat(rotation.y))) * relativeSpeed, 
            0, 
            parseFloat(-Math.cos(parseFloat(rotation.y))) * relativeSpeed
        );
        playerSelected.playerBox.moveWithCollisions(backward);
    }
    if(playerSelected.axisMovement[2]){
        left = new BABYLON.Vector3(
            parseFloat(Math.sin(parseFloat(rotation.y) + degToRad(-90))) * relativeSpeed, 
            0, 
            parseFloat(Math.cos(parseFloat(rotation.y) + degToRad(-90))) * relativeSpeed
        );
        playerSelected.playerBox.moveWithCollisions(left);
    }
    if(playerSelected.axisMovement[3]){
        right = new BABYLON.Vector3(
            parseFloat(-Math.sin(parseFloat(rotation.y) + degToRad(-90))) * relativeSpeed, 
            0, 
            parseFloat(-Math.cos(parseFloat(rotation.y) + degToRad(-90))) * relativeSpeed
        );
        playerSelected.playerBox.moveWithCollisions(right);
    }
        if(playerSelected.isAlive) playerSelected.playerBox.moveWithCollisions(new BABYLON.Vector3(0,(-1.5) * relativeSpeed ,0));
    },

    handleUserMouseDown : function() {
        if(this.isAlive === true){
            this.camera.weapons.fire();
        }
    },

    handleUserMouseUp : function() {
        if(this.isAlive === true){
            this.camera.weapons.stopFire();
        }
    },

    getDamage : function(damage, whoDamage){
        var damageTaken = damage;
        // Tampon des dégâts par l'armure
        if(this.camera.armor > Math.round(damageTaken/2)){
            this.camera.armor -= Math.round(damageTaken/2);
            damageTaken = Math.round(damageTaken/2);
        }else{
            damageTaken = damageTaken - this.camera.armor;
            this.camera.armor = 0;
        }
        // Prise des dégâts avec le tampon de l'armure
        if(this.camera.health>damageTaken){
            this.camera.health-=damageTaken;
            if(this.camera.isMain){
                this.textHealth.innerText = this.camera.health;
                this.textArmor.innerText = this.camera.armor;
            }
        }else{
            if(this.camera.isMain){
                this.textHealth.innerText = 0;
                this.textArmor.innerText = 0;
            }
            this.playerDead(damageGivenBy)
        }
    },

    playerDead : function(i) {
        // Fonction appelée pour annoncer la destruction du joueur
        sendPostMortem(i);

        this.deadCamera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 
        1, 0.8, 10, new BABYLON.Vector3(
            this.camera.playerBox.position.x, 
            this.camera.playerBox.position.y, 
            this.camera.playerBox.position.z), 
        this.game.scene);

        this.game.scene.activeCamera = this.deadCamera;
        this.deadCamera.attachControl(this.game.scene.getEngine().getRenderingCanvas());

        // Suppression de la playerBox
        this.camera.playerBox.dispose();

        // Suppression de la camera
        this.camera.dispose();   

        var inventoryWeapons = this.camera.weapons.inventory;
        for (var i = 0; i < inventoryWeapons.length; i++) {
            inventoryWeapons[i].dispose();
        }
        inventoryWeapons = [];

        // On signale à Weapons que le joueur est mort
        this.isAlive=false;

        var newPlayer = this;
        var canvas = this.game.scene.getEngine().getRenderingCanvas();

        setTimeout(function(){ 
            newPlayer._initCamera(newPlayer.game.scene, canvas, newPlayer.spawnPoint);
            newPlayer.launchRessurection();
        }, 4000);
    },

    launchRessurection : function(){
        ressurectMe();
    },

    sendNewData : function(data){
        updateGhost(data);
    },

    sendActualData : function(){
        return {
            actualTypeWeapon : this.camera.weapons.actualWeapon,
            armor : this.camera.armor,
            life : this.camera.health,
            position  : this.camera.playerBox.position,
            rotation : this.camera.playerBox.rotation,
            axisMovement : this.camera.axisMovement
        }
    },

    updateLocalGhost : function(data){
        ghostPlayers = this.ghostPlayers;
        
        for (var i = 0; i < ghostPlayers.length; i++) {
            if(ghostPlayers[i].idRoom === data.id){
                var boxModified = ghostPlayers[i].playerBox;
                // On applique un correctif sur Y, qui semble être au mauvais endroit
                if(data.position){
                    boxModified.position = new BABYLON.Vector3(data.position.x,data.position.y-2.76,data.position.z);
                }
                if(data.axisMovement){
                    ghostPlayers[i].axisMovement = data.axisMovement;
                }
                if(data.rotation){
                    ghostPlayers[i].head.rotation.y = data.rotation.y;
                }
                if(data.axisMovement){
                    ghostPlayers[i].axisMovement = data.axisMovement;
                }
            }
            
        }
    }
};


// ------------------------- TRANSFO DE DEGRES/RADIANS 
function degToRad(deg)
{
   return (Math.PI*deg)/180
}
// ----------------------------------------------------

// -------------------------- TRANSFO DE DEGRES/RADIANS 
function radToDeg(rad)
{
   // return (Math.PI*deg)/180
   return (rad*180)/Math.PI
}
// ----------------------------------------------------