// components/GameFactory.js
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../constants/contract';

const GameFactory = () => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameType, setGameType] = useState(0); // 0: Snakes & Ladders, 1: Ludo
  const [loading, setLoading] = useState(false);
  const [playerCommit, setPlayerCommit] = useState('');
  const [playerMove, setPlayerMove] = useState('');
  const [playerNonce, setPlayerNonce] = useState('');

  useEffect(() => {
    initializeContract();
    loadActiveGames();
  }, []);

  const initializeContract = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        
        const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(gameContract);
      } catch (error) {
        console.error('Error connecting to wallet:', error);
      }
    }
  };

  const loadActiveGames = async () => {
    if (!contract) return;
    try {
      const activeGameIds = await contract.getActiveGames();
      const gamePromises = activeGameIds.map(id => contract.getGame(id));
      const gameResults = await Promise.all(gamePromises);
      setGames(gameResults);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const createGame = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.createGame(gameType, {
        value: ethers.parseEther('0.01')
      });
      await tx.wait();
      await loadActiveGames();
    } catch (error) {
      console.error('Error creating game:', error);
    }
    setLoading(false);
  };

  const joinGame = async (gameId) => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.joinGame(gameId, {
        value: ethers.parseEther('0.01')
      });
      await tx.wait();
      await loadActiveGames();
    } catch (error) {
      console.error('Error joining game:', error);
    }
    setLoading(false);
  };

  const generateCommitment = () => {
    const move = Math.floor(Math.random() * 100) + 1;
    const nonce = Math.floor(Math.random() * 1000000);
    const commitment = ethers.keccak256(
      ethers.solidityPacked(['uint256', 'uint256', 'address'], [move, nonce, account])
    );
    
    setPlayerMove(move.toString());
    setPlayerNonce(nonce.toString());
    setPlayerCommit(commitment);
    
    return { move, nonce, commitment };
  };

  const commitMove = async (gameId) => {
    if (!contract) return;
    const { commitment } = generateCommitment();
    
    setLoading(true);
    try {
      const tx = await contract.commitMove(gameId, commitment);
      await tx.wait();
      console.log('Move committed successfully');
    } catch (error) {
      console.error('Error committing move:', error);
    }
    setLoading(false);
  };

  const revealMove = async (gameId) => {
    if (!contract || !playerMove || !playerNonce) return;
    
    setLoading(true);
    try {
      const tx = await contract.revealMove(gameId, playerMove, playerNonce);
      await tx.wait();
      await loadActiveGames();
      console.log('Move revealed successfully');
    } catch (error) {
      console.error('Error revealing move:', error);
    }
    setLoading(false);
  };

  const expireGame = async (gameId) => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.expireGame(gameId);
      await tx.wait();
      await loadActiveGames();
    } catch (error) {
      console.error('Error expiring game:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Web3 Gaming Arena
          </h1>
          <p className="text-xl text-gray-300">Stake • Play • Win on PolkaVM</p>
          {account && (
            <p className="mt-4 text-sm text-gray-400">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </p>
          )}
        </header>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold mb-4">Create New Game</h2>
            <div className="space-y-4">
              <select 
                value={gameType} 
                onChange={(e) => setGameType(Number(e.target.value))}
                className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white"
              >
                <option value={0}>Snakes & Ladders</option>
                <option value={1}>Ludo</option>
              </select>
              <button 
                onClick={createGame}
                disabled={loading || !contract}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition-all"
              >
                {loading ? 'Creating...' : 'Create Game (0.01 ETH)'}
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-semibold mb-4">Game Statistics</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Stake Amount:</span>
                <span className="font-semibold">0.01 ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Winner Reward:</span>
                <span className="font-semibold text-green-400">0.019 ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Protocol Fee:</span>
                <span className="font-semibold">0.001 ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Active Games:</span>
                <span className="font-semibold">{games.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-semibold mb-6">Active Games</h2>
          {games.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No active games. Create one to get started!</p>
          ) : (
            <div className="grid gap-4">
              {games.map((game, index) => (
                <div key={index} className="bg-white/20 rounded-lg p-4 border border-white/30">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Game #{game.id.toString()} - {game.gameType === 0 ? 'Snakes & Ladders' : 'Ludo'}
                      </h3>
                      <p className="text-sm text-gray-300">
                        Status: {['Waiting', 'In Progress', 'Finished', 'Expired'][game.state]}
                      </p>
                      <p className="text-sm text-gray-300">
                        Player 1: {game.player1.slice(0, 6)}...{game.player1.slice(-4)}
                      </p>
                      {game.player2 !== '0x0000000000000000000000000000000000000000' && (
                        <p className="text-sm text-gray-300">
                          Player 2: {game.player2.slice(0, 6)}...{game.player2.slice(-4)}
                        </p>
                      )}
                      {game.winner !== '0x0000000000000000000000000000000000000000' && (
                        <p className="text-sm text-green-400">
                          Winner: {game.winner.slice(0, 6)}...{game.winner.slice(-4)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {game.state === 0 && game.player1 !== account && (
                        <button 
                          onClick={() => joinGame(game.id)}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-semibold transition-all"
                        >
                          Join Game
                        </button>
                      )}
                      {game.state === 1 && (game.player1 === account || game.player2 === account) && (
                        <>
                          <button 
                            onClick={() => commitMove(game.id)}
                            disabled={loading}
                            className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 px-4 py-2 rounded font-semibold transition-all"
                          >
                            Commit Move
                          </button>
                          <button 
                            onClick={() => revealMove(game.id)}
                            disabled={loading || !playerMove}
                            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded font-semibold transition-all"
                          >
                            Reveal Move
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => expireGame(game.id)}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded text-xs font-semibold transition-all"
                      >
                        Expire Game
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameFactory;
