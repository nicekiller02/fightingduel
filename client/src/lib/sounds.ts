// Sound utility functions
import { useAudio } from "./stores/useAudio";

export const playHitSound = () => {
  const { playHit } = useAudio.getState();
  playHit();
};

export const playSuccessSound = () => {
  const { playSuccess } = useAudio.getState();
  playSuccess();
};

export const toggleBackgroundMusic = () => {
  const { backgroundMusic, isMuted, toggleMute } = useAudio.getState();
  
  if (backgroundMusic) {
    if (isMuted) {
      toggleMute();
      backgroundMusic.play().catch(e => console.error("Failed to play background music:", e));
    } else {
      toggleMute();
      backgroundMusic.pause();
    }
  }
};
