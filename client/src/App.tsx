import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import Game from "./components/Game";
import GameUI from "./components/GameUI";
import CharacterSelection from "./components/CharacterSelection";
import { useAudio } from "./lib/stores/useAudio";
import { useFighting } from "./lib/stores/useFighting";
import { controlsMap } from "./lib/controls";
import "@fontsource/inter";

// Main App component
function App() {
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();

  // Load audio elements
  useEffect(() => {
    // Create and set up background music
    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);

    // Create and set up hit sound
    const hit = new Audio("/sounds/hit.mp3");
    hit.volume = 0.5;
    setHitSound(hit);

    // Create and set up success sound
    const success = new Audio("/sounds/success.mp3");
    success.volume = 0.5;
    setSuccessSound(success);

    // Show canvas once audio is loaded
    setShowCanvas(true);

    return () => {
      bgMusic.pause();
      hit.pause();
      success.pause();
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  // 현재 게임 단계
  const gamePhase = useFighting((state) => state.gamePhase);
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <KeyboardControls map={controlsMap}>
          <Canvas
            shadows
            orthographic
            camera={{
              position: [0, 0, 10],
              zoom: 40,
              near: 0.1,
              far: 1000
            }}
          >
            <color attach="background" args={["#87CEEB"]} />
            
            {/* Main game component */}
            <Suspense fallback={null}>
              <Game />
            </Suspense>
          </Canvas>

          {/* UI Elements (outside Canvas) */}
          <GameUI />
          
          {/* Character Selection Screen (outside Canvas) */}
          {gamePhase === "menu" && <CharacterSelection />}
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
