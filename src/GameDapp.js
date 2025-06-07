import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Divider,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  AppBar,
  Toolbar,
  Avatar,
  Chip
} from '@mui/material';
import { Casino, AccountCircle, SportsEsports } from '@mui/icons-material';

// Replace with your contract address and ABI
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const ABI = [
  // Minimal ABI for Snakes & Ladders (from your contract)
  "function initializeBoard(uint256 _gameId) external",
  "function playTurn(uint256 _gameId, uint256 _diceRoll) external returns (bool gameEnded, address winner)",
  "function gameBoards(uint256) view returns (address[] playerList, address currentPlayer, uint256 turnIndex, bool gameEnded, address winner)",
  "function players(uint256 _gameId, address _player) view returns (uint256 position, bool isActive)",
  "event GameStarted(uint256 indexed gameId, address indexed player1, address indexed player2)",
  "event GameEnded(uint256 indexed gameId, address indexed winner)"
];
const STAKE = ethers.parseEther("0.01");

const GAME_TYPES = ["Snakes & Ladders"];

const BOARD_SIZE = 10; // 10x10 board (100 cells)

function GameDapp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [activeGames, setActiveGames] = useState([]);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [playerState, setPlayerState] = useState({ position: 0, isActive: false });
  const [opponentState, setOpponentState] = useState({ position: 0, isActive: false });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [diceRoll, setDiceRoll] = useState(0);

  // Connect wallet and contract
  useEffect(() => {
    if (!window.ethereum) return;
    const init = async () => {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);
      try {
        const accounts = await prov.send("eth_requestAccounts", []);
        const sgn = await prov.getSigner();
        setSigner(sgn);
        setContract(new ethers.Contract(CONTRACT_ADDRESS, ABI, sgn));
        setAccount(accounts[0]);
      } catch (e) {
        setSnackbar({ open: true, message: "Failed to connect wallet: " + e.message, severity: "error" });
      }
    };
    init();
  }, []);

  // Fetch active games
  useEffect(() => {
    if (!contract) return;
    const fetchGames = async () => {
      // NOTE: Replace with your own logic to fetch active games
      // For demo, let's assume gameId 1 is active
      setActiveGames([{ id: 1, player1: account, player2: "0x..." }]);
    };
    fetchGames();
  }, [contract, account]);

  // Fetch game state
  useEffect(() => {
    if (!contract || !currentGameId) return;
    const fetchState = async () => {
      setLoading(true);
      try {
        // Fetch game board
        const board = await contract.gameBoards(currentGameId);
        // Fetch player state
        const player = await contract.players(currentGameId, account);
        setPlayerState(player);
        // Fetch opponent (simplified: assumes 2 players)
        const players = board.playerList;
        const opponentAddr = players[0] === account ? players[1] : players[0];
        const opponent = await contract.players(currentGameId, opponentAddr);
        setOpponentState(opponent);
        setGameState({
          currentPlayer: board.currentPlayer,
          turnIndex: board.turnIndex,
          gameEnded: board.gameEnded,
          winner: board.winner,
        });
      } catch (e) {
        setSnackbar({ open: true, message: "Failed to fetch game state: " + e.message, severity: "error" });
      }
      setLoading(false);
    };
    fetchState();
  }, [contract, currentGameId, account]);

  // Create a new game
  const createGame = async () => {
    setLoading(true);
    try {
      // NOTE: Replace with your contract's create game function if it exists
      // For demo, we'll just set the current game ID
      setCurrentGameId(1);
      setSnackbar({ open: true, message: "Game created!", severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: "Failed to create game: " + e.message, severity: "error" });
    }
    setLoading(false);
  };

  // Join a game
  const joinGame = async (gameId) => {
    setLoading(true);
    try {
      // NOTE: Replace with your contract's join game function if it exists
      // For demo, we'll just set the current game ID
      setCurrentGameId(gameId);
      setSnackbar({ open: true, message: "Joined game!", severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: "Failed to join game: " + e.message, severity: "error" });
    }
    setLoading(false);
  };

  // Roll dice and play turn
  const playTurn = async () => {
    if (!contract || !currentGameId) return;
    setLoading(true);
    try {
      // Roll dice (simulate for demo)
      const newDiceRoll = Math.floor(Math.random() * 6) + 1;
      setDiceRoll(newDiceRoll);
      // Play turn
      const tx = await contract.playTurn(currentGameId, newDiceRoll);
      await tx.wait();
      setSnackbar({ open: true, message: "Turn played!", severity: "success" });
      // Refresh state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      setSnackbar({ open: true, message: "Failed to play turn: " + e.message, severity: "error" });
    }
    setLoading(false);
  };

  // Render board cell
  const renderCell = (cellNumber) => {
    const isPlayer = playerState.position === cellNumber;
    const isOpponent = opponentState.position === cellNumber;
    return (
      <Paper
        elevation={isPlayer || isOpponent ? 6 : 2}
        sx={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isPlayer ? '#4caf50' : isOpponent ? '#f44336' : '#e0e0e0',
          color: isPlayer || isOpponent ? 'white' : 'black',
          borderRadius: 2,
          m: 0.5,
          position: 'relative',
        }}
      >
        {cellNumber}
        {isPlayer && (
          <Avatar sx={{ width: 20, height: 20, position: 'absolute', bottom: -10, right: -10, bgcolor: 'green' }}>
            <AccountCircle fontSize="small" />
          </Avatar>
        )}
        {isOpponent && (
          <Avatar sx={{ width: 20, height: 20, position: 'absolute', top: -10, left: -10, bgcolor: 'red' }}>
            <AccountCircle fontSize="small" />
          </Avatar>
        )}
      </Paper>
    );
  };

  // Render board
  const renderBoard = () => {
    const cells = [];
    for (let i = 1; i <= BOARD_SIZE * BOARD_SIZE; i++) {
      cells.push(renderCell(i));
    }
    return (
      <Grid container spacing={0} sx={{ width: 'fit-content', mx: 'auto', my: 3 }}>
        {cells.map((cell, idx) => (
          <Grid item key={idx}>{cell}</Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <SportsEsports sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Web3 1v1 Games
          </Typography>
          {account ? (
            <Chip
              avatar={<AccountCircle />}
              label={account.slice(0, 6) + "..." + account.slice(-4)}
              color="primary"
            />
          ) : (
            <Button color="inherit" onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>
              Connect Wallet
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {GAME_TYPES[0]}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Stake 0.01 token to play. Winner gets 0.019, deployer gets 0.001.
            </Typography>
            <Divider sx={{ my: 2 }} />
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {!currentGameId ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<Casino />}
                      onClick={createGame}
                      disabled={!account}
                      sx={{ mr: 2, mb: 2 }}
                    >
                      Create Game
                    </Button>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      Active Games
                    </Typography>
                    {activeGames.length === 0 ? (
                      <Typography color="text.secondary">No active games</Typography>
                    ) : (
                      activeGames.map((game) => (
                        <Box key={game.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography sx={{ flexGrow: 1 }}>
                            Game #{game.id} - {game.player1.slice(0, 6)}... vs {game.player2 === "0x..." ? "Waiting..." : game.player2.slice(0, 6) + "..."}
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={() => joinGame(game.id)}
                            disabled={!account || game.player1 === account}
                          >
                            Join
                          </Button>
                        </Box>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Game #{currentGameId}
                    </Typography>
                    <Typography>
                      Current turn: {gameState && gameState.currentPlayer === account ? "You" : "Opponent"}
                    </Typography>
                    <Typography>
                      Your position: {playerState.position}
                    </Typography>
                    <Typography>
                      Opponent position: {opponentState.position}
                    </Typography>
                    {gameState && gameState.gameEnded ? (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Game ended! Winner: {gameState.winner === account ? "You" : "Opponent"}
                      </Alert>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<Casino />}
                        onClick={playTurn}
                        disabled={!gameState || gameState.currentPlayer !== account || gameState.gameEnded}
                        sx={{ mt: 2 }}
                      >
                        Roll Dice & Play Turn
                      </Button>
                    )}
                    {renderBoard()}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default GameDapp;
