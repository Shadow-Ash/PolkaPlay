// constants/contract.js
export const CONTRACT_ADDRESS = "0x742d35Cc7bC6dA10c2a8B6A2A1FBF5Cb"; // Replace with your deployed contract address

export const CONTRACT_ABI = [
  "function createGame(uint8 _gameType) external payable",
  "function joinGame(uint256 _gameId) external payable",
  "function commitMove(uint256 _gameId, bytes32 _commitment) external",
  "function revealMove(uint256 _gameId, uint256 _move, uint256 _nonce) external",
  "function expireGame(uint256 _gameId) external",
  "function getGame(uint256 _gameId) external view returns (tuple(uint256 id, uint8 gameType, address player1, address player2, address winner, uint8 state, uint256 createdAt, uint256 lastMoveTime, bytes32 gameData, uint256 nonce))",
  "function getActiveGames() external view returns (uint256[])",
  "function gameCounter() external view returns (uint256)",
  "event GameCreated(uint256 indexed gameId, uint8 gameType, address indexed player1)",
  "event PlayerJoined(uint256 indexed gameId, address indexed player2)",
  "event GameFinished(uint256 indexed gameId, address indexed winner)",
  "event GameExpired(uint256 indexed gameId)"
];
