import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Plane, Ring } from "@react-three/drei";
import { useFighting, type Character as CharacterType } from "../lib/stores/useFighting";
import * as THREE from "three";

// 2D game characters
export default function Characters() {
  const player = useFighting((state) => state.player);
  const enemy = useFighting((state) => state.enemy);
  
  // Return both player and enemy character models
  return (
    <>
      <CharacterModel character={player} />
      <CharacterModel character={enemy} />
    </>
  );
}

interface CharacterModelProps {
  character: CharacterType;
}

function CharacterModel({ character }: CharacterModelProps) {
  const ref = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Mesh>(null);
  const weaponRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<any>(null);
  const attackEffectRef = useRef<THREE.Mesh>(null);
  
  // 공격 이펙트 표시를 위한 상태
  const [showAttackEffect, setShowAttackEffect] = useState(false);
  const [lastAttackTime, setLastAttackTime] = useState(0);
  const [projectilePosition, setProjectilePosition] = useState<[number, number, number]>([0, 0, 0]);
  const [showProjectile, setShowProjectile] = useState(false);
  const [shieldScale, setShieldScale] = useState(1.0); // 쉴드 애니메이션을 위한 스케일 값
  
  // Create materials for character states based on character color
  const playerMaterial = useRef(new THREE.MeshBasicMaterial({ 
    color: character.color || "#4287f5",
    opacity: 1.0,
    transparent: true,
    side: THREE.DoubleSide
  }));
  
  const enemyMaterial = useRef(new THREE.MeshBasicMaterial({ 
    color: character.color || "#f54242",
    opacity: 1.0,
    transparent: true,
    side: THREE.DoubleSide
  }));
  
  const flashingMaterial = useRef(new THREE.MeshBasicMaterial({ 
    color: "#ff0000",
    opacity: 1.0,
    transparent: true,
    side: THREE.DoubleSide
  }));
  
  // Create weapon material
  const weaponMaterial = useRef(new THREE.MeshBasicMaterial({
    color: character.side === "player" ? "#c0c0c0" : "#8B4513", 
    side: THREE.DoubleSide
  }));
  
  // Attack effect material
  const attackEffectMaterial = useRef(new THREE.MeshBasicMaterial({
    color: character.side === "player" ? "#87CEFA" : "#FF6347",
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  }));
  
  // 투사체 효과를 위한 머티리얼 (마법/원거리 공격용)
  const projectileMaterial = useRef(new THREE.MeshBasicMaterial({
    color: character.type === "mage" ? "#00FFFF" : // 마법사는 파란색 계열
          character.type === "rogue" ? "#00FF00" : // 도적은 녹색 계열
          "#FFFF00", // 기본 노란색
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  }));
  
  // 쉴드 효과를 위한 머티리얼
  const shieldMaterial = useRef(new THREE.MeshBasicMaterial({
    color: character.type === "paladin" ? "#FFFFAA" : // 성기사는 황금색 쉴드
          character.type === "mage" ? "#AAAAFF" : // 마법사는 푸른색 쉴드
          "#FFFFFF", // 기본 흰색
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  }));
  
  // 쉴드 레퍼런스
  const shieldRef = useRef<THREE.Mesh>(null);
  
  // Handle animations and state changes
  useFrame((_, delta) => {
    if (!ref.current || !modelRef.current || !weaponRef.current || !attackEffectRef.current) return;
    
    // Position updates (keep z at 0 for 2D view)
    ref.current.position.set(character.position[0], character.position[1], 0);
    
    // Handle character flipping based on direction
    modelRef.current.scale.x = character.direction * 1.0;
    
    // 쉴드 애니메이션 (값이 있을 때만 애니메이션)
    if (character.shield > 0 && shieldRef.current) {
      // 쉴드 스케일 맥동 효과
      setShieldScale(prevScale => {
        const newScale = prevScale + Math.sin(Date.now() * 0.005) * 0.02;
        return Math.max(0.95, Math.min(1.05, newScale));
      });
      
      // 쉴드 투명도 업데이트 - 쉴드 양에 비례
      const shieldOpacity = Math.min(0.6, 0.2 + (character.shield / 100) * 0.4);
      shieldMaterial.current.opacity = shieldOpacity;
      
      // 쉴드 표시
      shieldRef.current.visible = true;
      shieldRef.current.scale.set(shieldScale, shieldScale, 1);
    } else if (shieldRef.current) {
      // 쉴드가 없으면 숨김
      shieldRef.current.visible = false;
    }
    
    // Apply special visual effects
    const material = character.side === "player" ? playerMaterial.current : enemyMaterial.current;
    
    // 공격 상태 감지 및 이펙트 표시
    if (character.state === "attacking" && character.lastAttackTime !== lastAttackTime) {
      setShowAttackEffect(true);
      setLastAttackTime(character.lastAttackTime);
      
      // 이펙트가 사라지도록 타이머 설정
      setTimeout(() => {
        setShowAttackEffect(false);
      }, 300); // 300ms 동안 이펙트 표시
      
      // 투사체 관련 로직 - 원거리나 마법 공격일 경우에만 투사체 생성
      // 1. 캐릭터 타입 확인
      const isRangedCharacter = character.type === "mage" || character.type === "rogue";
      
      // 2. 현재 사용 중인 스킬 확인 (근접 공격이 아닌 스킬만 투사체 표시)
      // 가장 최근 사용한 스킬 찾기
      const activeSkill = character.skills.find(skill => {
        const timeSinceUsed = Date.now() - skill.lastUsed;
        return timeSinceUsed < 500; // 0.5초 이내에 사용된 스킬
      });
      
      // 3. 투사체가 필요한 스킬인지 확인
      const isRangedAttack = activeSkill && (
        activeSkill.type === "ranged" || 
        activeSkill.type === "magic" || 
        activeSkill.name.toLowerCase().includes("화살") ||
        activeSkill.name.toLowerCase().includes("볼") ||
        activeSkill.name.toLowerCase().includes("던지기") ||
        activeSkill.name.toLowerCase().includes("발사")
      );
      
      // 마법사는 기본 공격도 투사체를 사용 (지팡이에서 발사)
      const isMageBasicAttack = character.type === "mage" && 
                               Date.now() - character.lastAttackTime < 300 &&
                               !activeSkill && 
                               character.state === "attacking";
      
      // 원거리 캐릭터이면서 원거리 공격을 사용하는 경우에만 투사체 생성
      if ((isRangedCharacter && isRangedAttack && character.state === "attacking") || isMageBasicAttack) {
        // 투사체 시작 위치 설정
        setProjectilePosition([
          character.position[0] + character.direction * 1.5, 
          character.position[1] + 0.2, 
          0.1
        ]);
        
        // 투사체 표시
        setShowProjectile(true);
        
        // 투사체 애니메이션 시작 - 직선으로 이동
        const animateProjectile = () => {
          setProjectilePosition(([x, y, z]) => [
            x + character.direction * 0.5, // 캐릭터가 바라보는 방향으로 빠르게 이동
            y,
            z
          ]);
        };
        
        // 투사체 애니메이션 실행 및 제거
        let intervalId = setInterval(animateProjectile, 50);
        setTimeout(() => {
          clearInterval(intervalId);
          setShowProjectile(false);
        }, 600); // 600ms 후 투사체 제거
      }
    }
    
    // 캐릭터 타입별로 다양한 공격 애니메이션 적용
    if (character.state === "attacking") {
      // 마지막 공격 시간과 현재 시간의 차이 계산 (공격 애니메이션 진행 상태 결정)
      const currentTime = Date.now();
      // 애니메이션 타이밍을 위한 값 (0에서 1 사이)
      const attackProgress = Math.min(1, (currentTime - character.lastAttackTime) / 400);
      
      // 캐릭터 타입에 따라 다른 공격 애니메이션 적용
      switch (character.type) {
        case "warrior":
          // 전사는 넓은 호를 그리는 수평 베기 공격
          const slashAngle = character.direction === 1 
            ? Math.PI * 0.5 - attackProgress * Math.PI * 0.8 // 위에서 아래로 호를 그리는 모션
            : -Math.PI * 0.5 + attackProgress * Math.PI * 0.8;
          weaponRef.current.rotation.z = slashAngle;
          // 공격 중 무기 위치도 변경
          weaponRef.current.position.set(
            character.direction * (0.5 + attackProgress * 0.3), 
            0.3 - attackProgress * 0.4, 
            0.1
          );
          
          // 공격 이펙트 - 넓은 호 형태
          attackEffectRef.current.position.set(
            character.direction * (1.0 + attackProgress * 0.5), 
            0.1 - attackProgress * 0.2, 
            0.05
          );
          attackEffectRef.current.scale.set(character.direction * 2.5, 1.2, 1.0);
          break;
          
        case "rogue":
          // 도적은 빠른 연속 찌르기 (진동 움직임)
          const thrustPhase = Math.sin(attackProgress * Math.PI * 3) * 0.2; // 3단 공격 모션
          const thrustDistance = 0.5 + attackProgress * 0.8; // 점점 더 멀리 찌름
          
          weaponRef.current.rotation.z = character.direction === 1 
            ? thrustPhase
            : -thrustPhase;
          
          weaponRef.current.position.set(
            character.direction * thrustDistance, 
            thrustPhase * 0.2, // 약간 위아래로 움직임
            0.1
          );
          
          // 찌르기 이펙트 - 직선형 효과
          attackEffectRef.current.position.set(
            character.direction * (thrustDistance + 0.6), 
            thrustPhase * 0.3, 
            0.05
          );
          attackEffectRef.current.scale.set(character.direction * 1.5, 0.6, 1.0);
          break;
          
        case "mage":
          // 마법사는 마법 지팡이를 흔드는 모션
          const wandAngle = character.direction === 1 
            ? Math.PI * 0.2 + Math.sin(attackProgress * Math.PI * 2) * 0.3
            : -Math.PI * 0.2 - Math.sin(attackProgress * Math.PI * 2) * 0.3;
          
          weaponRef.current.rotation.z = wandAngle;
          weaponRef.current.position.set(
            character.direction * 0.4, 
            0.3 + Math.sin(attackProgress * Math.PI) * 0.4, 
            0.1
          );
          
          // 마법 이펙트 - 원형 효과
          attackEffectRef.current.position.set(
            character.direction * 1.2, 
            0.4, 
            0.05
          );
          attackEffectRef.current.scale.set(character.direction * 1.8, 1.8, 1.0); // 원형에 가까운 비율
          
          // 마법 이펙트는 더 화려하게 깜빡이게
          attackEffectMaterial.current.opacity = 0.5 + Math.sin(attackProgress * Math.PI * 6) * 0.4;
          break;
          
        case "paladin":
          // 성기사는 위에서 아래로 내리치는 스매시 공격
          const hammerAngle = character.direction === 1 
            ? Math.PI * 0.6 - attackProgress * Math.PI * 1.2 // 더 큰 호를 그리는 내리침
            : -Math.PI * 0.6 + attackProgress * Math.PI * 1.2;
          
          weaponRef.current.rotation.z = hammerAngle;
          weaponRef.current.position.set(
            character.direction * (0.4 + attackProgress * 0.4), 
            0.5 - attackProgress * 0.8, // 위에서 아래로 크게 내려침
            0.1
          );
          
          // 성기사 공격 이펙트 - 충격파 형태
          attackEffectRef.current.position.set(
            character.direction * (1.0 + attackProgress * 0.4), 
            -0.2 + attackProgress * 0.2, // 바닥 가까이
            0.05
          );
          attackEffectRef.current.scale.set(character.direction * 3.0, 1.0, 1.0); // 넓고 얇은 충격파
          break;
          
        default:
          // 기본 공격 애니메이션 (이전과 동일)
          const attackAngle = character.direction === 1 ? Math.PI * 0.3 : -Math.PI * 0.3;
          weaponRef.current.rotation.z = attackAngle;
          weaponRef.current.position.set(character.direction * 0.6, 0.2, 0.1);
          
          // 공격 이펙트 위치 및 크기 조정
          attackEffectRef.current.position.set(character.direction * 1.2, 0.2, 0.05);
          attackEffectRef.current.scale.set(character.direction * 2.0, 1.0, 1.0);
      }
      
      // 공격 이펙트 표시 및 애니메이션
      if (character.state === "attacking" && !showAttackEffect) {
        setShowAttackEffect(true);
        setLastAttackTime(currentTime);
        
        // 공격 효과 자동 숨김 타이머
        setTimeout(() => {
          setShowAttackEffect(false);
        }, 400); // 400ms 동안 표시
      }
      
      // 공격 이펙트 색상 설정 - 캐릭터 타입별로 다른 색상
      if (character.type === "warrior") {
        attackEffectMaterial.current.color.set("#FF6A00"); // 오렌지색 (칼날 이펙트)
      } else if (character.type === "mage") {
        attackEffectMaterial.current.color.set("#00AAFF"); // 푸른색 (마법 이펙트)
      } else if (character.type === "rogue") {
        attackEffectMaterial.current.color.set("#00FF6A"); // 초록색 (독 이펙트)
      } else if (character.type === "paladin") {
        attackEffectMaterial.current.color.set("#FFFF00"); // 노란색 (신성한 이펙트)
      }
      
      // 플래싱 효과로 이펙트를 반짝이게 (기본 로직은 유지)
      if (attackEffectMaterial.current.opacity > 0.4) {
        attackEffectMaterial.current.opacity -= delta * 2;
      } else {
        attackEffectMaterial.current.opacity = 0.7;
      }
    } else {
      // 기본 (공격하지 않을 때) 무기 위치 - 캐릭터 타입별로 다르게
      let restAngle, posX, posY;
      
      switch (character.type) {
        case "warrior":
          // 전사는 검을 앞으로 약간 기울여 들고 있음
          restAngle = character.direction === 1 ? Math.PI * 0.15 : -Math.PI * 0.15;
          posX = character.direction * 0.5;
          posY = 0.1;
          break;
          
        case "rogue":
          // 도적은 단검을 아래로 향하게 들고 있음
          restAngle = character.direction === 1 ? Math.PI * 0.3 : -Math.PI * 0.3;
          posX = character.direction * 0.4;
          posY = -0.1;
          break;
          
        case "mage":
          // 마법사는 지팡이를 높이 들고 있음
          restAngle = character.direction === 1 ? Math.PI * 0.05 : -Math.PI * 0.05;
          posX = character.direction * 0.4;
          posY = 0.3;
          break;
          
        case "paladin":
          // 성기사는 둔기를 어깨에 메고 있음
          restAngle = character.direction === 1 ? Math.PI * -0.2 : -Math.PI * -0.2;
          posX = character.direction * 0.3;
          posY = 0.2;
          break;
          
        default:
          // 기본값
          restAngle = character.direction === 1 ? Math.PI * 0.1 : -Math.PI * 0.1;
          posX = character.direction * 0.5;
          posY = 0;
      }
      
      weaponRef.current.rotation.z = restAngle;
      weaponRef.current.position.set(posX, posY, 0.1);
    }
    
    // 공격 이펙트 가시성 설정
    attackEffectRef.current.visible = showAttackEffect && character.state === "attacking";
    
    // Apply flashing effect
    if (character.isFlashing) {
      modelRef.current.material = flashingMaterial.current;
    } else {
      modelRef.current.material = material;
    }
    
    // Update label text
    if (labelRef.current) {
      labelRef.current.text = `${character.name} (${character.type})`;
      labelRef.current.fontSize = 0.2; // Smaller text
      
      // Add state indicators
      if (character.isDefending) {
        labelRef.current.text += " [Defending]";
      } else if (character.invulnerable) {
        labelRef.current.text += " [Invulnerable]";
      } else if (character.state !== "idle") {
        labelRef.current.text += ` [${character.state}]`;
      }
    }
  });
  
  return (
    <>
      {/* 캐릭터 그룹 */}
      <group ref={ref} position={character.position}>
        {/* 2D Character model - square shape */}
        <Plane
          ref={modelRef}
          args={[1, 1]} // Square shape
          rotation={[0, 0, 0]}
          material={character.side === "player" ? playerMaterial.current : enemyMaterial.current}
        />
        
        {/* 캐릭터 타입별 무기 - 다양한 모양과 크기 */}
        {character.type === "warrior" && (
          <Plane
            ref={weaponRef}
            args={[1.0, 0.2]} // 전사: 더 길고 넓은 검
            position={[character.direction * 0.5, 0, 0.1]}
            rotation={[0, 0, character.direction === 1 ? Math.PI * 0.1 : -Math.PI * 0.1]}
          >
            <meshBasicMaterial
              attach="material"
              color="#B0B0B0" // 금속성 은색
              transparent={false}
            />
          </Plane>
        )}
        
        {character.type === "mage" && (
          <Plane
            ref={weaponRef}
            args={[0.9, 0.1]} // 마법사: 길고 가는 지팡이
            position={[character.direction * 0.5, 0.2, 0.1]} // 약간 위로 들고 있음
            rotation={[0, 0, character.direction === 1 ? Math.PI * 0.05 : -Math.PI * 0.05]}
          >
            <meshBasicMaterial
              attach="material"
              color="#8B4513" // 갈색 나무색
              transparent={false}
            />
          </Plane>
        )}
        
        {character.type === "rogue" && (
          <Plane
            ref={weaponRef}
            args={[0.6, 0.12]} // 도적: 짧고 날카로운 단검
            position={[character.direction * 0.4, -0.1, 0.1]} // 약간 아래로 들고 있음
            rotation={[0, 0, character.direction === 1 ? Math.PI * 0.3 : -Math.PI * 0.3]}
          >
            <meshBasicMaterial
              attach="material"
              color="#505050" // 어두운 회색
              transparent={false}
            />
          </Plane>
        )}
        
        {character.type === "paladin" && (
          <Plane
            ref={weaponRef}
            args={[0.85, 0.3]} // 성기사: 짧고 두꺼운 둔기/해머
            position={[character.direction * 0.4, 0.2, 0.1]}
            rotation={[0, 0, character.direction === 1 ? Math.PI * -0.2 : -Math.PI * -0.2]}
          >
            <meshBasicMaterial
              attach="material"
              color="#FFD700" // 금색
              transparent={false}
            />
          </Plane>
        )}
        
        {/* Attack Effect (기본적으로 숨겨져 있음) */}
        <Plane
          ref={attackEffectRef}
          args={[1.0, 0.6]} // 공격 이펙트 크기
          position={[character.direction * 1.2, 0.2, 0.05]}
          rotation={[0, 0, character.direction === 1 ? Math.PI * 0.15 : -Math.PI * 0.15]}
          material={attackEffectMaterial.current}
          visible={false}
        />
        
        {/* Shield effect (visible only when character has shield) */}
        <Ring
          ref={shieldRef}
          args={[0.6, 0.7, 32]} // 내경, 외경, 세그먼트
          position={[0, 0, 0.05]} // 캐릭터 뒤에 위치
          rotation={[0, 0, 0]}
          material={shieldMaterial.current}
          visible={character.shield > 0}
        />
        
        {/* State label above character */}
        <Text
          ref={labelRef}
          position={[0, 0.7, 0]}
          fontSize={0.2} // Smaller text
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {character.state}
        </Text>
      </group>
      
      {/* 투사체 (원거리/마법 공격용) - 캐릭터 그룹과 별도로 렌더링 */}
      {showProjectile && (
        <group position={projectilePosition}>
          {/* 마법/원거리 타입에 따라 다른 투사체 모양 */}
          {character.type === "mage" && (
            <Plane
              args={[0.6, 0.6]} // 마법사는 원형에 가까운 투사체
              rotation={[0, 0, character.direction === 1 ? Math.PI * 0.25 : -Math.PI * 0.25]}
              material={projectileMaterial.current}
            >
              <meshBasicMaterial
                attach="material"
                color="#00FFFF"
                transparent={true}
                opacity={0.8}
              />
            </Plane>
          )}
          
          {character.type === "rogue" && (
            <Plane
              args={[0.5, 0.2]} // 도적은 날카로운 투사체
              rotation={[0, 0, character.direction === 1 ? 0 : Math.PI]}
              material={projectileMaterial.current}
            >
              <meshBasicMaterial
                attach="material"
                color="#00FF00"
                transparent={true}
                opacity={0.8}
              />
            </Plane>
          )}
          
          {/* 기본 투사체 (다른 캐릭터용) */}
          {character.type !== "mage" && character.type !== "rogue" && (
            <Plane
              args={[0.3, 0.3]} // 기본 투사체
              material={projectileMaterial.current}
            />
          )}
          
          {/* 투사체 효과 - 빛나는 꼬리 */}
          <Plane
            args={[1.0, 0.2]}
            position={[character.direction * -0.5, 0, -0.01]}
            rotation={[0, 0, 0]}
          >
            <meshBasicMaterial
              attach="material"
              color={character.type === "mage" ? "#0088FF" : "#88FF00"}
              transparent={true}
              opacity={0.5}
            />
          </Plane>
        </group>
      )}
    </>
  );
}