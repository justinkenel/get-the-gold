const React = require('react');
const ReactDom = require('react-dom');

const colorMap = {
  elf: 'blue',
  mage: 'white',
  orc: 'red',
  goblin: 'black'
};

const textColorMap = {
  elf: 'yellow',
  mage: 'black',
  orc: 'cyan',
  goblin: 'white'
};

const TILE_HEIGHT = 102;
const TILE_WIDTH = 102;

const host = location.host;

const Reserves = React.createClass({
  render: function() {
    const gameState = this.props.gameState;
    const clientState = this.props.clientState;
    const playerState = gameState.players[clientState.playerId];
    const playerRace = playerState.race;
    const color = colorMap[playerRace];

    const tokens = playerState.tokens.map((count, value) => {
      const tokenStyle = {
        left: 10 + value*150
      };
      const armyClassName = clientState.selectedTokenSize === value+1 ? "army selected" : "army";
      const armyStyle = {backgroundColor: color, color: textColorMap[playerRace]};
      const selectValue = () => { this.props.selectToken(value+1); };
      return (<div className="unused-token" style={tokenStyle}>
        <div className={armyClassName} style={armyStyle} onClick={selectValue}>
          <p>{value+1}</p>
        </div>
        <div className="army-count">x{count}</div>
      </div>);
    });

    return <div className="player-area">{tokens}</div>;
  }
});

const GameBoard = React.createClass({
  render: function() {
    const gameState = this.props.gameState;

    const currentRace = gameState.currentPlayerId && gameState.players[gameState.currentPlayerId].race;
    const unplacedArmyColor = colorMap[currentRace];
    const isCurrentPlayer = this.props.clientState.playerId == gameState.currentPlayerId;

    const rows = gameState.tiles.map((tiles, row) => {
      const elements = tiles.map((tile, column) => {
        const style = {
          top: TILE_HEIGHT * row,
          left: TILE_WIDTH * column
        };

        var contents = "";
        if(tile.type === 'gold') {
          contents = (<div className='gold'>{tile.value}</div>);
        } else if(tile.type === 'army') {
          const tileRace = gameState.players[tile.playerId].race;
          const tileColor = colorMap[tileRace];
          const armyStyle = { backgroundColor: tileColor, color: textColorMap[tileRace] };
          if(tile.value) {
            contents = (<div className="army" style={armyStyle}>
              <p>{tile.value}</p>
            </div>);
          } else {
            contents = <div className="army" style={armyStyle}/>;
          }
        } else if(isCurrentPlayer && gameState.currentState == 'state-no-move') {
          const armyStyle = { backgroundColor: unplacedArmyColor, color: textColorMap[currentRace] };
          contents = <div className="army unplaced" style={armyStyle}/>;
        }

        const clickTile = isCurrentPlayer ?
          () => { this.props.selectTile(row, column); } : () => {} ;
        return <div onClick={clickTile} className='tile' style={style}>{contents}</div>;
      });
      return <div className='tileRow'>{elements}</div>;
    });

    const palisades = gameState.palisades;
    const palisadeDivs = gameState.tiles.map((tiles, row) => {
      return tiles.map((tile, column) => {
        const id = row * tiles.length + column;

        const getPalisade = (id, directionClassName, topOffset, leftOffset) => {
          if(palisades[id] === undefined) {
            return '';
          }

          const style = {
            top: TILE_HEIGHT * row + topOffset,
            left: TILE_WIDTH * column + leftOffset
          };

          if(palisades[id] === 1) {
            const className = 'palisade ' + directionClassName;
            return <div className={className} style={style}/>
          } else if(palisades[id] === 0 && isCurrentPlayer) {
            const className = 'palisade  unplaced ' + directionClassName;
            const place = () => { this.props.placePalisade(id); };
            return <div className={className} style={style} onClick={place}/>
          } else {
            return '';
          }
        };

        const rightPalisade = getPalisade(id + '-' + (id+1), 'vertical', 6, 96);
        const bottomPalisade = getPalisade(id + '-' + (id+8), 'horizontal', 96, 6);

        return <div>{rightPalisade, bottomPalisade}</div>;
      });
    });

    return <div className='board'>{rows}{palisadeDivs}</div>;
  }
});

const GameState = React.createClass({
  render: function() {
    const gameState = this.props.gameState;
    const clientState = this.props.clientState;
    const endTurnButton = clientState.playerId != gameState.currentPlayerId ? '' :
        (<button className="endTurn" onClick={this.props.endTurn}>End Turn</button>);
    return (<div className="controlBar">
      Current Player: {gameState.players[gameState.currentPlayerId].username}
      {endTurnButton}
    </div>);
  }
});

const PlayerSetup = React.createClass({
  getInitialState: function() {
    return {
      username: ''
    };
  },
  setName: function(event) {
    this.setState({
      username: event.target.value
    });
  },
  isNameValid: function() {
    return this.state.username != '' && this.state.username != null;
  },
  joinGame: function() {
    this.props.joinGameAsPlayer(this.state.username);
  },
  render() {
    const internal = this.renderInternal();
    return <div className="joinForm">{internal}</div>;
  },
  renderInternal: function() {
    const gameState = this.props.gameState;
    const clientState = this.props.clientState;

    if(clientState.username == null) {
      return (<div className="usernameField">
        <label htmlFor='name'>Player Name</label>
        <input maxLength="20" className="usernameField" name='name' value={this.state.username} onChange={this.setName}/>
        <hr className="usernameField"/>
        <button className="joinGame" onClick={this.joinGame} disabled={!this.isNameValid()}>Join</button>
      </div>);
    }

    const usedRaces = {};
    for(var playerId in gameState.players) {
      const player = gameState.players[playerId];
      usedRaces[player.race] = player.username;
    }

    const playerRace = gameState.players[clientState.playerId].race;
    const raceSelectors = gameState.playerSetup.availableRaces.map(race => {
      const tokenStyle = {
        backgroundColor: colorMap[race]
      };
      var className = 'race-selector';
      if(playerRace === race) {
        className += ' selected'
      }
      const onClickFn = usedRaces[race] ? null : () => this.props.setRace(race);
      const text = usedRaces[race] && usedRaces[race] != clientState.playerId ? race + '[' + usedRaces[race] + ']' : race;
      return (<div onClick={onClickFn} className={className} key={race}>
        <div className='army' style={tokenStyle}/>
        <p>{text}</p>
      </div>);
    });

    const readyButton = playerRace ? <button onClick={this.props.signalReady}>Ready</button> : '';
    const joinUrl = location.protocol + "//" + host + '/game/' + this.props.gameId;

    return (<div>
      <div>Name: {clientState.username}</div>
      {raceSelectors}
      {readyButton}
      <p>Other players can join by going to: <a target="_blank" href={joinUrl}>{joinUrl}</a></p>
    </div>);
  }
});

const GameOver = React.createClass({
  render() {
    return (<div>
      <p><b>Game Over</b></p>
      <p>Winner: {this.props.gameState.players[this.props.gameState.winner].username}</p>
      <p>{this.props.gameState.winner === this.props.clientState.playerId ?
        'Congrats!' : "You have failed your people"}</p>
    </div>);
  }
});

const GetTheGold = React.createClass({
  getInitialState() {
    const wsprotocol = location.protocol == 'https:' ? "wss" : "ws";
    let webSocket;

    const setupWebsocket = () => {
      webSocket = new WebSocket( wsprotocol + '://' + host + "/communication");

      webSocket.onopen = (event) => {
        getGameState((e, gameState) => this.setState({gameState: gameState, loading: false}));
      };

      webSocket.onmessage = (event) => {
        this.props.getGameState((e, gameState) => this.setState({gameState:gameState}));
      };

      webSocket.onclose = (event) => {
        console.log('Reloading websocket');
        setTimeout(setupWebsocket, 100);
      };
    };

    setupWebsocket();

    this.sendMessage = (type, value) => {
      webSocket.send(JSON.stringify({
        type: type,
        value: value
      }));
    };

    return {
      clientState: {
        selectedTokenSize: 1,
        playerId: this.props.playerId
      },
      loading: true,
      gameState: null
    };
  },
  render: function() {
    if(this.state.loading) {
      return (<div>Loading...</div>);
    }

    const gameState = this.state.gameState;
    const clientState = this.state.clientState;

    if(gameState.currentState === 'state-game-over') {
      return (<div>
        <GameOver gameState={gameState} clientState={clientState} />
        <GameBoard gameState={gameState} clientState={clientState} />
      </div>);
    }

    const signalReady = () => {
      this.sendMessage('signal-ready', {playerId: this.state.clientState.playerId});
    };

    if(gameState.currentState === 'state-prologue') {
      const joinGameAsPlayer = (username) => {
        this.sendMessage('join-game', {playerId: this.state.clientState.playerId, username: username});
        clientState.username = username;
        this.setState({
          clientState: clientState
        });
      };
      const setRace = (race) => {
        this.sendMessage('set-race', {playerId: clientState.playerId, race: race});
      };
      return <PlayerSetup gameState={gameState} clientState={clientState} gameId={this.props.gameId}
          joinGameAsPlayer={joinGameAsPlayer} setRace={setRace} signalReady={signalReady}/>;
    }

    const selectToken = (newToken) => {
      this.state.clientState.selectedTokenSize = newToken;
      this.setState(this.state);
    };

    const selectTile = (row, column) => {
      const value = {
        row: row,
        column: column,
        size: this.state.clientState.selectedTokenSize
      };
      this.sendMessage('select-tile', value);
    };

    const placePalisade = (palisadeId) => {
      const value = {
        palisadeId: palisadeId
      };
      this.sendMessage('place-palisade', value);
    };

    const endTurn = () => {
      this.sendMessage('end-turn');
    }

    return (<div>
      <GameState gameState={gameState} clientState={clientState} endTurn={endTurn}/>
      <GameBoard gameState={gameState} clientState={clientState}
          selectTile={selectTile} placePalisade={placePalisade}/>
      <Reserves gameState={gameState} clientState={clientState} selectToken={selectToken}/>
    </div>);
  }
});

const gameInforation = location.pathname.match(/\/game\/([^\/]+)\/([^\/]+)\/?$/);
const gameId = gameInforation[1];
const playerId = gameInforation[2];

function getGameState(callback) {
  const request = new XMLHttpRequest();
  request.open("GET", '/gameState/' + gameId + '/' + playerId, true);
  request.onload = function(e) {
    callback(null, JSON.parse(request.responseText));
  };
  request.onerror = function(e) {
    callback(e);
  };
  request.send();
}

ReactDom.render(<div>
  <div className="header"><div className="headerText">Get the Gold</div></div>
  <div className="body">
    <GetTheGold gameId={gameId} getGameState={getGameState} playerId={playerId}/>
  </div>
</div>, document.getElementById('content'));
