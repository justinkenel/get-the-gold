const assert = require('assert');
const gameEngine = require('../game-engine.js');

function getGameEngine() {
  return gameEngine(gameEngine.getInitialState());
}

function getSetupGameEngine() {
  const gameEngine = getGameEngine();
  gameEngine.joinGame('player-1'); gameEngine.joinGame('player-2');
  gameEngine.setRace('player-1', 'elf'); gameEngine.setRace('player-2', 'mage');
  gameEngine.signalReady('player-1');
  gameEngine.signalReady('player-2');
  return gameEngine;
}

describe('GameEngine Public Functions', function() {
  describe('getGameState', function() {
    const gameEngine = getGameEngine();
    it('should have no players', function() {
      assert.deepEqual({}, gameEngine.getGameState().players);
      assert.deepEqual([], gameEngine.getGameState().playerOrder);
    });
    it('should have null current player', function() {
      assert.deepEqual(null, gameEngine.getGameState().currentPlayer);
    });
    it('should be in prologue state', function() {
      assert.deepEqual('state-prologue', gameEngine.getGameState().currentState);
    });
    it('should have appropriate playerSetup', function() {
      assert.deepEqual({availableRaces: ['mage', 'elf', 'orc', 'goblin']}, gameEngine.getGameState().playerSetup);
    });
    it('should have completely empty data for palisades', function() {
      const palisadeKeys = Object.keys(gameEngine.getGameState().palisades);
      assert.equal(67, palisadeKeys.length);
      assert(palisadeKeys.every(key => gameEngine.getGameState().palisades[key] == 0));
    });
  });

  function getGameEngineWithFourPlayers() {
    const gameEngine = getGameEngine();
    gameEngine.joinGame('player-1');
    gameEngine.joinGame('player-2');
    gameEngine.joinGame('player-3');
    gameEngine.joinGame('player-4');
    return gameEngine;
  }

  describe('joinGame', function() {
    describe('single player', function() {
      const gameEngine = getGameEngine();
      gameEngine.joinGame('player-1');
      it('should have player in gameState', function() {
        const players = {'player-1': {race: "", ready: false, tokens: []}};
        assert.deepEqual(players, gameEngine.getGameState().players);
        assert.deepEqual(['player-1'], gameEngine.getGameState().playerOrder);
      });
      it('should still be in prologue state', function() {
        assert.equal('state-prologue', gameEngine.getGameState().currentState);
      });
    });
    describe('multiple players', function() {
      const playerDataForFourPlayers = {
        'player-1': {race: "", ready: false, tokens: []},
        'player-2': {race: "", ready: false, tokens: []},
        'player-3': {race: "", ready: false, tokens: []},
        'player-4': {race: "", ready: false, tokens: []}
      };
      it('should allow four players to join', function() {
        const gameEngine = getGameEngineWithFourPlayers();
        assert.deepEqual(playerDataForFourPlayers, gameEngine.getGameState().players);
        assert.deepEqual(['player-1', 'player-2', 'player-3', 'player-4'], gameEngine.getGameState().playerOrder);
      });
      it('should still be in prologue state', function() {
        const gameEngine = getGameEngineWithFourPlayers();
        assert.equal('state-prologue', gameEngine.getGameState().currentState);
      });
      it('should not allow a fifth player to join', function() {
        const gameEngine = getGameEngineWithFourPlayers();
        assert.throws(() => gameEngine.joinGame('player-5'), 'Unable to join game: Already 4 players');
        assert.deepEqual(playerDataForFourPlayers, gameEngine.getGameState().players);
        assert.deepEqual(['player-1', 'player-2', 'player-3', 'player-4'], gameEngine.getGameState().playerOrder);
      });
    });
  });

  describe('setRace', function() {
    it('should set race within players dictionary', function() {
      const gameEngine = getGameEngine();
      gameEngine.joinGame('player-1');
      gameEngine.setRace('player-1', 'elf');
      const players = {'player-1': {race: "elf", ready: false, tokens: []}};
      assert.deepEqual(players, gameEngine.getGameState().players);
    });
  });

  describe('signalReady', function() {
    it('should not start game if only one player signals ready', function() {
      const gameEngine = getGameEngine();
      gameEngine.joinGame('player-1');
      gameEngine.setRace('player-1', 'elf');
      gameEngine.signalReady('player-1');
      assert.equal('state-prologue', gameEngine.getGameState().currentState);
    });
    it('should not start the game if there are two players and only one signals ready', function() {
      const gameEngine = getGameEngine();
      gameEngine.joinGame('player-1'); gameEngine.joinGame('player-2');
      gameEngine.setRace('player-1', 'elf'); gameEngine.setRace('player-2', 'mage');
      gameEngine.signalReady('player-1');
      assert.equal('state-prologue', gameEngine.getGameState().currentState);
    });
    describe('two players signal ready', function() {
      const gameEngine = getGameEngine();
      gameEngine.joinGame('player-1'); gameEngine.joinGame('player-2');
      gameEngine.setRace('player-1', 'elf'); gameEngine.setRace('player-2', 'mage');
      gameEngine.signalReady('player-1');
      gameEngine.signalReady('player-2');
      it('should start the game if two players signal ready', function() {
        assert.equal('state-no-move', gameEngine.getGameState().currentState);
      });
      it('should set the first player to join as player one', function() {
        assert.equal('player-1', gameEngine.getGameState().currentPlayer);
      });
      it('should assign the correct number of reserves for each player', function() {
        assert.deepEqual([11, 2, 1, 1, 1], gameEngine.getGameState().players['player-1'].tokens);
        assert.deepEqual([11, 2, 1, 1, 1], gameEngine.getGameState().players['player-2'].tokens)
      });
    });
  });

  describe('addToken', function() {
    describe('adding token of value 1 in empty tile 0,0', function() {
      const gameEngine = getSetupGameEngine();
      gameEngine.addToken(0,0,1);
      it('should have the correct value in tiles[0][0]', function() {
        assert.deepEqual({type:'army', player:'player-1', value:1}, gameEngine.getGameState().tiles[0][0]);
      });
      it('should set gameState.currentPlayer to the next player in order', function() {
        assert.equal('player-2', gameEngine.getGameState().currentPlayer);
      });
      it('should set gameState.currentState to state-no-move', function() {
        assert.equal('state-no-move', gameEngine.getGameState().currentState);
      });
      it('should decrement the number of tokens for player-1 of value 1', function() {
        assert.deepEqual([10, 2, 1, 1, 1], gameEngine.getGameState().players['player-1'].tokens);
      });
    });
  });
});

describe('Game Engine private functions', function() {
  describe('__getTerritoryTiles', function() {
    it('should return the tiles that are within the territory, sequestered by the palisades', function() {
      const gameEngine = getSetupGameEngine();

      gameEngine.placePalisade('1-2');
      gameEngine.placePalisade('8-16');
      gameEngine.placePalisade('9-10');
      gameEngine.placePalisade('9-17');

      assert.deepEqual([
        {row:1, column:1},
        {row:1, column:0},
        {row:0, column:0},
        {row:0, column:1}
      ], gameEngine.__getTerritoryTiles(1,1));
    });
  });

  // 0:W1    1:B1    1-2: |
  // 8:W1    9:G     9-10:|
  // 8-16:-- 9-17:--
  describe('__getGoldWinnersForTile', function() {
    it('should return player-1 when player-1 has more armies in the territory', function() {
      const gameEngine = getSetupGameEngine();

      gameEngine.addToken(0,0,1); // player-1
      gameEngine.addToken(0,1,1); // player-2
      gameEngine.addToken(1,0,1); // player-1
      gameEngine.placePalisade('1-2');
      gameEngine.placePalisade('8-16');
      gameEngine.placePalisade('9-10');
      gameEngine.placePalisade('9-17');

      assert.deepEqual(['player-1'], gameEngine.__getGoldWinnersForTile(1,1));
    });
    it('should return player-1 and player-2 when they have the same value in the territory', function() {
      const gameEngine = getSetupGameEngine();

      gameEngine.addToken(0,0,1); // player-1
      gameEngine.addToken(0,1,2); // player-2
      gameEngine.addToken(1,0,1); // player-1
      gameEngine.placePalisade('1-2');
      gameEngine.placePalisade('8-16');
      gameEngine.placePalisade('9-10');
      gameEngine.placePalisade('9-17');

      assert.deepEqual(['player-1', 'player-2'], gameEngine.__getGoldWinnersForTile(1,1));
    });
  });

  describe('__getPlayerScores', function() {
    it('should return player-1 as having the full value of a territory if they have more', function() {
      const gameEngine = getSetupGameEngine();

      gameEngine.addToken(0,0,1); // player-1
      gameEngine.addToken(0,1,1); // player-2
      gameEngine.addToken(1,0,1); // player-1
      gameEngine.placePalisade('1-2');
      gameEngine.placePalisade('8-16');
      gameEngine.placePalisade('9-10');
      gameEngine.placePalisade('9-17');

      assert.deepEqual({'player-1': 4}, gameEngine.__getPlayerScores());
    });
    it('should return both players as having 2 when they have the same army size in a territory', function() {
      const gameEngine = getSetupGameEngine();

      gameEngine.addToken(0,0,1); // player-1
      gameEngine.addToken(0,1,2); // player-2
      gameEngine.addToken(1,0,1); // player-1
      gameEngine.placePalisade('1-2');
      gameEngine.placePalisade('8-16');
      gameEngine.placePalisade('9-10');
      gameEngine.placePalisade('9-17');

      assert.deepEqual({'player-1': 2, 'player-2': 2}, gameEngine.__getPlayerScores());
    });
  });

  describe('__determineWinner', function() {
    it('should return player-1 when they have the most points', function() {
      const gameEngine = getSetupGameEngine();

      gameEngine.addToken(0,0,1); // player-1
      gameEngine.addToken(0,1,1); // player-2
      gameEngine.addToken(1,0,1); // player-1
      gameEngine.placePalisade('1-2');
      gameEngine.placePalisade('8-16');
      gameEngine.placePalisade('9-10');
      gameEngine.placePalisade('9-17');

      assert.equal('player-1', gameEngine.__determineWinner());
    });
  });
});
