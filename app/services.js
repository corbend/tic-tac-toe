var angular = angular || null;

(function(angular, global) {

    var STATE_KEY_NAME = 'tictactoe:state';

    function GameStateService() {
        /**
         * сервис для восстановления состояния игры из локального хранилища
         */
        var rawState = window.localStorage.getItem(STATE_KEY_NAME);
        var currentState;
        var valid = false;

        if (rawState) {
            try {
                currentState = JSON.parse(rawState);
                if (currentState && currentState.settings) {
                    valid = true;
                } else {
                    currentState = null;
                    window.localStorage.clear();
                }
            } catch(e) {
                currentState = null;
                window.localStorage.clear();
            }
        }

        var contr = function() {

            this.saveState = function(state) {
                currentState = state;
                window.localStorage.setItem(STATE_KEY_NAME, JSON.stringify(state));
            };

            this.restoreState = function() {
                return currentState;
            };

            this.clearSession = function() {
                currentState = null;
                window.localStorage.clear();
            }
        };

        return new contr;
    }

    global.TicTacToe = global.TicTacToe || {};
    global.TicTacToe.GameStateService = GameStateService;

    return angular && angular.module('ticTacToeGame').service('GameStateService', GameStateService);

})(angular, window);