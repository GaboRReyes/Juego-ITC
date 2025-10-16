// ============================================================================
// Sistema de Pathfinding Avanzado para RPG Maker MV
// ============================================================================

// ----------------------------------------------------------------------------
// Configuración de Zonas Transitables
// ----------------------------------------------------------------------------
var ZoneManager = {
    zones: {},
    
    // Define una zona transitable con nombre y coordenadas
    defineZone: function(zoneName, tileCoords) {
        this.zones[zoneName] = tileCoords.map(coord => ({
            x: coord[0],
            y: coord[1]
        }));
    },
    
    // Verifica si una posición está dentro de alguna zona transitable
    isWalkable: function(x, y) {
        for (var zoneName in this.zones) {
            var zone = this.zones[zoneName];
            for (var i = 0; i < zone.length; i++) {
                if (zone[i].x === x && zone[i].y === y) {
                    return true;
                }
            }
        }
        return false;
    },
    
    // Define una zona rectangular
    defineRectZone: function(zoneName, x1, y1, x2, y2) {
        var coords = [];
        for (var x = x1; x <= x2; x++) {
            for (var y = y1; y <= y2; y++) {
                coords.push([x, y]);
            }
        }
        this.defineZone(zoneName, coords);
    }
};

// ----------------------------------------------------------------------------
// Sistema de Pathfinding A*
// ----------------------------------------------------------------------------
var PathfindingSystem = {
    
    // Implementación del algoritmo A*
    findPath: function(startX, startY, goalX, goalY, checkObstacles) {
        checkObstacles = checkObstacles !== undefined ? checkObstacles : true;
        
        var openList = [];
        var closedList = [];
        var startNode = {
            x: startX,
            y: startY,
            g: 0,
            h: this.heuristic(startX, startY, goalX, goalY),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;
        openList.push(startNode);
        
        while (openList.length > 0) {
            // Encuentra el nodo con menor F
            var currentIndex = 0;
            for (var i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) {
                    currentIndex = i;
                }
            }
            var current = openList[currentIndex];
            
            // Si llegamos al objetivo
            if (current.x === goalX && current.y === goalY) {
                return this.reconstructPath(current);
            }
            
            // Mueve de open a closed
            openList.splice(currentIndex, 1);
            closedList.push(current);
            
            // Examina vecinos (4 direcciones)
            var neighbors = this.getNeighbors(current.x, current.y);
            for (var i = 0; i < neighbors.length; i++) {
                var neighbor = neighbors[i];
                
                // Verifica si es transitable
                if (checkObstacles && !this.isPassable(neighbor.x, neighbor.y)) {
                    continue;
                }
                
                // Verifica si está en closed list
                if (this.inList(closedList, neighbor.x, neighbor.y)) {
                    continue;
                }
                
                var gScore = current.g + 1;
                var neighborNode = this.inList(openList, neighbor.x, neighbor.y);
                
                if (!neighborNode) {
                    neighborNode = {
                        x: neighbor.x,
                        y: neighbor.y,
                        g: gScore,
                        h: this.heuristic(neighbor.x, neighbor.y, goalX, goalY),
                        parent: current
                    };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openList.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }
        
        return null; // No se encontró camino
    },
    
    // Heurística Manhattan
    heuristic: function(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    },
    
    // Obtiene vecinos de una posición
    getNeighbors: function(x, y) {
        return [
            {x: x, y: y - 1, dir: 8},     // Arriba
            {x: x, y: y + 1, dir: 2},     // Abajo
            {x: x - 1, y: y, dir: 4},     // Izquierda
            {x: x + 1, y: y, dir: 6}      // Derecha
        ];
    },
    
    // Verifica si una posición es transitable
    isPassable: function(x, y) {
        // Verifica límites del mapa
        if (x < 0 || y < 0 || x >= $gameMap.width() || y >= $gameMap.height()) {
            return false;
        }
        
        // Verifica si hay zonas definidas
        if (Object.keys(ZoneManager.zones).length > 0) {
            return ZoneManager.isWalkable(x, y);
        }
        
        // Verifica colisiones del mapa
        return $gameMap.isPassable(x, y, 2) || $gameMap.isPassable(x, y, 4) ||
               $gameMap.isPassable(x, y, 6) || $gameMap.isPassable(x, y, 8);
    },
    
    // Busca un nodo en una lista
    inList: function(list, x, y) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].x === x && list[i].y === y) {
                return list[i];
            }
        }
        return null;
    },
    
    // Reconstruye el camino desde el objetivo al inicio
    reconstructPath: function(node) {
        var path = [];
        var current = node;
        while (current.parent) {
            path.unshift({x: current.x, y: current.y});
            current = current.parent;
        }
        return path;
    }
};

// ----------------------------------------------------------------------------
// Sistema de Interacción con Obstáculos
// ----------------------------------------------------------------------------
var ObstacleInteraction = {
    obstacles: {},
    
    // Registra un obstáculo con animaciones específicas
    registerObstacle: function(eventId, config) {
        this.obstacles[eventId] = {
            type: config.type || 'static',
            animation: config.animation || null,
            interactable: config.interactable !== undefined ? config.interactable : true,
            onInteract: config.onInteract || null,
            passable: config.passable !== undefined ? config.passable : false
        };
    },
    
    // Verifica si hay un obstáculo en una posición
    hasObstacle: function(x, y) {
        var events = $gameMap.eventsXy(x, y);
        for (var i = 0; i < events.length; i++) {
            if (this.obstacles[events[i].eventId()]) {
                return events[i];
            }
        }
        return null;
    },
    
    // Interactúa con un obstáculo
    interact: function(eventId) {
        var obstacle = this.obstacles[eventId];
        if (!obstacle || !obstacle.interactable) return false;
        
        var event = $gameMap.event(eventId);
        
        // Reproduce animación si está definida
        if (obstacle.animation) {
            $gameTemp.requestAnimation([event], obstacle.animation);
        }
        
        // Ejecuta callback personalizado
        if (obstacle.onInteract) {
            obstacle.onInteract(event);
        }
        
        return true;
    },
    
    // Verifica si un obstáculo es pasable
    isObstaclePassable: function(eventId) {
        var obstacle = this.obstacles[eventId];
        return obstacle ? obstacle.passable : true;
    }
};

// ----------------------------------------------------------------------------
// Extensión de Game_Character para Pathfinding
// ----------------------------------------------------------------------------
(function() {
    var _Game_Character_initMembers = Game_Character.prototype.initMembers;
    Game_Character.prototype.initMembers = function() {
        _Game_Character_initMembers.call(this);
        this._pathfindingRoute = [];
        this._pathfindingIndex = 0;
        this._isFollowingPath = false;
    };
    
    // Inicia pathfinding hacia un objetivo
    Game_Character.prototype.startPathfinding = function(goalX, goalY) {
        var path = PathfindingSystem.findPath(
            this.x, this.y, goalX, goalY, true
        );
        
        if (path) {
            this._pathfindingRoute = path;
            this._pathfindingIndex = 0;
            this._isFollowingPath = true;
            return true;
        }
        return false;
    };
    
    // Actualiza el movimiento por pathfinding
    Game_Character.prototype.updatePathfinding = function() {
        if (!this._isFollowingPath || this.isMoving()) return;
        
        if (this._pathfindingIndex < this._pathfindingRoute.length) {
            var nextPos = this._pathfindingRoute[this._pathfindingIndex];
            var dx = nextPos.x - this.x;
            var dy = nextPos.y - this.y;
            
            if (dx !== 0) {
                this.moveStraight(dx > 0 ? 6 : 4);
            } else if (dy !== 0) {
                this.moveStraight(dy > 0 ? 2 : 8);
            }
            
            this._pathfindingIndex++;
        } else {
            this._isFollowingPath = false;
        }
    };
    
    var _Game_Character_update = Game_Character.prototype.update;
    Game_Character.prototype.update = function() {
        _Game_Character_update.call(this);
        if (this._isFollowingPath) {
            this.updatePathfinding();
        }
    };
    
    // Detiene el pathfinding
    Game_Character.prototype.stopPathfinding = function() {
        this._isFollowingPath = false;
        this._pathfindingRoute = [];
        this._pathfindingIndex = 0;
    };
})();

// ----------------------------------------------------------------------------
// Plugin Commands
// ----------------------------------------------------------------------------
(function() {
    var _Game_Interpreter_pluginCommand = Game_Interpreter.pluginCommand;
    Game_Interpreter.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        
        switch(command) {
            case 'DefineZone':
                // DefineZone nombre x1 y1 x2 y2
                ZoneManager.defineRectZone(
                    args[0],
                    parseInt(args[1]),
                    parseInt(args[2]),
                    parseInt(args[3]),
                    parseInt(args[4])
                );
                break;
                
            case 'PathfindTo':
                // PathfindTo eventId x y
                var character = this.character(parseInt(args[0]));
                if (character) {
                    character.startPathfinding(parseInt(args[1]), parseInt(args[2]));
                }
                break;
                
            case 'RegisterObstacle':
                // RegisterObstacle eventId type animationId
                ObstacleInteraction.registerObstacle(parseInt(args[0]), {
                    type: args[1],
                    animation: parseInt(args[2]),
                    interactable: true
                });
                break;
                
            case 'InteractObstacle':
                // InteractObstacle eventId
                ObstacleInteraction.interact(parseInt(args[0]));
                break;
        }
    };
})();

// ============================================================================
// Ejemplos de Uso
// ============================================================================
/*

// En un evento, usa Plugin Command:

// 1. Definir zona transitable rectangular (x1, y1, x2, y2)
DefineZone plaza 10 10 20 20

// 2. Mover un evento siguiendo pathfinding
PathfindTo 1 15 15

// 3. Registrar un obstáculo con animación
RegisterObstacle 5 breakable 10

// 4. Interactuar con obstáculo
InteractObstacle 5

// En código JavaScript personalizado:

// Definir zona irregular manualmente
ZoneManager.defineZone('bosque', [
    [5, 5], [5, 6], [6, 5], [6, 6],
    [7, 5], [7, 6], [8, 5], [8, 6]
]);

// Pathfinding para el jugador
$gamePlayer.startPathfinding(25, 25);

// Registrar obstáculo con callback
ObstacleInteraction.registerObstacle(3, {
    type: 'destroyable',
    animation: 15,
    interactable: true,
    passable: false,
    onInteract: function(event) {
        $gameSwitches.setValue(10, true);
        event.erase();
    }
});

*/