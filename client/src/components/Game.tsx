import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { Controls } from "../lib/controls";
import { useFighting } from "../lib/stores/useFighting";
import Arena from "./Arena";
import Characters from "./Characters";
import CharacterSelection from "./CharacterSelection";
import { toggleBackgroundMusic } from "../lib/sounds";

export default function Game() {
  const gameStarted = useRef(false);
  const gamePhase = useFighting((state) => state.gamePhase);
  const startGame = useFighting((state) => state.startGame);
  const updateGameState = useFighting((state) => state.updateGameState);
  
  // Controls states
  const leftPressed = useKeyboardControls<Controls>((state) => state.left);
  const rightPressed = useKeyboardControls<Controls>((state) => state.right);
  const jumpPressed = useKeyboardControls<Controls>((state) => state.jump);
  const defensePressed = useKeyboardControls<Controls>((state) => state.defense);
  const attackPressed = useKeyboardControls<Controls>((state) => state.attack);
  const specialAttackPressed = useKeyboardControls<Controls>((state) => state.specialAttack);
  const skill1Pressed = useKeyboardControls<Controls>((state) => state.skill1);
  const skill2Pressed = useKeyboardControls<Controls>((state) => state.skill2);
  const skill3Pressed = useKeyboardControls<Controls>((state) => state.skill3);
  const skill4Pressed = useKeyboardControls<Controls>((state) => state.skill4);
  const skill5Pressed = useKeyboardControls<Controls>((state) => state.skill5);
  
  // Control functions from state
  const moveCharacter = useFighting((state) => state.moveCharacter);
  const jump = useFighting((state) => state.jump);
  const defend = useFighting((state) => state.defend);
  const basicAttack = useFighting((state) => state.basicAttack);
  const specialAttack = useFighting((state) => state.specialAttack);
  const useSkill = useFighting((state) => state.useSkill);
  
  // 배경 음악 시작 (게임 시작 시)
  useEffect(() => {
    if (gamePhase === "fighting" && !gameStarted.current) {
      gameStarted.current = true;
      toggleBackgroundMusic();
    }
  }, [gamePhase]);
  
  // Process keyboard inputs
  useEffect(() => {
    if (gamePhase !== "fighting") return;
    
    // Defense
    defend("player", defensePressed);
    
  }, [gamePhase, defensePressed, defend]);
  
  // 화살표 키로 직접 캐릭터 속도를 조정하는 로직
  useFrame((_, delta) => {
    if (gamePhase !== "fighting") return;
    
    const player = useFighting.getState().player;
    
    // 스턴, 쓰러짐, 회복 상태일 때는 조작 불가
    if (
      player.state === "stunned" ||
      player.state === "fallen" ||
      player.state === "recovering"
    ) return;
    
    // 속도와 방향 초기화
    let newVelocityX = 0;
    let newDirection = player.direction;
    
    // 키 입력에 따라 속도 설정
    if (leftPressed) {
      newVelocityX = -5; // 왼쪽으로 이동
      newDirection = -1;
    } else if (rightPressed) {
      newVelocityX = 5; // 오른쪽으로 이동
      newDirection = 1;
    }
    
    // 점프
    if (jumpPressed && player.velocity[1] === 0) {
      jump("player");
    }
    
    // 상태 및 속도 업데이트
    if (newVelocityX !== 0) {
      useFighting.setState((state) => {
        const updatedPlayer = { 
          ...state.player, 
          direction: newDirection,
          velocity: [newVelocityX, state.player.velocity[1], 0] as [number, number, number],
          state: state.player.state === "idle" ? "running" : state.player.state
        };
        
        return { player: updatedPlayer };
      });
    } else if (player.state === "running") {
      // 움직임이 멈추면 idle 상태로 변경
      useFighting.setState((state) => {
        return { 
          player: { 
            ...state.player, 
            velocity: [0, state.player.velocity[1], 0] as [number, number, number],
            state: "idle" 
          } 
        };
      });
    }
  });
  
  // Handle skill button presses
  useEffect(() => {
    if (gamePhase !== "fighting") return;
    
    if (skill1Pressed) useSkill("player", 1);
    if (skill2Pressed) useSkill("player", 2);
    if (skill3Pressed) useSkill("player", 3);
    if (skill4Pressed) useSkill("player", 4);
    if (skill5Pressed) useSkill("player", 5);
  }, [
    gamePhase, skill1Pressed, skill2Pressed, skill3Pressed, skill4Pressed, skill5Pressed, 
    useSkill
  ]);
  
  // Reference to the camera
  const player = useFighting((state) => state.player);
  const enemy = useFighting((state) => state.enemy);
  
  // 이전 카메라 위치 저장용 참조 변수
  const cameraRef = useRef({
    x: 0,
    zoom: 40
  });
  
  // 개선된 게임 루프와 카메라 시스템
  useFrame((state, delta) => {
    if (gamePhase === "fighting") {
      updateGameState(delta);
      
      // 카메라 조정 로직 개선
      if (state.camera) {
        // 플레이어와 적의 위치
        const playerX = player.position[0];
        const playerY = player.position[1];
        const enemyX = enemy.position[0];
        const enemyY = enemy.position[1];
        
        // 카메라가 항상 두 캐릭터를 모두 포함하도록 계산
        // 두 캐릭터의 중간점을 기본으로 하되, 더 높은 캐릭터 쪽으로 약간 치우치게 설정
        const midX = (playerX + enemyX) / 2;
        const midY = Math.max(playerY, enemyY) * 0.3; // 높이가 높은 쪽을 약간 고려
        
        // 두 캐릭터 사이의 거리 계산
        const distanceX = Math.abs(playerX - enemyX);
        const distanceY = Math.abs(playerY - enemyY);
        
        // 부드러운 카메라 이동을 위한 보간
        const smoothingFactor = 0.1; // 낮을수록 더 부드러움
        
        // 부드러운 X 이동
        const targetX = midX;
        cameraRef.current.x += (targetX - cameraRef.current.x) * smoothingFactor;
        state.camera.position.x = cameraRef.current.x;
        
        // Y 위치도 조정 - 캐릭터가 점프하면 카메라도 약간 따라가도록
        state.camera.position.y = midY * 0.5;
        
        // 줌 레벨 계산 - 캐릭터 사이의 거리와 높이 차이를 모두 고려
        let targetZoom;
        const totalDistance = Math.max(distanceX, distanceY * 2); // 수직 거리는 가중치를 두배로
        
        if (totalDistance > 10) {
          // 멀리 떨어져 있으면 줌 아웃
          targetZoom = 45 - totalDistance * 0.8;
          // 줌 한계 설정
          targetZoom = Math.max(25, Math.min(targetZoom, 45));
        } else {
          // 기본 줌 레벨
          targetZoom = 40;
        }
        
        // 부드러운 줌 적용
        if ('zoom' in state.camera) {
          cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * smoothingFactor;
          state.camera.zoom = cameraRef.current.zoom;
          state.camera.updateProjectionMatrix();
        }
      }
    }
  });
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
      />
      
      {/* Game elements */}
      <Arena />
      <Characters />
    </>
  );
}
