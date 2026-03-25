import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_SPEED = 5;
const SPAWN_RATE = 0.015;

interface GameObject {
  id: number;
  x: number;
  type: string;
}

const App: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('dinoHighScore') || '0');
    } catch {
      return 0;
    }
  });

  // Use Refs for physics to avoid re-render loops
  const [yPos, setYPos] = useState(0); // This state is for rendering, physics done via ref
  const velocityRef = useRef(0);
  const yPosRef = useRef(0);
  const scoreRef = useRef(0);
  const [obstacles, setObstacles] = useState<GameObject[]>([]);
  const [clouds, setClouds] = useState<GameObject[]>([]);
  const requestRef = useRef<number | null>(null);

  const restartGame = useCallback(() => {
    setObstacles([]);
    setClouds([]);
    yPosRef.current = 0;
    setYPos(0);
    velocityRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
  }, []);

  const jump = useCallback(() => {
    if (!gameStarted) {
      restartGame();
      return;
    }
    if (yPosRef.current === 0 && !gameOver) {
      velocityRef.current = JUMP_FORCE;
    }
  }, [gameStarted, gameOver, restartGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') jump();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const update = useCallback(() => {
    if (!gameStarted || gameOver) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // 1. Gravity Physics
    velocityRef.current += GRAVITY;
    yPosRef.current += velocityRef.current;

    if (yPosRef.current > 0) {
      yPosRef.current = 0;
      velocityRef.current = 0;
    }
    setYPos(yPosRef.current);

    // 2. Obstacles & Collision
    setObstacles((prev) => {
      const speed = GROUND_SPEED + scoreRef.current / 1000;
      const newObs = prev
        .map((o) => ({ ...o, x: o.x - speed }))
        .filter((o) => o.x > -50);

      for (const o of newObs) {
        if (o.x > 40 && o.x < 80 && yPosRef.current > -40) {
          setGameOver(true);
        }
      }

      if (Math.random() < SPAWN_RATE) {
        newObs.push({ id: Math.random(), x: 800, type: Math.random() > 0.5 ? '🌵' : '🔥' });
      }
      return newObs;
    });

    // 3. Clouds
    setClouds((prev) => {
      const newClouds = prev.map((c) => ({ ...c, x: c.x - 1 })).filter((c) => c.x > -100);
      if (Math.random() < 0.005) {
        newClouds.push({ id: Math.random(), x: 800, type: '☁️' });
      }
      return newClouds;
    });

    scoreRef.current += 1;
    setScore(Math.floor(scoreRef.current / 10));

    requestRef.current = requestAnimationFrame(update);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameStarted, gameOver, update]);

  useEffect(() => {
    if (gameOver) {
      const finalScore = Math.floor(scoreRef.current / 10);
      try {
        const storedHighScore = parseInt(localStorage.getItem('dinoHighScore') || '0');
        if (finalScore > storedHighScore) {
          setHighScore(finalScore);
          localStorage.setItem('dinoHighScore', finalScore.toString());
        }
      } catch {
        // Handle blocked localStorage
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [gameOver]);

  return (
    <div id="game-container" onClick={jump} style={{ cursor: 'pointer' }}>
      <div className="score-board">
        HI: {highScore.toString().padStart(5, '0')} <br />
        Score: {score.toString().padStart(5, '0')}
      </div>

      <div className="dino" style={{ transform: `translateY(${yPos}px)`, left: '50px' }}>
        {gameOver ? '😵' : yPos < 0 ? '🦖' : score % 2 === 0 ? '🦖' : '🦕'}
      </div>

      {obstacles.map((o) => (
        <div key={o.id} className="obstacle" style={{ left: `${o.x}px` }}>{o.type}</div>
      ))}

      {clouds.map((c) => (
        <div key={c.id} className="cloud" style={{ left: `${c.x}px` }}>{c.type}</div>
      ))}

      {!gameStarted && (
        <div className="game-over">
          <h1 style={{ color: '#535353' }}>SUPER DINO</h1>
          <p>Click or Press Space to Start</p>
        </div>
      )}

      {gameOver && (
        <div className="game-over">
          <h1 style={{ color: '#535353' }}>GAME OVER</h1>
          <button onClick={(e) => { e.stopPropagation(); restartGame(); }}>RETRY</button>
        </div>
      )}
    </div>
  );
};

export default App;