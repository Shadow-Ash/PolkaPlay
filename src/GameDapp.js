import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const ABI = [
  // Only essential ABI fragments
  "function createGame(uint8 _gameType) external payable",
  "function joinGame(uint256 _gameId) external payable",
  "function getActiveGames() external view returns (uint256[])",
  "function games(uint256) external view returns (uint256 id, uint8 gameType, address player1, address player2, address winner, uint8 state, uint256 createdAt, uint256 lastMoveTime, bytes32 gameData, uint256 nonce)",
  "function commitMove(uint256 _gameId, bytes32 _commitment) external",
  "function revealMove(uint256 _gameId, uint256 _move, uint256 _nonce) external",
];

const GAME_TYPES = ["Snakes & Ladders", "Ludo"];
const STAKE = ethers.parseEther("0.01");

export default function GameDapp() {
  const [provider, setProvider] = useState();
  const [signer, setSigner] = useState();
  const [contract, setContract] = useState();
  const [games, setGames] = useState([]);
  const [account, setAccount] = useState("");
  const [selectedGame, setSelectedGame] = useState(0);
  const [move, setMove] = useState("");
  const [nonce, setNonce] = useState("");
  const [commitment, setCommitment] = useState("");
  const [gameId, setGameId] = useState("");
  const [status, setStatus] = useState("");

  // Connect wallet and contract
  useEffect(() => {
    if (!window.ethereum) return;
    const prov = new ethers.BrowserProvider(window.ethereum);
    setProvider(prov);
    prov.send("eth_requestAccounts", []).then(() => {
      prov.getSigner().then((sgn) => {
        setSigner(sgn);
        setContract(new ethers.Contract(CONTRACT_ADDRESS, ABI, sgn));
        sgn.getAddress().then(setAccount);
      });
    });
  }, []);

  // Load active games
  useEffect(() => {
    if (!contract) return;
    contract.getActiveGames().then(async (ids) => {
      const details = await Promise.all(
        ids.map((id) => contract.games(id))
      );
      setGames(details);
    });
  }, [contract, status]);

  // Create game
  const handleCreate = async () => {
    setStatus("Creating game...");
    try {
      const tx = await contract.createGame(selectedGame, { value: STAKE });
      await tx.wait();
      setStatus("Game created!");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  // Join game
  const handleJoin = async (id) => {
    setStatus("Joining game...");
    try {
      const tx = await contract.joinGame(id, { value: STAKE });
      await tx.wait();
      setStatus("Joined game!");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  // Commit move (hash of move, nonce, and your address)
  const handleCommit = async () => {
    if (!move || !nonce || !gameId) return setStatus("Fill all fields");
    setStatus("Committing move...");
    try {
      const hash = ethers.keccak256(
        ethers.toUtf8Bytes(move + nonce + account)
      );
      setCommitment(hash);
      const tx = await contract.commitMove(gameId, hash);
      await tx.wait();
      setStatus("Move committed!");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  // Reveal move
  const handleReveal = async () => {
    setStatus("Revealing move...");
    try {
      const tx = await contract.revealMove(gameId, move, nonce);
      await tx.wait();
      setStatus("Move revealed!");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 24 }}>
      <h2>Web3 1v1 Games (Snakes & Ladders / Ludo)</h2>
      <div>
        <b>Connected as:</b> {account}
      </div>
      <hr />
      <div>
        <h3>Create Game</h3>
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(Number(e.target.value))}
        >
          {GAME_TYPES.map((g, i) => (
            <option value={i} key={i}>{g}</option>
          ))}
        </select>
        <button onClick={handleCreate}>Create (Stake 0.01 token)</button>
      </div>
      <hr />
      <div>
        <h3>Active Games</h3>
        <ul>
          {games.map((g, i) => (
            <li key={i}>
              Game #{g.id.toString()} ({GAME_TYPES[g.gameType]}) - Player1: {g.player1} Player2: {g.player2 === ethers.ZeroAddress ? "Waiting..." : g.player2}
              {g.player2 === ethers.ZeroAddress && g.player1 !== account && (
                <button onClick={() => handleJoin(g.id)}>Join</button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <hr />
      <div>
        <h3>Commit & Reveal Move</h3>
        <input
          placeholder="Game ID"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        />
        <input
          placeholder="Move (e.g. dice roll)"
          value={move}
          onChange={(e) => setMove(e.target.value)}
        />
        <input
          placeholder="Nonce (secret random number)"
          value={nonce}
          onChange={(e) => setNonce(e.target.value)}
        />
        <button onClick={handleCommit}>Commit Move</button>
        <button onClick={handleReveal}>Reveal Move</button>
        <div>
          <small>Commitment hash: {commitment}</small>
        </div>
      </div>
      <hr />
      <div>
        <b>Status:</b> {status}
      </div>
      <div style={{ marginTop: 32, color: "#888" }}>
        <small>
          Still in Development Phase - This is a basic prototype for a demo.
        </small>
      </div>
    </div>
  );
}
