import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import characterImgSrc from './assets/sprites/yjh.png';
import backgroundImgSrc from './assets/sprites/bg1.png';

// audios
import homeBgMusic from './assets/sounds/uchi.mp3';
import gameBgMusic from './assets/sounds/gamewa.mp3';
import buttonClickSound from './assets/sounds/clickfr.mp3';
import jumpSound from './assets/sounds/jump.mp3';

// Window Frame Component - Only borders remain
const WindowFrame = () => {
  return (
    <div className="window-frame">
      <div className="window-title">do a flip yjh</div>
      <div className="window-controls">
        <button 
          className="window-minimize"
          onClick={() => window.electronAPI?.minimize()}
        ></button>
        <button 
          className="window-maximize"
          onClick={() => window.electronAPI?.maximize()}
        ></button>
        <button 
          className="window-close"
          onClick={() => window.electronAPI?.close()}
        ></button>
      </div>
    </div>
  );
};

function App() {
  const [screen, setScreen] = useState('home');
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState(() => {
    const saved = localStorage.getItem('flappyHighScores');
    return saved ? JSON.parse(saved) : [];
  });
  const [isMuted, setIsMuted] = useState(false);
  
  // music refs
  const audioRefs = {
    homeBg: useRef(null),
    gameBg: useRef(null),
    buttonClick: useRef(null),
    jump: useRef(null)
  };

  // music logic
  useEffect(() => {
    // stop bg music tracks
    [audioRefs.homeBg, audioRefs.gameBg].forEach(ref => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    });
    
    if (isMuted) return;
    
    // music assignment
    if (screen === 'home' || screen === 'data' || screen === 'instructions') {
      if (audioRefs.homeBg.current) {
        audioRefs.homeBg.current.volume = 1;
        audioRefs.homeBg.current.loop = true;
        audioRefs.homeBg.current.play();
      }
    } else if (screen === 'game') {
      if (audioRefs.gameBg.current) {
        audioRefs.gameBg.current.volume = 0.6;
        audioRefs.gameBg.current.loop = true;
        audioRefs.gameBg.current.play();
      }
    }
  }, [screen, isMuted]);

  const playSound = (sound) => {
    if (isMuted) return;
    if (audioRefs[sound].current) {
      audioRefs[sound].current.currentTime = 0;
      audioRefs[sound].current.play();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const addScore = (newScore) => {
    const updatedScores = [...highScores, { score: newScore, date: new Date().toLocaleDateString() }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    setHighScores(updatedScores);
    localStorage.setItem('flappyHighScores', JSON.stringify(updatedScores));
  };

  return (
    <div className="app">
      <WindowFrame />
      
      <audio ref={audioRefs.homeBg} src={homeBgMusic} preload="auto" />
      <audio ref={audioRefs.gameBg} src={gameBgMusic} preload="auto" />
      <audio ref={audioRefs.buttonClick} src={buttonClickSound} preload="auto" />
      <audio ref={audioRefs.jump} src={jumpSound} preload="auto" />
      
      {screen === 'home' && (
        <HomeScreen 
          onStart={() => {
            setScreen('game');
            setGameActive(true);
          }} 
          onShowData={() => setScreen('data')}
          onShowInstructions={() => setScreen('instructions')}
          playSound={() => playSound('buttonClick')}
          isMuted={isMuted}
          toggleMute={toggleMute}
        />
      )}
      
      {screen === 'game' && (
        <GameScreen 
          gameActive={gameActive} 
          setGameActive={setGameActive}
          setScreen={setScreen}
          setScore={setScore}
          addScore={addScore}
          playSound={playSound}
        />
      )}
      
      {screen === 'instructions' && (
        <InstructionsScreen 
          onBack={() => setScreen('home')} 
          playSound={() => playSound('buttonClick')}
        />
      )}
      
      {screen === 'data' && (
        <DataScreen 
          highScores={highScores} 
          recentScore={score} 
          onBack={() => setScreen('home')} 
          playSound={() => playSound('buttonClick')}
        />
      )}
    </div>
  );
}

// homescreen
function HomeScreen({ onStart, onShowData, onShowInstructions, playSound, isMuted, toggleMute }) {
  return (
    <div className="screen home-screen">
      <button 
        className={`mute-button ${isMuted ? 'muted' : ''}`}
        onClick={() => {
          playSound();
          toggleMute();
        }}
      ></button>
      
      <div className='Panel1'>
        <div 
          className="character-preview" 
        ></div>
        <div className="menu-buttons">
          <button 
            className="start-button" 
            onClick={() => {
              playSound();
              onStart();
            }}
          ></button>
          <button  
            className="data-button" 
            onClick={() => {
              playSound();
              onShowData();
            }}
          ></button>
          <button  
            className="info-button" 
            onClick={() => {
              playSound();
              onShowInstructions();
            }}
          ></button>
        </div>
      </div>  
    </div>
  );
}

// game screen main
function GameScreen({ gameActive, setGameActive, setScreen, setScore, addScore, playSound }) {
  const canvasRef = useRef(null);
  const gameOverRef = useRef(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const gameRef = useRef({
    ball: { x: 100, y: 250, radius: 20, velocity: 0 },
    pipes: [],
    score: 0,
    gravity: 0.2,
    jumpForce: -5.5,
    pipeSpeed: 2,
    pipeGap: 180,
    pipeWidth: 80,
    frameCount: 0,
    pipeInterval: 180,
    lastTimestamp: 0,
    animationId: null
  });

  // animation state for circle
  const burstAnimations = useRef([]);
  
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const characterImg = useRef(new Image());
  const backgroundImg = useRef(new Image());

  // images
  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) setImagesLoaded(true);
    };

    characterImg.current.src = characterImgSrc;
    characterImg.current.onload = checkLoaded;

    backgroundImg.current.src = backgroundImgSrc;
    backgroundImg.current.onload = checkLoaded;
  }, []);

  const drawBackground = (ctx) => {
    ctx.drawImage(backgroundImg.current, 0, 0, 600, 500);
  };

  const drawGround = (ctx) => {
    ctx.fillStyle = '#462e02ff';
    ctx.fillRect(0, 480, 600, 20);
  };

  const drawBall = (ctx, ball) => {
    ctx.drawImage(characterImg.current, ball.x - ball.radius, ball.y - ball.radius, ball.radius * 3.5, ball.radius * 3.5);
  };

  //  draw burst animation
  const drawBurst = (ctx, burst) => {
    ctx.save();
    
    // glow effect
    const gradient = ctx.createRadialGradient(
      burst.x, burst.y, burst.radius * 0.5,
      burst.x, burst.y, burst.radius
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${burst.alpha * 0.8})`);
    gradient.addColorStop(0.7, `rgba(200, 230, 255, ${burst.alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(150, 200, 255, 0)`);
    
    // glow
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // hollow circle
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${burst.alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.restore();
  };

  const drawPipe = (ctx, pipe) => {
    const pillarColor = '#2c2c2c';
    const highlightColor = '#3d3d3d';
    const baseColor = '#1a1a1a';
    const capitalColor = '#4a4a4a';
    
    // pillars
    //  base
    ctx.fillStyle = baseColor;
    ctx.fillRect(pipe.x - 5, pipe.topHeight - 15, pipe.width + 10, 15);
    
    // shaft 
    ctx.fillStyle = pillarColor;
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight - 15);
    
    // lines
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 2;
    const fluteCount = 5;
    const fluteWidth = pipe.width / (fluteCount + 1);
    for (let i = 1; i <= fluteCount; i++) {
      const fluteX = pipe.x + i * fluteWidth;
      ctx.beginPath();
      ctx.moveTo(fluteX, 0);
      ctx.lineTo(fluteX, pipe.topHeight - 15);
      ctx.stroke();
    }
    
    // Pillar capital 1
    ctx.fillStyle = capitalColor;
    ctx.fillRect(pipe.x - 8, 0, pipe.width + 16, 20); // Abacus
    ctx.fillRect(pipe.x - 5, 20, pipe.width + 10, 10); // Echinus
    
    // bottom pipe 
    const bottomY = pipe.topHeight + pipe.gap;
    
    // Pillar capital 2
    ctx.fillStyle = capitalColor;
    ctx.fillRect(pipe.x - 8, bottomY, pipe.width + 16, 20); // Abacus
    ctx.fillRect(pipe.x - 5, bottomY + 20, pipe.width + 10, 10); // Echinus
    
    // pillar shaft
    ctx.fillStyle = pillarColor;
    ctx.fillRect(pipe.x, bottomY + 30, pipe.width, 500 - bottomY - 45);
    
    // pillar design
    for (let i = 1; i <= fluteCount; i++) {
      const fluteX = pipe.x + i * fluteWidth;
      ctx.beginPath();
      ctx.moveTo(fluteX, bottomY + 30);
      ctx.lineTo(fluteX, 500);
      ctx.stroke();
    }
    
    // pillar base
    ctx.fillStyle = baseColor;
    ctx.fillRect(pipe.x - 5, 500 - 15, pipe.width + 10, 15);
  };
  
  const drawScore = (ctx, score) => {
    ctx.font = 'bold 36px "Press Start 2P", cursive';
    ctx.fillStyle = '#59d5ffff';
    ctx.strokeStyle = '#086d8eff';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(score, 300, 60);
    ctx.fillText(score, 300, 60);
  };

  const checkCollision = (ball, pipe) => {
    if (
      ball.x + ball.radius > pipe.x && 
      ball.x - ball.radius < pipe.x + pipe.width &&
      ball.y - ball.radius < pipe.topHeight
    ) return true;
    
    if (
      ball.x + ball.radius > pipe.x && 
      ball.x - ball.radius < pipe.x + pipe.width &&
      ball.y + ball.radius > pipe.topHeight + pipe.gap
    ) return true;

    return false;
  };

  const resetGame = () => {
    const game = gameRef.current;
    game.ball = { x: 100, y: 250, radius: 20, velocity: 0 };
    game.pipes = [];
    game.score = 0;
    game.frameCount = 0;
    setScore(0);
    gameOverRef.current = false;
    setGameActive(true);
    setShowGameOver(false);
    
    // reset overlay
    burstAnimations.current = [];
  };

  const handleJump = () => {
    const game = gameRef.current;
    if (gameOverRef.current) return;
    game.ball.velocity = game.jumpForce;
    playSound('jump');
    
    
    burstAnimations.current.push({
      x: game.ball.x+ 10,
      y: game.ball.y - 30, // burst height
      radius: 10,
      alpha: 0.8,
      startTime: performance.now(),
      duration: 400 
    });
  };

  const handleKeyDown = (e) => {
    if (e.code === 'Space') {
      handleJump();
    }
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // eslint-disable-next-line no-unused-vars
    const x = e.clientX - rect.left;
    // eslint-disable-next-line no-unused-vars
    const y = e.clientY - rect.top;
    
    if (gameOverRef.current) {
      return;
    }
    
    handleJump();
  };

  // loop after load
  useEffect(() => {
    if (!imagesLoaded) return;

    const game = gameRef.current;
    const canvas = canvasRef.current;

    const updateGame = (timestamp) => {
      const ctx = canvas.getContext('2d');
      const deltaTime = timestamp - game.lastTimestamp;
      game.lastTimestamp = timestamp;

      // update anim
      const now = performance.now();
      for (let i = burstAnimations.current.length - 1; i >= 0; i--) {
        const burst = burstAnimations.current[i];
        const elapsed = now - burst.startTime;
        const progress = Math.min(elapsed / burst.duration, 1);
        
        // update props
        burst.radius = 10 + 40 * progress; // Expand from 10 to 50
        burst.alpha = 0.8 * (1 - progress); // Fade out
        
        // clean
        if (progress >= 1) {
          burstAnimations.current.splice(i, 1);
        }
      }

      if (gameActive && !gameOverRef.current) {
        game.ball.velocity += game.gravity;
        game.ball.y += game.ball.velocity;

        game.pipes.forEach(pipe => {
          pipe.x -= game.pipeSpeed * (deltaTime / 16);
          if (!pipe.passed && pipe.x + game.pipeWidth < game.ball.x) {
            pipe.passed = true;
            game.score += 1;
            setScore(game.score);
          }
        });

        game.pipes = game.pipes.filter(pipe => pipe.x + pipe.width > 0);

        game.frameCount++;
        if (game.frameCount % game.pipeInterval === 0) {
          const topHeight = Math.floor(Math.random() * 200) + 50;
          game.pipes.push({
            x: canvas.width,
            topHeight,
            gap: game.pipeGap,
            width: game.pipeWidth,
            passed: false
          });
        }

        let collision = false;
        if (game.ball.y + game.ball.radius > 500 || game.ball.y - game.ball.radius < 0) collision = true;
        game.pipes.forEach(pipe => { if (checkCollision(game.ball, pipe)) collision = true; });

        if (collision && !gameOverRef.current) {
          gameOverRef.current = true;
          setGameActive(false);
          addScore(game.score);
          setShowGameOver(true);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground(ctx);
      drawGround(ctx);
      game.pipes.forEach(pipe => drawPipe(ctx, pipe));
      
      // burst animation
      burstAnimations.current.forEach(burst => drawBurst(ctx, burst));
      
      drawBall(ctx, game.ball);
      drawScore(ctx, game.score);

      game.animationId = requestAnimationFrame(updateGame);
    };

    game.lastTimestamp = performance.now();
    game.animationId = requestAnimationFrame(updateGame);

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(game.animationId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [imagesLoaded, gameActive]);

  return (
    <div className="game-screen">
      <canvas 
        ref={canvasRef} 
        width="600" 
        height="500" 
      />
      
      {showGameOver && (
        <GameOverPopup 
          score={gameRef.current.score}
          onRetry={resetGame}
          onMenu={() => setScreen('home')}
          playSound={playSound}
        />
      )}
    </div>
  );
}

// game over popup
function GameOverPopup({ onRetry, onMenu, playSound }) {
  return (
    <div className="game-over-popup">
      <div className="popup-content">
        <div className="popup-buttons">
          <button 
            className="retrybtn-go" 
            onClick={() => {
              playSound('buttonClick');
              onRetry();
            }}
          ></button>
          <button 
            className="menubtn-go" 
            onClick={() => {
              playSound('buttonClick');
              onMenu();
            }}
          ></button>
        </div>
      </div>
    </div>
  );
}

// info
function InstructionsScreen({ onBack, playSound }) {
  return (
    <div className="screen instructions-screen">
      <div className='info-content'>
        <div className="Panel2">
          <button 
            className="x-info"
            onClick={() => {
              playSound();
              onBack();
            }}
          ></button>
          <div className='panelimg'></div>
          <div className='infos-button'>
            <button 
              className="menubtn-info"
              onClick={() => {
                playSound();
                onBack();
              }}
            ></button>
          </div>
        </div>
      </div>  
    </div>
  );
}

// data history
function DataScreen({ highScores, recentScore, onBack, playSound }) {
  const highestScore = highScores.length > 0 ? highScores[0].score : null;

  return (
    <div className="screen data-screen">
      <div className='Panel3'>   
        <p className="recent-scorechan">{recentScore}</p>
        {highestScore !== null ? (
          <div className="high-score">
            <span className="high-scorechan">{highestScore}</span>
          </div>
        ) : (
          <p></p>
        )}
        <div className='ICKYBUTTON'>
          <button 
            className='menubtn-data' 
            onClick={() => {
              playSound();
              onBack();
            }}
          ></button>
        </div>
      </div>
    </div>
  );
}

export default App;