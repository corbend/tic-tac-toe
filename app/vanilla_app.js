(function(global) {

	var CELL_WIDTH = 40;
	var TIC_IMAGE = new Image(20, 20);
	TIC_IMAGE.style.width = "40px";
	TIC_IMAGE.style.height = "40px";
	TIC_IMAGE.src = "/styles/images/tic.png";
	var TAC_IMAGE = new Image(20, 20);
	TAC_IMAGE.style.width = "40px";
	TAC_IMAGE.style.height = "40px";
	TAC_IMAGE.src = "/styles/images/tac.png";

	function FieldRenderer(game, restore) {

		var vm = this;
		var fieldEl = document.querySelectorAll('canvas')[0];

		if (fieldEl) {
			fieldEl.style.width = game.settings.size * (CELL_WIDTH) + "px";
			fieldEl.style.height = fieldEl.style.width;
			this.ctx = fieldEl.getContext("2d");

			this.ctx.fillStyle = "white";
			this.ctx.clearRect(0, 0, fieldEl.width, fieldEl.height);

			fieldEl.onclick = function(event) {

				var left = event.clientX - event.target.offsetLeft + document.body.scrollLeft;
				var top = event.clientY - event.target.offsetTop + document.body.scrollTop;

                var x = Math.floor(left / CELL_WIDTH);
                var y = Math.floor(top / CELL_WIDTH);

                if (vm.renderCell(x, y, true)) {
                    game.setState(game.cellMap[x + "," + y], true);
                }
			}
		} else {
            console.warn("no canvas found!");
        }

        this.renderCell = function(x, y, saveState, forceState) {

            if (y < 0) {
                y = 0;
            }
            if (x < 0) {
                x = 0;
            }

            var currentState = forceState || game.states[game.currentPlayer];

            if (game.cellMap[x + "," + y].state === "toe" || forceState) {
                vm.drawImage(x, y, currentState);
                //сохраняем состояние в локальном хранилище
                return true;
            }
        };

		this.renderField = function() {

            for (var i = 0; i < game.settings.size; i++) {

                for (var j = 0; j < game.settings.size; j++) {
                    var newCell = {
                        x: j, y: i, state: game.states[0]
                    };
                    game.cells.push(newCell);
                    game.cellMap[j + "," + i] = newCell;
                    this.drawCell(j, i);
                }
            }
		};

		this.drawCell = function(x, y) {

			this.ctx.beginPath();
			var scaleCoefficient = 0.75 / (game.settings.size / 10);

			this.ctx.rect(
				x * CELL_WIDTH * scaleCoefficient, 
				y * CELL_WIDTH/2 * scaleCoefficient,
				CELL_WIDTH * scaleCoefficient, 
				CELL_WIDTH / 2 * scaleCoefficient);

			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = "black";
			this.ctx.stroke();
		};

		this.drawImage = function(x, y, state) {

			var image = state == "tic" ? TIC_IMAGE: TAC_IMAGE;

			//this.ctx.translate(x * CELL_WIDTH, y * CELL_WIDTH);
			var scaleCoefficient = 0.75 / (game.settings.size / 10);
			this.ctx.drawImage(image, 
				x * scaleCoefficient * CELL_WIDTH, 
				y * scaleCoefficient * CELL_WIDTH/2, 
				CELL_WIDTH * scaleCoefficient, 
				CELL_WIDTH / 2 * scaleCoefficient);
		};

        if (restore) {

            game.cells.forEach(function(cell) {
                if (cell.state !== "toe") {
                    vm.renderCell(cell.x, cell.y, false, cell.state);
                    game.cellMap[cell.x + "," + cell.y] = cell;
                }
            });
        }
	}

	function GameController() {

		var vm = this;

		vm.settings = {};
        vm.state = "start";
        vm.cells = [];
        vm.cellMap = {};
        vm.currentPlayer = 1;
        vm.maxPlayers = 2;
        vm.winPoints = 5;
        vm.playerInfo = {};

        vm.states = [
            'toe',
            'tic',
            'tac'
        ];

		vm.startScreenEl = document.querySelectorAll('.start-screen')[0];
		vm.gameScreenEl = document.querySelectorAll('.game-screen')[0];
		vm.endScreenEl = document.querySelectorAll('.end-screen')[0];

		vm.initControls = function() {

			vm.invalidSettingsBlockEl = document.getElementById("invalidSettingsBlock");
			var startButtonEl = document.getElementById("startButton");
            var resumeButtonEl = document.getElementById("resumeButton");
			var restartButtonEl = document.getElementById("restartButton");
			var continueButtonEl = document.getElementById("continueButton");
			vm.winMessageEl = document.getElementById("winMessagePlace");
			vm.inputSizeEl = document.getElementById("inputSize");

			vm.invalidSettingsBlockEl.style.display = "none";

			startButtonEl.onclick = function() {
				console.log("click start button");
                vm.gameStateService.clearSession();
				vm.startNewGame();
			};

            resumeButtonEl.onclick = function() {
                console.log("click resume button");
                vm.resumeGame();
            };

			restartButtonEl.onclick = function() {
				console.log("click restart button");
                vm.gameStateService.clearSession();
				vm.startNewGame();
			};

			continueButtonEl.onclick = function() {
				console.log("click continue button");
				vm.goToScreen("start");
			};

			vm.inputSizeEl.onchange = function(event) {
				vm.settings.size = parseInt(event.target.value, 10);
			}

		};

		vm.goToScreen = function(stateName) {
            vm.state = stateName;

            vm.startScreenEl.style.display = "none";
            vm.gameScreenEl.style.display = "none";
            vm.endScreenEl.style.display = "none";

            if (vm.state == "start") {
            	vm.startScreenEl.style.display = "block";
            	window.location.href = "#/start";
            } else if (vm.state == "game") {
            	vm.gameScreenEl.style.display = "block";
            	window.location.href = "#/game";
            } else if (vm.state == "end") {
            	vm.endScreenEl.style.display = "block";
            	window.location.href = "#/end";
            	vm.clearSettings();
            }
        };

        vm.clearPoints = function() {
            vm.playerInfo = [];

            for (var pl = 0; pl < vm.maxPlayers; pl++) {

                if (!vm.playerInfo[pl]) {
                    vm.playerInfo[pl] = {points: 0};    
                }

                vm.playerInfo[pl].points = 0;
            }
        };

        vm.clearSettings = function() {

            vm.settings = {};
            vm.inputSizeEl.value = "";
            
        };

        vm.checkStartCondition = function() {
            
            vm.invalid = {
                settings: {
                    is_empty: !vm.settings.size,
                    incorrect_size: vm.settings.size < vm.winPoints
                }
            };
            if (!vm.invalid.settings.is_empty && !vm.invalid.settings.incorrect_size) {
                return true;
            }

			vm.invalidSettingsBlockEl.style.display = "block";

			var emptyMessageLabel = vm.invalidSettingsBlockEl.querySelectorAll("#empty-message-error")[0];
            if (vm.invalid.settings.is_empty) {
            	emptyMessageLabel.style.display = "block";
            } else {
            	emptyMessageLabel.style.display = "none";
            }

			var incorrectSizeLabel = vm.invalidSettingsBlockEl.querySelectorAll("#incorrect-size-error")[0];
            if (vm.invalid.settings.incorrect_size) {
            	incorrectSizeLabel.style.display = "block";
            } else {            	
            	incorrectSizeLabel.style.display = "none";
            }
        };

        vm.gameStateService = global.TicTacToe.GameStateService();

        vm.fillCellMap = function(cell) {
            vm.cellMap[cell.x + ',' + cell.y] = cell;
        };

        vm.resumeGame = function() {

            //возобновление предыдущей игры
            var oldSession = vm.gameStateService.restoreState();

            if (!oldSession) {
                vm.currentPlayer = 1;
            } else {
                vm.settings = global._.clone(oldSession.settings);
                vm.inputSizeEl.value = vm.settings.size;
                vm.startNewGame(true);
                //актуализируем информацию по ячейкам из сохранненого состояния
                vm.cells = global._.clone(oldSession.cells);
                vm.cells.forEach(vm.fillCellMap);
                vm.cells.forEach(function(cell) {
                    if (cell.state !== "toe") {
                        vm.renderer.renderCell(cell.x, cell.y, false, cell.state);
                        vm.cellMap[cell.x + "," + cell.y] = cell;
                    }
                });
                vm.winPoints = oldSession.winPoints;
                vm.maxPlayers = oldSession.maxPlayers;
                vm.playerInfo = global._.clone(oldSession.playerInfo);
                vm.currentPlayer = oldSession.currentPlayer;
                vm.nextTurn();
            }
        };

        vm.startNewGame = function(restore) {

            vm.clearPoints();
            vm.currentPlayer = 1;
            console.log("settings", vm.settings.size);
			vm.renderer = new FieldRenderer(vm, restore);

            if (vm.checkStartCondition()) {
            	vm.setGameState("game");
                vm.renderer.renderField();
            } else {
                console.warn("input size please");
            }
        };

        vm.setGameState = function(gameState) {
        	vm.state = gameState;
        	vm.goToScreen(gameState);
        };

        vm.setState = function(cell, saveState) {

            //установка нового состояния ячейки, если игрок сделал свой ход
            if (cell.state === "toe") {
                cell.state = vm.states[vm.currentPlayer];
                if (vm.checkState(cell)) {

                    if (saveState) {

                        vm.gameStateService.saveState({
                            currentPlayer: vm.currentPlayer,
                            cells: global._.clone(vm.cells),
                            cellMap: global._.clone(vm.cellMap),
                            playerInfo: global._.clone(vm.playerInfo),
                            winPoints: vm.winPoints,
                            settings: global._.clone(vm.settings),
                            maxPlayers: vm.maxPlayers
                        });
                    }

                    vm.nextTurn();
                } else {
                    vm.winMessage = "Player " + vm.currentPlayer + " win!";
                    vm.winMessageEl.innerHTML = vm.winMessage;
                    vm.gameStateService.clearSession();
                    vm.goToScreen("end");
                }
            }

        };

        vm.nextTurn = function() {
            vm.currentPlayer++;

            if (vm.currentPlayer > vm.maxPlayers) {
                vm.currentPlayer = 1;
            }
        };

        vm._scanForDirection = function(cell, direction) {

            var currentSibling;
            if (direction == "leftTopDiagonal") {
                currentSibling = vm.cellMap[[cell.x - 1, cell.y - 1].join(",")];
            } else if (direction == "rightBottomDiagonal") {
                currentSibling = vm.cellMap[[cell.x + 1, cell.y + 1].join(",")];
            } else if (direction == "leftBottomDiagonal") {
                currentSibling = vm.cellMap[[cell.x - 1, cell.y + 1].join(",")];
            } else if (direction == "rightTopDiagonal") {
                currentSibling = vm.cellMap[[cell.x + 1, cell.y - 1].join(",")];
            } else if (direction == "rightHorizontal") {
                currentSibling = vm.cellMap[[cell.x + 1, cell.y].join(",")];
            } else if (direction == "leftHorizontal") {
                currentSibling = vm.cellMap[[cell.x - 1, cell.y].join(",")];
            } else if (direction == "topVertical") {
                currentSibling = vm.cellMap[[cell.x, cell.y - 1].join(",")];
            } else if (direction == "bottomVertical") {
                currentSibling = vm.cellMap[[cell.x, cell.y + 1].join(",")];
            }

            function isProperSibling(siblingCell) {
                return siblingCell && siblingCell.state != "toe" &&
                       siblingCell.state === cell.state;
            }

            return {
                cell: currentSibling,
                valid: isProperSibling(currentSibling)
            }
        };

        vm._getNearMaxPoints = function(cell) {

            var directions =  {
                "leftTopDiagonal": 0,
                "rightBottomDiagonal": 0,
                "leftHorizontal": 0,
                "rightHorizontal": 0,
                "leftBottomDiagonal": 0,
                "rightTopDiagonal": 0,
                "topVertical": 0,
                "bottomVertical": 0
            };

            Object.keys(directions).forEach(function(directionName) {
                var siblingOk = true;
                var lastCell = cell;
                var counter = 0;
                var cellInfo = {valid: true, cell: cell};
                //console.log("scan direction" + directionName + " -> start");
                while (cellInfo.valid) {
                    
                    cellInfo = vm._scanForDirection(cellInfo.cell, directionName);
                    if (cellInfo.valid) {
                        counter++;
                    }
                    //console.log("sibling info", cellInfo);
                }
                //console.log("scan direction" + directionName + " -> stop");
                directions[directionName] = counter;
            });

            var metaDirections = {
                "--": {
                    directions: [directions.leftHorizontal, directions.rightHorizontal],
                    counter: 1
                },
                "||": {
                    directions: [directions.topVertical, directions.bottomVertical],
                    counter: 1
                },
                "\\": {
                    directions: [directions.leftTopDiagonal, directions.rightBottomDiagonal],
                    counter: 1
                },
                "//": {
                    directions: [directions.leftBottomDiagonal, directions.rightTopDiagonal],
                    counter: 1
                }
            };
            var maxByDirection = 0;

            Object.keys(metaDirections).forEach(function(metaDirectionName) {
                var sum = 1;
                var metaDirection = metaDirections[metaDirectionName];

                metaDirection.directions.forEach(function(direction_counter) {
                    sum += direction_counter;
                });
                metaDirection.counter = sum;
                if (maxByDirection < sum) {
                    maxByDirection = sum;
                }
            });

            console.log("MAX_LENGTH = ", maxByDirection);

            return maxByDirection;
        };

        vm.getPlayerPoints = function(playerIndex) {
            return vm.playerInfo[playerIndex - 1].points;
        };

        vm.setPlayerPoints = function(playerIndex, points) {
            vm.playerInfo[playerIndex - 1].points = points;
        };

        vm.updatePointCheck = function(cell, playerForCell) {

            var cellPointCount;

            if (playerForCell) {

                if (vm.getPlayerPoints(playerForCell) < (cellPointCount = this._getNearMaxPoints(cell))) {
                    vm.setPlayerPoints(playerForCell, cellPointCount);
                    console.log("Player " + vm.currentPlayer + " gain point", cellPointCount);
                }
            }

        };

        vm.checkState = function(cell) {
            vm.updatePointCheck(cell, vm.currentPlayer);
            return vm.getPlayerPoints(vm.currentPlayer) != vm.winPoints;
        }

		
	}

	window.onload = function() {
		var game = new GameController();
		game.initControls();
		game.goToScreen("start");
	}
})(window);