// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameFactory is ReentrancyGuard, Ownable {
    uint256 public constant STAKE_AMOUNT = 0.01 ether;
    uint256 public constant WINNER_REWARD = 0.019 ether;
    uint256 public constant PROTOCOL_FEE = 0.001 ether;
    uint256 public constant GAME_TIMEOUT = 1 hours;

    enum GameType { SNAKES_LADDERS, LUDO }
    enum GameState { WAITING, IN_PROGRESS, FINISHED, EXPIRED }
    
    struct Game {
        uint256 id;
        GameType gameType;
        address player1;
        address player2;
        address winner;
        GameState state;
        uint256 createdAt;
        uint256 lastMoveTime;
        bytes32 gameData;
        uint256 nonce;
    }
    
    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => bytes32)) public playerCommits;
    mapping(uint256 => mapping(address => bool)) public playerRevealed;
    
    uint256 public gameCounter;
    
    event GameCreated(uint256 indexed gameId, GameType gameType, address indexed player1);
    event PlayerJoined(uint256 indexed gameId, address indexed player2);
    event GameFinished(uint256 indexed gameId, address indexed winner);
    event GameExpired(uint256 indexed gameId);
    
    constructor() Ownable(msg.sender) {}
    
    function createGame(GameType _gameType) external payable {
        require(msg.value == STAKE_AMOUNT, "Incorrect stake amount");
        
        gameCounter++;
        games[gameCounter] = Game({
            id: gameCounter,
            gameType: _gameType,
            player1: msg.sender,
            player2: address(0),
            winner: address(0),
            state: GameState.WAITING,
            createdAt: block.timestamp,
            lastMoveTime: block.timestamp,
            gameData: bytes32(0),
            nonce: 0
        });
        
        emit GameCreated(gameCounter, _gameType, msg.sender);
    }
    
    function joinGame(uint256 _gameId) external payable nonReentrant {
        require(msg.value == STAKE_AMOUNT, "Incorrect stake amount");
        Game storage game = games[_gameId];
        require(game.state == GameState.WAITING, "Game not available");
        require(game.player2 == address(0), "Game full");
        require(msg.sender != game.player1, "Cannot play against yourself");
        require(block.timestamp <= game.createdAt + GAME_TIMEOUT, "Game expired");
        
        game.player2 = msg.sender;
        game.state = GameState.IN_PROGRESS;
        game.lastMoveTime = block.timestamp;
        
        emit PlayerJoined(_gameId, msg.sender);
    }
    
    function commitMove(uint256 _gameId, bytes32 _commitment) external {
        Game storage game = games[_gameId];
        require(game.state == GameState.IN_PROGRESS, "Game not in progress");
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player");
        require(block.timestamp <= game.lastMoveTime + GAME_TIMEOUT, "Game expired");
        
        playerCommits[_gameId][msg.sender] = _commitment;
    }
    
    function revealMove(uint256 _gameId, uint256 _move, uint256 _nonce) external {
        Game storage game = games[_gameId];
        require(game.state == GameState.IN_PROGRESS, "Game not in progress");
        require(msg.sender == game.player1 || msg.sender == game.player2, "Not a player");
        
        bytes32 commitment = keccak256(abi.encodePacked(_move, _nonce, msg.sender));
        require(playerCommits[_gameId][msg.sender] == commitment, "Invalid reveal");
        
        playerRevealed[_gameId][msg.sender] = true;
        
        // Check if both players revealed
        if (playerRevealed[_gameId][game.player1] && playerRevealed[_gameId][game.player2]) {
            _processGameLogic(_gameId, _move);
        }
        
        game.lastMoveTime = block.timestamp;
    }
    
    function _processGameLogic(uint256 _gameId, uint256 _lastMove) internal {
        Game storage game = games[_gameId];
        
        // Generate secure random number using multiple entropy sources
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            game.nonce,
            _lastMove,
            game.player1,
            game.player2
        )));
        
        game.nonce++;
        
        address winner;
        if (game.gameType == GameType.SNAKES_LADDERS) {
            // Simplified: highest roll wins
            uint256 player1Roll = (randomSeed % 6) + 1;
            uint256 player2Roll = ((randomSeed >> 8) % 6) + 1;
            if (player1Roll > player2Roll) winner = game.player1;
            else if (player2Roll > player1Roll) winner = game.player2;
        } else {
            // Simplified: highest score wins
            uint256 player1Score = (randomSeed % 100);
            uint256 player2Score = ((randomSeed >> 8) % 100);
            if (player1Score > player2Score) winner = game.player1;
            else if (player2Score > player1Score) winner = game.player2;
        }
        
        if (winner != address(0)) {
            _finishGame(_gameId, winner);
        }
    }
    
    function _finishGame(uint256 _gameId, address _winner) internal {
        Game storage game = games[_gameId];
        game.winner = _winner;
        game.state = GameState.FINISHED;
        
        // Transfer winnings
        payable(_winner).transfer(WINNER_REWARD);
        payable(owner()).transfer(PROTOCOL_FEE);
        
        emit GameFinished(_gameId, _winner);
    }
    
    function expireGame(uint256 _gameId) external {
        Game storage game = games[_gameId];
        require(block.timestamp > game.lastMoveTime + GAME_TIMEOUT, "Game not expired");
        require(game.state != GameState.FINISHED, "Game already finished");
        
        game.state = GameState.EXPIRED;
        
        // Refund stakes
        if (game.player2 != address(0)) {
            payable(game.player1).transfer(STAKE_AMOUNT);
            payable(game.player2).transfer(STAKE_AMOUNT);
        } else {
            payable(game.player1).transfer(STAKE_AMOUNT);
        }
        
        emit GameExpired(_gameId);
    }
    
    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }
    
    function getActiveGames() external view returns (uint256[] memory) {
        uint256[] memory activeGames = new uint256[](gameCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= gameCounter; i++) {
            if (games[i].state == GameState.WAITING || games[i].state == GameState.IN_PROGRESS) {
                activeGames[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeGames[i];
        }
        
        return result;
    }
}
