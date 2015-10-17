(function(angular) {"use strict";
    var appName = 'ticTacToeGame';
    var mainModule = angular.module(appName, []);

    GameController.$inject = ['$timeout', 'GameStateService'];

    function GameController($timeout, GameStateService) {

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

        vm.goToScreen = function(stateName) {
            vm.state = stateName;

            if (vm.state == "end") {
                //сбрасываем все начальные настройки пользователя
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
        };

        vm.prepareField = function() {

            vm.cells = [];
            for (var i = 0; i < vm.settings.size; i++) {

                for (var j = 0; j < vm.settings.size; j++) {
                    var newCell = {
                        x: j, y: i, state: vm.states[0]
                    };
                    vm.cells.push(newCell);
                    vm.cellMap[j + "," + i] = newCell;
                }
            }

        };

        vm.oldSession = GameStateService.restoreState();

        vm.fillCellMap = function(cell) {
            vm.cellMap[cell.x + ',' + cell.y] = cell;
        };

        vm.resumeGame = function() {
            //возобновление предыдущей игры
            var oldSession = GameStateService.restoreState();

            if (!oldSession) {
                vm.currentPlayer = 1;
            } else {
                vm.settings = angular.copy(oldSession.settings);
                vm.startNewGame();
                vm.currentPlayer = oldSession.currentPlayer;
                vm.cells = angular.copy(oldSession.cells);
                vm.cells.forEach(vm.fillCellMap);
                vm.winPoints = oldSession.winPoints;
                vm.maxPlayers = oldSession.maxPlayers;
                vm.playerInfo = angular.copy(oldSession.playerInfo);
                vm.nextTurn();
            }
        };

        vm.startNewGame = function() {

            vm.clearPoints();

            vm.currentPlayer = 1;

            if (vm.checkStartCondition()) {
                vm.prepareField();
                vm.state = "game";

                $timeout(function() {
                    var $field = $("#game-field");
                    var $field_cell_width = $(".cell").eq(0).width();
                    $field.width(vm.settings.size * $field_cell_width);
                    $field.height(vm.settings.size * $field_cell_width);
                });

            } else {
                console.warn("input size please");
            }
        };

        vm.setState = function(cell, saveState, options) {
            //если ячейка не тронутая
            if (cell.state === "toe") {
                //берем текущий тип поля (крестик или нолик) в зависимости от игрока
                cell.state = vm.states[vm.currentPlayer];
                console.log("CURRENT PLAYER", vm.currentPlayer);

                //проверка условий победы
                if (vm.checkState(cell)) {

                    if (saveState) {
                        GameStateService.saveState({
                            currentPlayer: vm.currentPlayer,
                            cells: angular.copy(vm.cells),
                            cellMap: angular.copy(vm.cellMap),
                            playerInfo: angular.copy(vm.playerInfo),
                            winPoints: vm.winPoints,
                            settings: vm.settings,
                            maxPlayers: vm.maxPlayers
                        });
                    }

                    vm.nextTurn();

                    if (options && options.onNextTurn) {
                        options.onNextTurn();
                    }

                } else {
                    //проигрыш
                    vm.winMessage = "Player " + vm.currentPlayer + " win!";
                    GameStateService.clearSession();
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
            /**
             *
             * метод для обхода ячеек, находящихся в близи к текущей и подсчет максимального количества занятых ячеек
             */
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

            //подсчет максимального количества, занятых ячеек у текущего игрока
            var cellPointCount;

            if (playerForCell) {

                if (vm.getPlayerPoints(playerForCell) < (cellPointCount = this._getNearMaxPoints(cell))) {
                    vm.setPlayerPoints(playerForCell, cellPointCount);
                    console.log("Player " + vm.currentPlayer + " gain point", cellPointCount);
                }
            }

        };

        vm.checkState = function(cell) {
            //проверка состояния игрового поля на предмет выигрышной ситуации у одного из игроков
            vm.updatePointCheck(cell, vm.currentPlayer);
            return vm.getPlayerPoints(vm.currentPlayer) != vm.winPoints;
        }
    }

    mainModule.controller('GameCtrl', GameController);

    return mainModule;
})(angular);