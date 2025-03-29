import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { playHitSound, playSuccessSound } from "../sounds";

// Types for player and skills
export type PlayerState = "idle" | "running" | "jumping" | "attacking" | "defending" | "stunned" | "fallen" | "recovering";
export type CharacterSide = "player" | "enemy";
export type CharacterType = "warrior" | "mage" | "rogue" | "paladin";

export interface Skill {
  id: number;
  name: string;
  damage: number;
  cooldown: number;
  lastUsed: number;
  duration: number;
  range: number;
  description: string;
  type?: "melee" | "ranged" | "magic" | "defense"; // 스킬 유형 추가
  effect?: "stun" | "knockback" | "bleed" | "heal" | "buff"; // 추가 효과
}

export interface CharacterStats {
  healthMultiplier: number;     // 체력 계수
  damageMultiplier: number;     // 데미지 계수
  staminaMultiplier: number;    // 스태미나 계수
  speedMultiplier: number;      // 이동 속도 계수
  jumpMultiplier: number;       // 점프력 계수
  defenseMultiplier: number;    // 방어력 계수
  recoveryMultiplier: number;   // 회복 계수
}

export interface CharacterClass {
  type: CharacterType;
  name: string;
  description: string;
  stats: CharacterStats;
  skills: Skill[];
  color: string; // 캐릭터 색상
}

// 캐릭터 충돌 상태 추적을 위한 인터페이스
export interface CollisionData {
  isColliding: boolean;
  collisionStartTime: number;
  lastCollisionTime: number;
  collisionDuration: number;
}

export interface Character {
  side: CharacterSide;
  type: CharacterType;
  name: string;
  position: [number, number, number]; // x, y, z
  velocity: [number, number, number]; // vx, vy, vz
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  staminaRechargeRate: number;
  staminaDefenseDrain: number;
  isStaminaDepleted: boolean;
  staminaRecoveryTimer: number;
  state: PlayerState;
  direction: -1 | 1; // -1 facing left, 1 facing right
  isDefending: boolean;
  isFlashing: boolean;
  invulnerable: boolean;
  stunTimer: number;
  shield: number; // 방어력 수치 (추가)
  shieldDuration: number; // 쉴드 지속 시간 (추가)
  skills: Skill[];
  lastAttackTime: number;
  color: string; // 캐릭터 색상
  collisionData?: CollisionData; // 충돌 상태 데이터 (물리 충돌용)
}

export type GamePhase = "menu" | "fighting" | "round_end" | "match_end";

interface FightingState {
  gamePhase: GamePhase;
  player: Character;
  enemy: Character;
  platformPositions: [number, number, number][]; // x, y, z positions for platforms
  gravity: number;
  elapsedTime: number;
  winner: CharacterSide | null;
  availableCharacters: CharacterClass[]; // 선택 가능한 캐릭터 목록
  selectedCharacterType: CharacterType; // 선택된 캐릭터 타입
  
  // Actions
  startGame: () => void;
  resetGame: () => void;
  moveCharacter: (side: CharacterSide, direction: -1 | 1) => void;
  jump: (side: CharacterSide) => void;
  defend: (side: CharacterSide, isDefending: boolean) => void;
  basicAttack: (side: CharacterSide) => void;
  specialAttack: (side: CharacterSide) => void;
  useSkill: (side: CharacterSide, skillId: number) => void;
  updateGameState: (deltaTime: number) => void;
  selectCharacter: (characterType: CharacterType) => void; // 캐릭터 선택 함수
}

// Initial skill definitions
const createInitialSkills = (): Skill[] => [
  { 
    id: 1, 
    name: "대쉬 어택", 
    damage: 15, 
    cooldown: 3000, 
    lastUsed: 0, 
    duration: 400, 
    range: 3.0, 
    description: "빠른 대쉬 공격으로 적을 향해 달려들며 중간 데미지를 입힙니다.",
    type: "melee",
    effect: "knockback"
  },
  { 
    id: 2, 
    name: "어퍼 슬래시", 
    damage: 20, 
    cooldown: 6000, 
    lastUsed: 0, 
    duration: 600, 
    range: 1.8, 
    description: "위쪽으로 베는 공격으로 적을 공중으로 띄우고 기절시킵니다.",
    type: "melee",
    effect: "stun" 
  },
  { 
    id: 3, 
    name: "삼단 찌르기", 
    damage: 8, // 3회 히트로 총 24 데미지
    cooldown: 8000, 
    lastUsed: 0, 
    duration: 800, 
    range: 2.2, 
    description: "연속 세 번 찌르기로, 여러 번 타격할 수 있는 공격입니다.",
    type: "melee",
    effect: "bleed" 
  },
  { 
    id: 4, 
    name: "카운터 스탠스", 
    damage: 25, 
    cooldown: 12000, 
    lastUsed: 0, 
    duration: 1200, 
    range: 1.5, 
    description: "방어 자세를 취해 들어오는 공격을 카운터합니다. 방해받지 않으면 적을 기절시킵니다.",
    type: "defense",
    effect: "stun" 
  },
  { 
    id: 5, 
    name: "블레이드 스톰", 
    damage: 35, 
    cooldown: 18000, 
    lastUsed: 0, 
    duration: 2000, 
    range: 4.0, 
    description: "강력한 다단히트 공격으로 주변의 모든 적에게 데미지를 입힙니다.",
    type: "magic",
    effect: "knockback" 
  },
];

// 캐릭터 클래스 정의
const characterClasses: CharacterClass[] = [
  // 전사 (기본 캐릭터)
  {
    type: "warrior",
    name: "전사",
    description: "균형 잡힌 능력치를 가진 전통적인 전사 캐릭터입니다. 근접 공격에 특화되어 있습니다.",
    stats: {
      healthMultiplier: 1.0,     // 기본 체력
      damageMultiplier: 1.0,     // 기본 공격력
      staminaMultiplier: 1.0,    // 기본 스태미나
      speedMultiplier: 1.0,      // 기본 이동 속도
      jumpMultiplier: 1.0,       // 기본 점프력
      defenseMultiplier: 1.0,    // 기본 방어력
      recoveryMultiplier: 1.0,   // 기본 회복 속도
    },
    skills: [
      { 
        id: 1, 
        name: "대쉬 어택", 
        damage: 15, 
        cooldown: 4000, 
        lastUsed: 0, 
        duration: 400, 
        range: 3.0, 
        description: "빠르게 전방으로 돌진하여 적을 가격합니다. 돌진 거리가 길고 좋은 기동성을 제공합니다.",
        type: "melee",
        effect: "knockback"
      },
      { 
        id: 2, 
        name: "어퍼 슬래시", 
        damage: 20, 
        cooldown: 6000, 
        lastUsed: 0, 
        duration: 600, 
        range: 1.8, 
        description: "아래에서 위로 강하게 베어올려 적을 공중으로 띄웁니다. 적을 스턴 상태로 만듭니다.",
        type: "melee",
        effect: "stun"
      },
      { 
        id: 3, 
        name: "삼단 찌르기", 
        damage: 8, // 3회 히트로 총 24 데미지
        cooldown: 8000, 
        lastUsed: 0, 
        duration: 800, 
        range: 2.2, 
        description: "전방으로 세 번 연속 찌르기 공격을 가합니다. 각 공격은 낮은 데미지지만 합계는 강력합니다.",
        type: "melee",
        effect: "bleed" 
      },
      { 
        id: 4, 
        name: "카운터 스탠스", 
        damage: 25, 
        cooldown: 12000, 
        lastUsed: 0, 
        duration: 1200, 
        range: 1.5, 
        description: "방어 자세를 취해 공격을 받으면 강력한 반격을 가합니다. 완벽하게 사용하면 적을 기절시킵니다.",
        type: "defense",
        effect: "stun"
      },
      { 
        id: 5, 
        name: "블레이드 스톰", 
        damage: 40, 
        cooldown: 18000, 
        lastUsed: 0, 
        duration: 2000, 
        range: 4.0, 
        description: "칼날을 빠르게 회전시켜 주변 모든 방향으로 공격합니다. 넓은 범위에 강력한 데미지를 입힙니다.",
        type: "melee",
        effect: "knockback" 
      },
    ],
    color: "#FF5533" // 붉은색 (전사)
  },
  
  // 마법사
  {
    type: "mage",
    name: "마법사",
    description: "원거리 마법 공격에 특화된 캐릭터입니다. 체력은 낮지만 강력한 마법 공격을 사용할 수 있습니다.",
    stats: {
      healthMultiplier: 0.8,     // 낮은 체력
      damageMultiplier: 1.3,     // 높은 공격력
      staminaMultiplier: 0.9,    // 약간 낮은 스태미나
      speedMultiplier: 0.9,      // 느린 이동 속도
      jumpMultiplier: 0.9,       // 낮은 점프력
      defenseMultiplier: 0.7,    // 낮은 방어력
      recoveryMultiplier: 1.1,   // 빠른 회복 속도
    },
    skills: [
      { 
        id: 1, 
        name: "파이어볼", 
        damage: 20, 
        cooldown: 5000, 
        lastUsed: 0, 
        duration: 400, 
        range: 6.0, 
        description: "멀리 날아가는 불꽃 구체를 발사합니다. 마법사의 기본 원거리 공격입니다.",
        type: "magic",
        effect: "knockback"
      },
      { 
        id: 2, 
        name: "얼음 화살", 
        damage: 15, 
        cooldown: 7000, 
        lastUsed: 0, 
        duration: 500, 
        range: 5.0, 
        description: "관통하는 얼음 화살을 발사합니다. 맞은 적을 잠시 얼려 움직임을 방해합니다.",
        type: "magic",
        effect: "stun"
      },
      { 
        id: 3, 
        name: "텔레포트", 
        damage: 0, 
        cooldown: 9000, 
        lastUsed: 0, 
        duration: 300, 
        range: 7.0, 
        description: "순간이동으로 전방 먼 거리로 이동합니다. 추격과 도주에 모두 유용합니다.",
        type: "magic"
      },
      { 
        id: 4, 
        name: "마나 쉴드", 
        damage: 0, 
        cooldown: 15000, 
        lastUsed: 0, 
        duration: 3000, 
        range: 0, 
        description: "마법 방패로 몸을 감싸 일정 시간 데미지를 크게 줄여줍니다. 지속시간이 깁니다.",
        type: "defense",
        effect: "buff"
      },
      { 
        id: 5, 
        name: "메테오", 
        damage: 50, 
        cooldown: 20000, 
        lastUsed: 0, 
        duration: 1800, 
        range: 8.0, 
        description: "하늘에서 거대한 운석을 소환해 광역 데미지를 입힙니다. 가장 강력한 마법 공격입니다.",
        type: "magic",
        effect: "knockback"
      },
    ],
    color: "#3355FF" // 파란색 (마법사)
  },
  
  // 도적
  {
    type: "rogue",
    name: "도적",
    description: "빠른 공격과 민첩성에 특화된 캐릭터입니다. 회피와 재빠른 기동성이 특징입니다.",
    stats: {
      healthMultiplier: 0.9,     // 약간 낮은 체력
      damageMultiplier: 0.9,     // 낮은 기본 공격력
      staminaMultiplier: 1.2,    // 높은 스태미나
      speedMultiplier: 1.3,      // 빠른 이동 속도
      jumpMultiplier: 1.2,       // 높은 점프력
      defenseMultiplier: 0.8,    // 낮은 방어력
      recoveryMultiplier: 1.2,   // 빠른 회복 속도
    },
    skills: [
      { 
        id: 1, 
        name: "그림자 찌르기", 
        damage: 15, 
        cooldown: 3000, 
        lastUsed: 0, 
        duration: 300, 
        range: 2.5, 
        description: "그림자처럼 빠르게 적에게 접근하여 급소를 찌릅니다. 매우 빠른 공격 속도가 특징입니다.",
        type: "melee",
        effect: "bleed"
      },
      { 
        id: 2, 
        name: "독 단검", 
        damage: 10, 
        cooldown: 6000, 
        lastUsed: 0, 
        duration: 500, 
        range: 1.8, 
        description: "독이 묻은 단검으로 공격하여 지속적인 독 데미지를 입힙니다. 출혈 효과가 있습니다.",
        type: "melee",
        effect: "bleed"
      },
      { 
        id: 3, 
        name: "그림자 도약", 
        damage: 0, 
        cooldown: 8000, 
        lastUsed: 0, 
        duration: 400, 
        range: 5.0, 
        description: "그림자 속으로 몸을 숨겨 빠르게 전방으로 도약합니다. 적의 공격을 회피하는데 유용합니다.",
        type: "ranged"
      },
      { 
        id: 4, 
        name: "연막탄", 
        damage: 8, 
        cooldown: 12000, 
        lastUsed: 0, 
        duration: 1000, 
        range: 4.0, 
        description: "연막탄을 던져 넓은 구역에 연기를 퍼뜨립니다. 적의 시야를 가리고 잠시 혼란에 빠뜨립니다.",
        type: "ranged",
        effect: "stun"
      },
      { 
        id: 5, 
        name: "암살", 
        damage: 45, 
        cooldown: 18000, 
        lastUsed: 0, 
        duration: 800, 
        range: 2.0, 
        description: "은밀하게 접근해 적의 치명적인 약점을 공격합니다. 적의 체력이 낮을수록 더 큰 데미지를 입힙니다.",
        type: "melee",
        effect: "knockback"
      },
    ],
    color: "#33FF66" // 초록색 (도적)
  },
  
  // 성기사
  {
    type: "paladin",
    name: "성기사",
    description: "높은 방어력과 생존력을 가진 캐릭터입니다. 회복 능력과 보호 기술이 특징입니다.",
    stats: {
      healthMultiplier: 1.2,     // 높은 체력
      damageMultiplier: 0.9,     // 낮은 공격력
      staminaMultiplier: 1.1,    // 높은 스태미나
      speedMultiplier: 0.9,      // 느린 이동 속도
      jumpMultiplier: 0.9,       // 낮은 점프력
      defenseMultiplier: 1.3,    // 높은 방어력
      recoveryMultiplier: 1.3,   // 매우 빠른 회복 속도
    },
    skills: [
      { 
        id: 1, 
        name: "성스러운 일격", 
        damage: 18, 
        cooldown: 5000, 
        lastUsed: 0, 
        duration: 600, 
        range: 2.5, 
        description: "성스러운 빛의 기운을 담아 검으로 강한 일격을 가합니다. 중간 거리 공격입니다.",
        type: "melee",
        effect: "knockback"
      },
      { 
        id: 2, 
        name: "심판의 망치", 
        damage: 25, 
        cooldown: 8000, 
        lastUsed: 0, 
        duration: 800, 
        range: 2.0, 
        description: "거대한 빛의 망치를 내리쳐 적을 강하게 밀쳐냅니다. 강력한 넉백 효과가 있습니다.",
        type: "melee",
        effect: "knockback"
      },
      { 
        id: 3, 
        name: "신성한 보호막", 
        damage: 0, 
        cooldown: 10000, 
        lastUsed: 0, 
        duration: 6, // 6초 동안 지속 
        range: 0, 
        description: "신성한 빛의 보호막으로 몸을 감싸 80의 피해를 흡수하는 쉴드를 생성합니다. 효과는 6초간 지속됩니다.",
        type: "defense",
        effect: "buff"
      },
      { 
        id: 4, 
        name: "치유의 빛", 
        damage: -20, // 음수는 힐링을 의미
        cooldown: 15000, 
        lastUsed: 0, 
        duration: 1200, 
        range: 0, 
        description: "신성한 빛의 힘으로 자신의 상처를 치유합니다. 적지 않은 양의 체력을 회복시킵니다.",
        type: "magic",
        effect: "heal"
      },
      { 
        id: 5, 
        name: "신성 폭발", 
        damage: 35, 
        cooldown: 20000, 
        lastUsed: 0, 
        duration: 1500, 
        range: 4.0, 
        description: "강력한 빛의 폭발을 일으켜 넓은 범위에 데미지를 입히고 적을 기절시킵니다.",
        type: "magic",
        effect: "stun"
      },
    ],
    color: "#FFDD33" // 황금색 (성기사)
  }
];

// Create initial character state
const createInitialCharacter = (side: CharacterSide, characterType: CharacterType = "warrior"): Character => {
  // 선택한 캐릭터 클래스 찾기
  const characterClass = characterClasses.find(c => c.type === characterType) || characterClasses[0];
  const stats = characterClass.stats;
  
  return {
    side,
    type: characterClass.type,
    name: characterClass.name,
    position: side === "player" ? [-3, 1, 0] : [3, 1, 0], // 더 가까운 시작 위치
    velocity: [0, 0, 0],
    health: Math.round(100 * stats.healthMultiplier),
    maxHealth: Math.round(100 * stats.healthMultiplier),
    stamina: Math.round(100 * stats.staminaMultiplier),
    maxStamina: Math.round(100 * stats.staminaMultiplier),
    staminaRechargeRate: Math.round(15 * stats.recoveryMultiplier), // Per second
    staminaDefenseDrain: Math.round(20 * stats.defenseMultiplier), // Per second
    isStaminaDepleted: false,
    staminaRecoveryTimer: 0,
    state: "idle",
    direction: side === "player" ? 1 : -1,
    isDefending: false,
    isFlashing: false,
    invulnerable: false,
    stunTimer: 0,
    shield: 0, // 초기 쉴드 없음
    shieldDuration: 0, // 초기 쉴드 지속시간 없음
    skills: JSON.parse(JSON.stringify(characterClass.skills)), // 깊은 복사로 스킬 할당
    lastAttackTime: 0,
    color: characterClass.color,
    // 충돌 상태 초기화
    collisionData: {
      isColliding: false,
      collisionStartTime: 0,
      lastCollisionTime: 0,
      collisionDuration: 0
    }
  };
};

// Platform positions: [x, y, z] - 하나의 메인 플랫폼만 남김
const initialPlatforms: [number, number, number][] = [
  [0, 0, 0], // Main platform - width is 20
];

export const useFighting = create<FightingState>()(
  subscribeWithSelector((set, get) => ({
    gamePhase: "menu",
    player: createInitialCharacter("player", "warrior"),
    enemy: createInitialCharacter("enemy", "mage"),
    platformPositions: initialPlatforms,
    gravity: 20,
    elapsedTime: 0,
    winner: null,
    availableCharacters: characterClasses,
    selectedCharacterType: "warrior",
    
    startGame: () => {
      set((state) => { 
        // 랜덤 적 캐릭터 선택
        const characterTypes: CharacterType[] = ["warrior", "mage", "rogue", "paladin"];
        const randomIndex = Math.floor(Math.random() * characterTypes.length);
        const randomEnemyType: CharacterType = characterTypes[randomIndex];
        
        return {
          gamePhase: "fighting",
          player: createInitialCharacter("player", state.selectedCharacterType),
          enemy: createInitialCharacter("enemy", randomEnemyType), // 랜덤 적 캐릭터 선택
          winner: null
        };
      });
    },
    
    resetGame: () => {
      set((state) => { 
        // 랜덤 적 캐릭터 선택 (리셋 시에도 동일하게 적용)
        const characterTypes: CharacterType[] = ["warrior", "mage", "rogue", "paladin"];
        const randomIndex = Math.floor(Math.random() * characterTypes.length);
        const randomEnemyType: CharacterType = characterTypes[randomIndex];
        
        return {
          gamePhase: "menu",
          player: createInitialCharacter("player", state.selectedCharacterType),
          enemy: createInitialCharacter("enemy", randomEnemyType),
          winner: null
        };
      });
    },
    
    moveCharacter: (side, direction) => {
      set((state) => {
        const character = side === "player" ? state.player : state.enemy;
        
        // Only move if not stunned or fallen
        if (character.state === "stunned" || character.state === "fallen" || character.state === "recovering") {
          return {};
        }
        
        // Update character's direction and state
        const updatedCharacter = {
          ...character,
          direction,
          state: character.state === "idle" || character.state === "running" ? "running" : character.state,
        };
        
        return side === "player" 
          ? { player: updatedCharacter } 
          : { enemy: updatedCharacter };
      });
    },
    
    jump: (side) => {
      set((state) => {
        const character = side === "player" ? state.player : state.enemy;
        
        // Only jump if on the ground and not stunned or fallen
        if (character.velocity[1] !== 0 || 
            character.state === "stunned" || 
            character.state === "fallen" || 
            character.state === "recovering") {
          return {};
        }
        
        const updatedCharacter = {
          ...character,
          velocity: [character.velocity[0], 10, character.velocity[2]],
          state: "jumping",
        };
        
        return side === "player" 
          ? { player: updatedCharacter } 
          : { enemy: updatedCharacter };
      });
    },
    
    defend: (side, isDefending) => {
      set((state) => {
        const character = side === "player" ? state.player : state.enemy;
        
        // Can't defend if stunned, fallen, or stamina is depleted
        if (character.state === "stunned" || 
            character.state === "fallen" || 
            character.state === "recovering" ||
            (isDefending && character.isStaminaDepleted)) {
          return {};
        }
        
        const updatedCharacter = {
          ...character,
          isDefending,
          state: isDefending ? "defending" : "idle",
        };
        
        return side === "player" 
          ? { player: updatedCharacter } 
          : { enemy: updatedCharacter };
      });
    },
    
    basicAttack: (side) => {
      const state = get();
      const character = side === "player" ? state.player : state.enemy;
      const opponent = side === "player" ? state.enemy : state.player;
      
      // Can't attack if stunned, fallen, or recovering
      if (character.state === "stunned" || 
          character.state === "fallen" || 
          character.state === "recovering" ||
          character.state === "attacking" ||
          Date.now() - character.lastAttackTime < 500) { // Attack cooldown
        return;
      }
      
      // Check if opponent is in range
      const charX = character.position[0];
      const oppX = opponent.position[0];
      const charY = character.position[1];
      const oppY = opponent.position[1];
      const distance = Math.abs(charX - oppX);
      
      // 캐릭터 타입별로 공격 범위와 패턴을 다르게 설정
      let attackRange = 2;
      let attackPattern: 'horizontal' | 'thrust' | 'uppercut' | 'vertical' | 'sweep' = 'horizontal';
      let damage = 5; // 기본 데미지
      
      // 캐릭터 유형에 따라 공격 패턴 결정
      switch (character.type) {
        case "warrior":
          // 전사는 큰 검으로 수평 베기 공격
          attackPattern = 'horizontal';
          attackRange = 2.2; // 약간 더 넓은 범위
          damage = 6; // 약간 더 강한 공격
          break;
        case "rogue":
          // 도적은 날렵한 삼단 찌르기
          attackPattern = 'thrust';
          attackRange = 1.8; // 짧은 범위지만 빠른 공격
          damage = 3; // 한 번의 데미지는 낮지만 3번 공격
          break;
        case "mage":
          // 마법사는 지팡이로 가벼운 수직 공격
          attackPattern = 'vertical';
          attackRange = 1.6; // 가장 짧은 범위
          damage = 4;
          break;
        case "paladin":
          // 성기사는 해머나 둔기로 강한 내려치기
          attackPattern = 'sweep';
          attackRange = 2.0;
          damage = 7; // 가장 강한 기본 공격
          break;
      }
      
      set((state) => {
        const updatedCharacter = {
          ...character,
          state: "attacking",
          lastAttackTime: Date.now(),
        };
        
        // 공격 패턴에 따라 범위와 히트 판정 계산
        let inRange = false;
        let finalDamage = damage;
        
        switch (attackPattern) {
          case 'horizontal':
            // 수평 공격 - 정면의 적만 공격
            inRange = distance <= attackRange && 
              ((character.direction === 1 && charX < oppX) || 
               (character.direction === -1 && charX > oppX));
            break;
            
          case 'thrust':
            // 찌르기 공격 - 최대 거리가 짧고 정확히 정면
            inRange = distance <= attackRange * 0.9 && 
              ((character.direction === 1 && charX < oppX) || 
               (character.direction === -1 && charX > oppX));
              
            // 삼단 찌르기 구현 - 데미지 3번 적용
            if (inRange) {
              finalDamage = damage * 3;
            }
            break;
            
          case 'uppercut':
            // 어퍼컷 공격 - 대각선 위로 공격하므로 높이 차이도 고려
            inRange = distance <= attackRange && 
              ((character.direction === 1 && charX < oppX) || 
               (character.direction === -1 && charX > oppX)) &&
              (oppY >= charY); // 상대가 같거나 위에 있어야 함
              
            // 어퍼컷 히트 시 상대를 위로 띄움
            if (inRange) {
              setTimeout(() => {
                set(state => {
                  const currentOpponent = side === "player" ? state.enemy : state.player;
                  const updatedWithKnockup = {
                    ...currentOpponent,
                    velocity: [currentOpponent.velocity[0], 6, currentOpponent.velocity[2]]
                  };
                  
                  return side === "player"
                    ? { enemy: updatedWithKnockup }
                    : { player: updatedWithKnockup };
                });
              }, 100);
            }
            break;
            
          case 'vertical':
            // 수직 공격 - 정면의 적에게 약한 공격
            inRange = distance <= attackRange && 
              ((character.direction === 1 && charX < oppX) || 
               (character.direction === -1 && charX > oppX));
            break;
            
          case 'sweep':
            // 휘두르기 공격 - 약간 더 넓은 범위의 강한 공격
            inRange = distance <= attackRange * 1.2 && 
              ((character.direction === 1 && charX < oppX) || 
               (character.direction === -1 && charX > oppX));
            
            // 휘두르기는 넉백 효과가 더 강함
            if (inRange) {
              setTimeout(() => {
                set(state => {
                  const currentOpponent = side === "player" ? state.enemy : state.player;
                  const knockbackDir = character.direction;
                  const updatedWithKnockback = {
                    ...currentOpponent,
                    velocity: [knockbackDir * 7, currentOpponent.velocity[1], currentOpponent.velocity[2]]
                  };
                  
                  return side === "player"
                    ? { enemy: updatedWithKnockback }
                    : { player: updatedWithKnockback };
                });
              }, 100);
            }
            break;
        }
        
        // 히트 판정이 성공했으면 데미지 처리
        if (inRange) {
          // If opponent is defending and not a special attack, reduced damage
          if (opponent.isDefending) {
            playHitSound();
            finalDamage = Math.floor(finalDamage / 2);
          }
          
          const updatedOpponent = processHit(opponent, finalDamage, false);
          
          if (side === "player") {
            return { 
              player: updatedCharacter,
              enemy: updatedOpponent,
            };
          } else {
            return { 
              player: updatedOpponent,
              enemy: updatedCharacter,
            };
          }
        }
        
        return side === "player" 
          ? { player: updatedCharacter } 
          : { enemy: updatedCharacter };
      });
    },
    
    specialAttack: (side) => {
      const state = get();
      const character = side === "player" ? state.player : state.enemy;
      const opponent = side === "player" ? state.enemy : state.player;
      
      // Can't use special attack if stunned, fallen, recovering, or recently attacked
      if (character.state === "stunned" || 
          character.state === "fallen" || 
          character.state === "recovering" ||
          character.state === "attacking" ||
          Date.now() - character.lastAttackTime < 1000) { // Longer cooldown for special
        return;
      }
      
      // Check if opponent is in range
      const charX = character.position[0];
      const oppX = opponent.position[0];
      const distance = Math.abs(charX - oppX);
      const attackRange = 2.5; // Slightly longer range for special
      
      set((state) => {
        const updatedCharacter = {
          ...character,
          state: "attacking",
          isFlashing: true,
          lastAttackTime: Date.now(),
        };
        
        // If in range and facing the right direction, process the hit
        if (distance <= attackRange && 
            ((character.direction === 1 && charX < oppX) || 
             (character.direction === -1 && charX > oppX))) {
          
          const damage = 15; // Special attack damage
          const updatedOpponent = processHit(opponent, damage, true); // Ignores defense
          
          if (side === "player") {
            return { 
              player: updatedCharacter,
              enemy: updatedOpponent,
            };
          } else {
            return { 
              player: updatedOpponent,
              enemy: updatedCharacter,
            };
          }
        }
        
        return side === "player" 
          ? { player: updatedCharacter } 
          : { enemy: updatedCharacter };
      });
      
      // Reset flashing after a short delay
      setTimeout(() => {
        set((state) => {
          const updatedChar = side === "player" ? state.player : state.enemy;
          const updated = { ...updatedChar, isFlashing: false };
          
          return side === "player" 
            ? { player: updated } 
            : { enemy: updated };
        });
      }, 300);
    },
    
    useSkill: (side, skillId) => {
      const state = get();
      const character = side === "player" ? state.player : state.enemy;
      const opponent = side === "player" ? state.enemy : state.player;
      
      // Can't use skill if stunned, fallen, recovering, attacking or defending
      if (character.state === "stunned" || 
          character.state === "fallen" || 
          character.state === "recovering" ||
          character.state === "attacking" ||
          character.isDefending) { // 방어 중에는 스킬 사용 불가
        return;
      }
      
      // Find the skill
      const skillIndex = character.skills.findIndex(skill => skill.id === skillId);
      if (skillIndex === -1) return;
      
      const skill = character.skills[skillIndex];
      
      // Check if skill is on cooldown
      if (Date.now() - skill.lastUsed < skill.cooldown) {
        return;
      }
      
      // Check if opponent is in range
      const charX = character.position[0];
      const oppX = opponent.position[0];
      const distance = Math.abs(charX - oppX);
      
      set((state) => {
        // Update skill cooldown
        const updatedSkills = [...character.skills];
        updatedSkills[skillIndex] = {
          ...skill,
          lastUsed: Date.now(),
        };
        
        // Create updated character with attacking state
        const updatedCharacter = {
          ...character,
          state: "attacking",
          skills: updatedSkills,
          lastAttackTime: Date.now(),
        };
        
        // 특수한 스킬 사용 방식들 처리
        
        // 스킬 타입이 defense일 경우 방어 처리
        if (skill.type === "defense") {
          const updatedWithDefense = {
            ...updatedCharacter, 
            isDefending: true,
            invulnerable: true, // 방어 스킬은 일시적인 무적 효과 추가
          };
          
          // 일정 시간 후 방어 해제를 위한 타이머
          setTimeout(() => {
            set((state) => {
              const currentChar = side === "player" ? state.player : state.enemy;
              return side === "player" 
                ? { player: {...currentChar, isDefending: false, invulnerable: false, state: "idle"} } 
                : { enemy: {...currentChar, isDefending: false, invulnerable: false, state: "idle"} };
            });
          }, skill.duration);
          
          return side === "player" 
            ? { player: updatedWithDefense } 
            : { enemy: updatedWithDefense };
        }
        
        // 회복 스킬인 경우 자신의 체력을 회복
        if (skill.effect === "heal" && skill.damage < 0) {
          const healAmount = Math.abs(skill.damage);
          const healthAfterHeal = Math.min(character.health + healAmount, character.maxHealth);
          
          // 치유 효과 표시를 위한 깜빡임
          const updatedWithHeal = {
            ...updatedCharacter, 
            health: healthAfterHeal,
            isFlashing: true
          };
          
          // 깜빡임 효과 제거 타이머
          setTimeout(() => {
            set((state) => {
              const currentChar = side === "player" ? state.player : state.enemy;
              return side === "player" 
                ? { player: {...currentChar, isFlashing: false} } 
                : { enemy: {...currentChar, isFlashing: false} };
            });
          }, 500);
          
          return side === "player" 
            ? { player: updatedWithHeal } 
            : { enemy: updatedWithHeal };
        }
        
        // 캐릭터 타입별 스킬 사용 패턴 분기
        let inRange = false;
        let updatedOpponent = {...opponent};
        let finalDamage = skill.damage;
        let ignoresDefense = false;
        
        // 캐릭터 타입별로 다른 스킬 범위 및 패턴 적용
        switch(character.type) {
          case "warrior":
            // 전사 - 근접 공격 중심, 주로 정면 공격
            if (skill.id === 1) { // 대쉬 어택 - 전방으로 돌진하며 공격
              // 대쉬 어택은 더 넓은 범위, 전진도 함께 수행
              updatedCharacter.velocity[0] = character.direction * 15; // 전방으로 빠르게 이동
              inRange = distance <= skill.range + 1 && // 약간 더 넓은 범위
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
            } 
            else if (skill.id === 2) { // 어퍼 슬래시 - 위로 치켜올리는 공격
              inRange = distance <= skill.range && // 일반 범위
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 어퍼컷은 상대를 위로 띄움
                updatedOpponent.velocity[1] = 8; // 위로 강하게 띄움
                updatedOpponent.state = "stunned";
                updatedOpponent.stunTimer = 800;
              }
            } 
            else if (skill.id === 3) { // 삼단 찌르기 - 다단히트 공격
              inRange = distance <= skill.range && // 일반 범위
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 다단히트 구현 - 3번 데미지 적용
                finalDamage = skill.damage * 3; // 3회 데미지
                updatedOpponent.isFlashing = true; // 다단히트는 깜빡임 효과 강화
              }
            } 
            else if (skill.id === 4) { // 카운터 스탠스 - 방어+반격 스킬
              // 카운터 스탠스는 특수 방어 스킬 - 근처에 있어야 효과 발생
              inRange = distance <= skill.range && // 매우 짧은 범위
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 카운터 성공 시 강력한 효과
                finalDamage = skill.damage * 1.5; // 증가된 데미지
                updatedOpponent.state = "stunned";
                updatedOpponent.stunTimer = 1200;
              }
            } 
            else if (skill.id === 5) { // 블레이드 스톰 - 광역 회전 공격
              // 블레이드 스톰은 주변 모든 방향 공격 - 방향 무관
              inRange = distance <= skill.range; // 모든 방향 범위 체크
              if (inRange) {
                // 회전 공격은 넉백 효과가 강함
                if (charX < oppX) {
                  updatedOpponent.velocity[0] = 12; // 오른쪽으로 강하게 밀어냄
                } else {
                  updatedOpponent.velocity[0] = -12; // 왼쪽으로 강하게 밀어냄
                }
                updatedOpponent.velocity[1] = 5; // 약간 위로도 띄움
              }
            }
            break;
            
          case "mage":
            // 마법사 - 원거리 마법 공격, 다양한 효과
            if (skill.id === 1) { // 파이어볼 - 단일 원거리 투사체
              // 사용 방향으로 원거리 발사체 발사
              inRange = distance <= skill.range && // 매우 긴 범위
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              // 파이어볼은 방어를 일부 무시함
              ignoresDefense = true;
            } 
            else if (skill.id === 2) { // 얼음 화살 - 느려지는 효과
              inRange = distance <= skill.range && 
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 얼음 화살은 상대를 얼려서 움직임을 방해
                updatedOpponent.state = "stunned";
                updatedOpponent.stunTimer = 1000;
                // 낮은 데미지, 긴 스턴 효과
              }
            } 
            else if (skill.id === 3) { // 텔레포트 - 순간이동 기동기
              // 텔레포트는 공격이 아닌 이동 스킬
              const newPosX = character.position[0] + (character.direction * skill.range);
              updatedCharacter.position[0] = newPosX;
              updatedCharacter.invulnerable = true; // 텔레포트 중 무적
              
              // 무적 해제 타이머
              setTimeout(() => {
                set((state) => {
                  const currentChar = side === "player" ? state.player : state.enemy;
                  return side === "player" 
                    ? { player: {...currentChar, invulnerable: false} } 
                    : { enemy: {...currentChar, invulnerable: false} };
                });
              }, 200);
              
              return side === "player" 
                ? { player: updatedCharacter } 
                : { enemy: updatedCharacter };
            } 
            else if (skill.id === 4) { // 마나 쉴드 - 보호막
              // 마나 쉴드는 방어 스킬 - 이미 위에서 처리됨
              return side === "player" 
                ? { player: updatedCharacter } 
                : { enemy: updatedCharacter };
            } 
            else if (skill.id === 5) { // 메테오 - 강력한 광역 공격
              // 메테오는 넓은 범위에 큰 데미지
              inRange = distance <= skill.range; // 매우 넓은 범위, 방향 무관
              
              if (inRange) {
                // 메테오는 매우 강력하고 방어 효과 감소
                finalDamage = skill.damage;
                ignoresDefense = true;
                // 넉백 효과 추가
                updatedOpponent.velocity[0] = (charX < oppX ? 10 : -10);
                updatedOpponent.velocity[1] = 8;
              }
            }
            break;
            
          case "rogue":
            // 도적 - 빠른 기동성, 은밀한 공격
            if (skill.id === 1) { // 그림자 찌르기 - 빠른 근접 공격
              // 전방으로 빠르게 이동하여 공격
              updatedCharacter.velocity[0] = character.direction * 10;
              inRange = distance <= skill.range && 
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 빠른 연속 공격 효과
                finalDamage = skill.damage;
                // 블리드 효과로 추가 데미지
                if (skill.effect === "bleed") {
                  finalDamage *= 1.2;
                }
              }
            } 
            else if (skill.id === 2) { // 독 단검 - 중독 효과
              inRange = distance <= skill.range && 
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 독 효과로 더 큰 데미지
                finalDamage = skill.damage * 1.5;
                updatedOpponent.isFlashing = true;
              }
            } 
            else if (skill.id === 3) { // 그림자 도약 - 회피 이동기
              // 도약은 이동 스킬
              const newPosX = character.position[0] + (character.direction * skill.range);
              updatedCharacter.position[0] = newPosX;
              updatedCharacter.velocity[1] = 5; // 위로 살짝 점프
              updatedCharacter.invulnerable = true; // 그림자 도약 중 무적
              
              // 무적 해제 타이머
              setTimeout(() => {
                set((state) => {
                  const currentChar = side === "player" ? state.player : state.enemy;
                  return side === "player" 
                    ? { player: {...currentChar, invulnerable: false} } 
                    : { enemy: {...currentChar, invulnerable: false} };
                });
              }, 400);
              
              return side === "player" 
                ? { player: updatedCharacter } 
                : { enemy: updatedCharacter };
            } 
            else if (skill.id === 4) { // 연막탄 - 스턴 효과
              inRange = distance <= skill.range;
              
              if (inRange) {
                // 연막 효과로 스턴
                updatedOpponent.state = "stunned";
                updatedOpponent.stunTimer = 800;
                finalDamage = skill.damage;
              }
            } 
            else if (skill.id === 5) { // 암살 - 강력한 단일 타격
              inRange = distance <= skill.range && 
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 체력이 낮을수록 더 큰 데미지
                const healthPercent = opponent.health / opponent.maxHealth;
                finalDamage = skill.damage * (2 - healthPercent); // 체력이 적을수록 더 큰 데미지
                
                // 넉백 효과
                updatedOpponent.velocity[0] = character.direction * 12;
                updatedOpponent.velocity[1] = 6;
              }
            }
            break;
            
          case "paladin":
            // 성기사 - 높은 방어력, 보호와 회복 능력
            if (skill.id === 1) { // 성스러운 일격 - 기본 공격
              inRange = distance <= skill.range && 
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 성스러운 효과로 데미지 증가
                finalDamage = skill.damage;
                // 넉백 효과
                updatedOpponent.velocity[0] = character.direction * 8;
              }
            } 
            else if (skill.id === 2) { // 심판의 망치 - 강한 넉백
              inRange = distance <= skill.range && 
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
              
              if (inRange) {
                // 강력한 넉백 효과
                updatedOpponent.velocity[0] = character.direction * 15;
                updatedOpponent.velocity[1] = 7;
                finalDamage = skill.damage;
              }
            } 
            else if (skill.id === 3) { // 신성한 보호막 - 이제 자동 가드가 아닌 피해 흡수 쉴드
              // 보호막 쉴드 적용 (일정량의 피해를 흡수)
              const shieldAmount = 80; // 80의 피해를 흡수하는 쉴드
              const updatedWithShield = {
                ...updatedCharacter,
                shield: shieldAmount,
                shieldDuration: skill.duration,
                isFlashing: true // 쉴드 효과 시각화
              };
              
              // 쉴드 깜빡임 효과 제거 타이머
              setTimeout(() => {
                set((state) => {
                  const currentChar = side === "player" ? state.player : state.enemy;
                  return side === "player" 
                    ? { player: {...currentChar, isFlashing: false} } 
                    : { enemy: {...currentChar, isFlashing: false} };
                });
              }, 300);
              
              // 쉴드 지속시간 종료 타이머
              setTimeout(() => {
                set((state) => {
                  const currentChar = side === "player" ? state.player : state.enemy;
                  if (currentChar.shield > 0) { // 아직 쉴드가 남아있다면
                    return side === "player" 
                      ? { player: {...currentChar, shield: 0, shieldDuration: 0} } 
                      : { enemy: {...currentChar, shield: 0, shieldDuration: 0} };
                  }
                  return {};
                });
              }, skill.duration);
              
              return side === "player" 
                ? { player: updatedWithShield } 
                : { enemy: updatedWithShield };
            } 
            else if (skill.id === 4) { // 치유의 빛 - 회복 스킬
              // 회복 스킬도 이미 위에서 처리됨
              return side === "player" 
                ? { player: updatedCharacter } 
                : { enemy: updatedCharacter };
            } 
            else if (skill.id === 5) { // 신성 폭발 - 광역 스턴
              inRange = distance <= skill.range; // 넓은 범위, 방향 무관
              
              if (inRange) {
                // 신성 폭발은 광역으로 스턴
                updatedOpponent.state = "stunned";
                updatedOpponent.stunTimer = 1200;
                finalDamage = skill.damage;
                // 약간의 넉백
                if (charX < oppX) {
                  updatedOpponent.velocity[0] = 8;
                } else {
                  updatedOpponent.velocity[0] = -8;
                }
                updatedOpponent.velocity[1] = 5;
              }
            }
            break;
            
          default:
            // 기본 공격 판정: 범위 안에 있고 올바른 방향을 바라보고 있는지
            inRange = distance <= skill.range && 
                ((character.direction === 1 && charX < oppX) || 
                 (character.direction === -1 && charX > oppX));
            
            // 스킬 효과에 따른 추가 처리
            if (skill.effect && inRange) {
              switch(skill.effect) {
                case "stun":
                  updatedOpponent.stunTimer = 1500; // 1.5초 스턴
                  updatedOpponent.state = "stunned";
                  break;
                case "knockback":
                  // 넉백
                  updatedOpponent.velocity = [
                    character.direction * 15, // 가로 넉백
                    5, // 약간 위로도 띄우기
                    0
                  ];
                  break;
                case "bleed":
                  // 출혈 - 기본 데미지를 약간 증가시킴
                  finalDamage = Math.floor(finalDamage * 1.2);
                  break;
                case "buff":
                  // 버프 효과 - 방어 무시
                  ignoresDefense = true;
                  break;
              }
            }
        }
        
        // 데미지 적용 처리
        if (inRange) {
          // 적이 방어중이고 방어를 무시하지 않는 경우, 데미지 감소
          if (opponent.isDefending && !ignoresDefense) {
            finalDamage = Math.floor(finalDamage / 2);
          }
          
          // 데미지 처리
          if (finalDamage > 0) {
            updatedOpponent = processHit(updatedOpponent, finalDamage, ignoresDefense);
          }
          
          if (side === "player") {
            return { 
              player: updatedCharacter,
              enemy: updatedOpponent,
            };
          } else {
            return { 
              player: updatedOpponent,
              enemy: updatedCharacter,
            };
          }
        }
        
        return side === "player" 
          ? { player: updatedCharacter } 
          : { enemy: updatedCharacter };
      });
    },
    
    selectCharacter: (characterType) => {
      set((state) => {
        // 새로운 캐릭터 생성
        const newPlayer = createInitialCharacter("player", characterType);
        
        return {
          selectedCharacterType: characterType,
          player: newPlayer
        };
      });
    },
    
    updateGameState: (deltaTime) => {
      set((state) => {
        if (state.gamePhase !== "fighting") return {};
        
        const player = { ...state.player };
        const enemy = { ...state.enemy };
        const elapsed = state.elapsedTime + deltaTime;
        
        // Process player & enemy physics and states
        const updatedPlayer = updateCharacterPhysics(player, state.platformPositions, state.gravity, deltaTime);
        const updatedEnemy = updateCharacterPhysics(enemy, state.platformPositions, state.gravity, deltaTime);
        
        // Update cooldowns (for UI display)
        const updatedPlayerSkills = updatedPlayer.skills.map(skill => ({ ...skill }));
        const updatedEnemySkills = updatedEnemy.skills.map(skill => ({ ...skill }));
        
        // Simple AI for enemy
        const aiEnemy = processEnemyAI(updatedEnemy, updatedPlayer, elapsed);
        
        // Check win condition
        let gamePhase = state.gamePhase;
        let winner = state.winner;
        
        if (updatedPlayer.health <= 0) {
          gamePhase = "match_end";
          winner = "enemy";
          playSuccessSound();
        } else if (aiEnemy.health <= 0) {
          gamePhase = "match_end";
          winner = "player";
          playSuccessSound();
        }
        
        return {
          player: { ...updatedPlayer, skills: updatedPlayerSkills },
          enemy: aiEnemy,
          elapsedTime: elapsed,
          gamePhase,
          winner
        };
      });
    }
  }))
);

// Helper functions

// Process a hit on a character with given damage
function processHit(character: Character, damage: number, ignoresDefense: boolean): Character {
  // If invulnerable, no damage
  if (character.invulnerable) return character;
  
  // 기본 데미지 계산
  let actualDamage = damage;
  
  // 방어 중일 때 데미지 감소 (방어 무시가 아닌 경우)
  if (character.isDefending && !ignoresDefense) {
    actualDamage = Math.floor(damage / 2);
  }
  
  // 쉴드가 있는 경우 쉴드로 데미지 흡수
  let remainingShield = character.shield;
  let remainingDamage = actualDamage;
  
  if (remainingShield > 0) {
    // 쉴드가 데미지보다 크면 쉴드만 감소
    if (remainingShield >= remainingDamage) {
      remainingShield -= remainingDamage;
      remainingDamage = 0;
    } 
    // 쉴드가 데미지보다 작으면 쉴드를 모두 소진하고 남은 데미지만 체력에 적용
    else {
      remainingDamage -= remainingShield;
      remainingShield = 0;
    }
  }
  
  // Play hit sound
  playHitSound();
  
  // Calculate new health - 남은 데미지만 적용
  const newHealth = Math.max(0, character.health - remainingDamage);
  
  // 넉백 효과 - 실제 입은 데미지에 비례하여 증가
  const totalDamageTaken = actualDamage - (character.shield - remainingShield);
  let knockbackForce = totalDamageTaken * 0.5; // 실제 데미지에 비례한 넉백 힘
  
  // 넉백 방향 - 맞은 방향의 반대쪽
  const knockbackDirection = character.direction * -1; // 바라보는 방향의 반대로 넉백
  
  // 기본 상태 업데이트 - 넉백 적용
  let updatedCharacter = {
    ...character,
    health: newHealth,
    shield: remainingShield, // 남은 쉴드 업데이트
    velocity: [
      character.velocity[0] + knockbackDirection * knockbackForce, 
      character.velocity[1] + 2, // 약간 위로도 올라가도록
      character.velocity[2]
    ]
  };
  
  // 기절 효과는 체력 손실에 따라 별도로 적용 (체력의 20% 이상 손실 시에만)
  if (actualDamage > character.maxHealth * 0.2) {
    updatedCharacter = {
      ...updatedCharacter,
      state: "stunned",
      stunTimer: 300 + actualDamage * 5, // 데미지에 비례한 스턴 시간
    };
  }
  
  // Knockdown (health reduced to 0)
  if (newHealth <= 0) {
    // Fallen time is inversely proportional to stamina percentage
    // Lower stamina = longer fallen time
    const staminaPercentage = character.stamina / character.maxStamina;
    const baseFallenTime = 1500; // 1.5 seconds base time
    const maxFallenTime = 3000;  // 3 seconds max time
    
    // Inverse relationship: lower stamina = longer fallen time
    // When stamina is 100%, fallen time is base; when stamina is 0%, fallen time is max
    const fallenTime = Math.round(baseFallenTime + (1 - staminaPercentage) * (maxFallenTime - baseFallenTime));
    
    // 더 강한 넉백 적용 (쓰러질 때)
    updatedCharacter = {
      ...updatedCharacter,
      health: 0,
      state: "fallen",
      stunTimer: fallenTime, 
      invulnerable: true,
      velocity: [
        knockbackDirection * 15, // 매우 강한 넉백
        8, // 더 높게 띄우기
        0
      ]
    };
  }
  
  // 시각적 피드백을 위한 깜박임 효과 추가
  updatedCharacter.isFlashing = true;
  
  return updatedCharacter;
}

// Update character physics (gravity, movement, collisions)
function updateCharacterPhysics(
  character: Character, 
  platforms: [number, number, number][], 
  gravity: number, 
  deltaTime: number
): Character {
  // 상대 캐릭터와의 충돌을 확인하기 위해 상태 가져오기
  const globalState = useFighting.getState();
  const opponent = character.side === "player" ? globalState.enemy : globalState.player;
  const { 
    position, velocity, state, stunTimer, stamina, maxStamina, 
    staminaRechargeRate, staminaDefenseDrain, isStaminaDepleted, 
    staminaRecoveryTimer, shield, shieldDuration 
  } = character;
  
  // 쉴드 지속시간 처리
  let newShield = shield;
  let newShieldDuration = shieldDuration;
  
  if (shield > 0 && shieldDuration > 0) {
    // 시간 경과에 따른 쉴드 지속시간 감소
    newShieldDuration = Math.max(0, shieldDuration - deltaTime);
    
    // 지속시간이 끝나면 쉴드 제거
    if (newShieldDuration <= 0) {
      newShield = 0;
    }
  }
  
  // 캐릭터 기본 크기
  const CHARACTER_WIDTH = 1;
  const CHARACTER_HEIGHT = 1;
  
  // Handle stamina for both players
  let newStamina = stamina;
  let newIsStaminaDepleted = isStaminaDepleted;
  let newStaminaRecoveryTimer = staminaRecoveryTimer;
  
  // If character is defending, drain stamina
  if (state === "defending") {
    newStamina = Math.max(0, stamina - staminaDefenseDrain * deltaTime);
    
    // If stamina is depleted, stop defending and set recovery timer
    if (newStamina === 0 && !isStaminaDepleted) {
      newIsStaminaDepleted = true;
      newStaminaRecoveryTimer = 2; // 2 seconds recovery time
      return {
        ...character,
        stamina: 0,
        isDefending: false,
        isStaminaDepleted: true,
        staminaRecoveryTimer: 2,
        state: "idle"
      };
    }
  } 
  // If not defending, recharge stamina (only if not in depleted state)
  else if (!isStaminaDepleted) {
    newStamina = Math.min(maxStamina, stamina + staminaRechargeRate * deltaTime);
  }
  // If in stamina depleted state, update recovery timer
  else if (isStaminaDepleted) {
    newStaminaRecoveryTimer = Math.max(0, staminaRecoveryTimer - deltaTime);
    
    // If recovery timer is done, reset stamina depletion state
    if (newStaminaRecoveryTimer === 0) {
      newIsStaminaDepleted = false;
      newStamina = maxStamina * 0.3; // Start with 30% stamina after depletion
    }
  }
  
  // Handle stun timer
  if (state === "stunned" && stunTimer > 0) {
    const newStunTimer = stunTimer - deltaTime * 1000;
    if (newStunTimer <= 0) {
      return { 
        ...character, 
        stunTimer: 0, 
        state: "idle",
        stamina: newStamina,
        isStaminaDepleted: newIsStaminaDepleted,
        staminaRecoveryTimer: newStaminaRecoveryTimer
      };
    }
    return { 
      ...character, 
      stunTimer: newStunTimer,
      stamina: newStamina,
      isStaminaDepleted: newIsStaminaDepleted,
      staminaRecoveryTimer: newStaminaRecoveryTimer
    };
  }
  
  // Handle knockdown and recovery
  if (state === "fallen" && stunTimer > 0) {
    const newStunTimer = stunTimer - deltaTime * 1000;
    if (newStunTimer <= 0) {
      return { 
        ...character, 
        stunTimer: 800, // Recovery time
        state: "recovering",
        invulnerable: true // Still invulnerable during recovery
      };
    }
    return { ...character, stunTimer: newStunTimer };
  }
  
  // Handle recovery period
  if (state === "recovering" && stunTimer > 0) {
    const newStunTimer = stunTimer - deltaTime * 1000;
    if (newStunTimer <= 0) {
      return { 
        ...character, 
        stunTimer: 0, 
        state: "idle",
        invulnerable: false // No longer invulnerable
      };
    }
    return { ...character, stunTimer: newStunTimer };
  }
  
  // Reset attack state after a short period
  if (state === "attacking" && Date.now() - character.lastAttackTime > 400) {
    return { ...character, state: "idle" };
  }
  
  // Apply movement based on state
  let newVelocity = [...velocity];
  let newPosition = [...position];
  
  // Apply gravity if in the air
  newVelocity[1] -= gravity * deltaTime;
  
  // Update position based on velocity
  if (state !== "stunned" && state !== "fallen" && state !== "recovering" && state !== "attacking") {
    if (state === "running") {
      // Move in facing direction
      const speed = 8; // Increased speed for more responsive movement
      newVelocity[0] = character.direction * speed;
    } else if (state !== "defending") {
      // Slow down horizontal movement if not running or defending
      newVelocity[0] *= 0.85; // Faster deceleration
    }
  } else if (state === "attacking") {
    // 공격 중에는 더 강한 감속 적용 (거의 움직이지 않게 함)
    newVelocity[0] *= 0.3; // Much stronger deceleration during attacks
  } else {
    // Apply less friction during stun or knockdown
    newVelocity[0] *= 0.95;
  }
  
  // Update position
  newPosition[0] += newVelocity[0] * deltaTime;
  newPosition[1] += newVelocity[1] * deltaTime;
  
  // 캐릭터 충돌 처리 (겹치지 않도록) + 오래 붙어있을 때 튕겨나가는 기능 추가
  // 충돌 데이터 초기화
  if (!character.collisionData) {
    character.collisionData = {
      isColliding: false,
      collisionStartTime: 0,
      lastCollisionTime: 0,
      collisionDuration: 0
    };
  }
  
  const characterCollision = () => {
    // 두 캐릭터 사이의 거리 계산
    const opponentPos = opponent.position;
    const distanceX = Math.abs(newPosition[0] - opponentPos[0]);
    const distanceY = Math.abs(newPosition[1] - opponentPos[1]);
    
    // 캐릭터 충돌 박스 크기 (충돌 감지용)
    const minDistance = CHARACTER_WIDTH * 0.9; // 약간 더 작게 설정
    
    // 수평 충돌 감지 (땅에 서있을 때 적용)
    if (distanceX < minDistance && distanceY < CHARACTER_HEIGHT && 
        velocity[1] <= 0 && opponent.velocity[1] <= 0) {
      
      // 현재 시간 가져오기
      const currentTime = Date.now();
      
      // 충돌 상태 업데이트
      const collisionData = character.collisionData;
      if (collisionData && !collisionData.isColliding) {
        // 이제 막 충돌 시작
        collisionData.isColliding = true;
        collisionData.collisionStartTime = currentTime;
      } else if (collisionData) {
        // 충돌 중 - 충돌 지속 시간 계산
        collisionData.collisionDuration = 
          currentTime - collisionData.collisionStartTime;
      }
      
      // 충돌 시간 업데이트
      if (collisionData) {
        collisionData.lastCollisionTime = currentTime;
      }
      
      // 1.5초(1500ms) 이상 붙어있으면 튕겨나가는 효과 + 데미지 적용
      if (collisionData && collisionData.collisionDuration >= 1500) {
        // 충돌 시간 초기화
        collisionData.isColliding = false;
        collisionData.collisionDuration = 0;
        collisionData.collisionStartTime = 0;
        
        // 양쪽 모두 강하게 튕겨나가도록 처리
        // 플레이어와 적 모두에게 영향을 주기 위해 상태 업데이트 로직 추가
        const store = useFighting.getState();
        const updateState = store as any; // zustand 상태 업데이트 함수 참조
        
        // 상태 업데이트 타이머로 지연 실행
        setTimeout(() => {
          // 상태 업데이트를 직접 수행
          const currentPlayer = useFighting.getState().player;
          const currentEnemy = useFighting.getState().enemy;
          
          // 플레이어와 적이 튕겨나가는 방향 결정 (서로 반대 방향)
          const playerDir = currentPlayer.position[0] < currentEnemy.position[0] ? -1 : 1;
          const enemyDir = -playerDir as -1 | 1; // 플레이어와 반대 방향
          
          // 강한 넉백 속도
          const knockbackForce = 15;
          const upwardForce = 7;
          
          // 데미지 적용 (체력의 5% 정도)
          const damage = Math.max(5, Math.floor(currentPlayer.maxHealth * 0.05));
          
          // 플레이어 상태 업데이트
          const updatedPlayer = {
            ...currentPlayer,
            health: Math.max(0, currentPlayer.health - damage),
            velocity: [playerDir * knockbackForce, upwardForce, 0] as [number, number, number],
            isFlashing: true, // 피해 시각화
          };
          
          // 적 상태 업데이트
          const updatedEnemy = {
            ...currentEnemy,
            health: Math.max(0, currentEnemy.health - damage),
            velocity: [enemyDir * knockbackForce, upwardForce, 0] as [number, number, number],
            isFlashing: true, // 피해 시각화
          };
          
          // 업데이트된 캐릭터 상태 적용
          useFighting.setState({
            player: updatedPlayer,
            enemy: updatedEnemy
          });
          
          // 깜빡임 효과 제거 타이머
          setTimeout(() => {
            useFighting.setState(state => ({
              player: { ...state.player, isFlashing: false },
              enemy: { ...state.enemy, isFlashing: false }
            }));
          }, 300);
          
          // 현재 시간 참조용
          const nowTime = Date.now();
          
          // 양쪽 모두 충돌 상태 초기화 - 타입 캐스팅으로 업데이트
          if (updatedPlayer.collisionData) {
            updatedPlayer.collisionData = {
              isColliding: false,
              collisionStartTime: 0,
              lastCollisionTime: nowTime,
              collisionDuration: 0
            };
          }
          
          if (updatedEnemy.collisionData) {
            updatedEnemy.collisionData = {
              isColliding: false,
              collisionStartTime: 0,
              lastCollisionTime: nowTime,
              collisionDuration: 0
            };
          }
        }, 0);
        
        // 밀려나는 방향 결정
        const pushDirection = newPosition[0] < opponentPos[0] ? -1 : 1;
        
        // 충돌 응답: 위치 조정
        newPosition[0] = opponentPos[0] + pushDirection * minDistance;
        
        // 충돌로 충격이 가해짐
        playHitSound();
        
        return true;
      } else {
        // 일반 충돌 처리
        const pushDirection = newPosition[0] < opponentPos[0] ? -1 : 1;
        
        // 충돌 응답: 위치 조정
        newPosition[0] = opponentPos[0] + pushDirection * minDistance;
        
        // 충돌 후 속도 감소
        newVelocity[0] *= 0.5;
        
        return true;
      }
    } else {
      // 충돌 상태가 종료됨
      if (character.collisionData && character.collisionData.isColliding) {
        character.collisionData.isColliding = false;
        character.collisionData.collisionDuration = 0;
      }
      
      return false;
    }
  };
  
  // 캐릭터 충돌 검사 실행
  const hasCollision = characterCollision();
  
  // Check platform collisions (개선된 충돌 처리)
  let onGround = false;
  
  for (const platform of platforms) {
    const [platformX, platformY, platformZ] = platform;
    
    // Platform dimensions
    const platformWidth = 20; // 더 넓은 단일 플랫폼
    const platformHeight = 0.5;
    
    // Character dimensions
    const charWidth = 1;
    const charHeight = 1; // 캐릭터 높이를 1로 수정 (2였음 - 사각형 크기에 맞춤)
    
    // Check if character is within horizontal bounds of platform
    const horizontalOverlap = 
      newPosition[0] + charWidth/2 >= platformX - platformWidth/2 &&
      newPosition[0] - charWidth/2 <= platformX + platformWidth/2;
      
    if (horizontalOverlap) {
      // 발 위치
      const charFeet = newPosition[1] - charHeight/2;
      // 플랫폼 표면 위치
      const platformSurface = platformY + platformHeight/2;
      
      // 이전 프레임에서 캐릭터가 플랫폼 위에 있었는지 확인
      const wasFeetAbovePlatform = position[1] - charHeight/2 >= platformSurface;
      
      // 현재 프레임에서 플랫폼에 착지 중인지 확인
      const isFeetAtPlatform = 
        charFeet <= platformSurface && 
        charFeet >= platformSurface - 0.2; // 약간의 여유를 두어 더 정확한 착지 감지
      
      // 플랫폼에 착지하는 경우 (위에서 내려오면서 착지)
      if (wasFeetAbovePlatform && isFeetAtPlatform && newVelocity[1] <= 0) {
        newPosition[1] = platformSurface + charHeight/2; // 플랫폼 위에 정확히 위치
        newVelocity[1] = 0; // 수직 속도 제거
        onGround = true;
        
        // If we were jumping, return to idle
        if (state === "jumping") {
          return {
            ...character,
            position: newPosition as [number, number, number],
            velocity: newVelocity as [number, number, number],
            state: "idle"
          };
        }
      }
      
      // 캐릭터의 머리가 플랫폼 아래를 치는 경우 - 점프 중 천장 충돌
      const charHead = newPosition[1] + charHeight/2;
      const platformBottom = platformY - platformHeight/2;
      
      if (charHead >= platformBottom && charHead <= platformBottom + 0.2 && newVelocity[1] > 0) {
        newPosition[1] = platformBottom - charHeight/2 - 0.01; // 살짝 아래로 이동
        newVelocity[1] = 0; // 수직 속도 차단
      }
    }
  }
  
  // Arena bounds checks (세계 경계)
  const arenaWidth = 20; // 더 넓게 변경
  if (newPosition[0] < -arenaWidth/2) {
    newPosition[0] = -arenaWidth/2;
    newVelocity[0] = 0;
  } else if (newPosition[0] > arenaWidth/2) {
    newPosition[0] = arenaWidth/2;
    newVelocity[0] = 0;
  }
  
  // 캐릭터가 지정된 높이 아래로 떨어지면 중앙으로 리셋하고 데미지 적용
  if (newPosition[1] < -4) {
    // 중앙 플랫폼으로 리셋
    newPosition = [0, 2, 0]; // 약간 높게 시작하여 부드럽게 착지
    newVelocity = [0, 0, 0];
    
    // 추락 데미지 적용 (최대 체력의 15%)
    const fallDamage = Math.round(character.maxHealth * 0.15);
    
    return {
      ...character,
      position: newPosition as [number, number, number],
      velocity: newVelocity as [number, number, number],
      health: Math.max(0, character.health - fallDamage),
      state: "stunned",
      stunTimer: 600, // 리스폰 시 짧게 스턴 (증가)
      isFlashing: true // 데미지 표시용 깜빡임
    };
  }
  
  return {
    ...character,
    position: newPosition as [number, number, number],
    velocity: newVelocity as [number, number, number],
    shield: newShield,
    shieldDuration: newShieldDuration,
    stamina: newStamina,
    isStaminaDepleted: newIsStaminaDepleted,
    staminaRecoveryTimer: newStaminaRecoveryTimer
  };
}

// Improved enemy AI with better skill usage and tactics
function processEnemyAI(enemy: Character, player: Character, elapsedTime: number): Character {
  // 행동 불가 상태면 현재 상태 유지
  if (enemy.state === "stunned" || enemy.state === "fallen" || enemy.state === "recovering" || enemy.state === "attacking") {
    return enemy;
  }
  
  // AI 결정 빈도 조절 (500ms 마다)
  const now = Date.now();
  if (now % 500 >= 100) {
    return enemy; // 결정 시간이 아니면 현재 상태 유지
  }
  
  console.log("AI 결정 진행: ", enemy.type, now);
  
  // 플레이어를 향하도록 방향 설정
  const direction = player.position[0] < enemy.position[0] ? -1 : 1;
  const updatedEnemy = { ...enemy, direction: direction as -1 | 1 };
  
  // 거리 계산 - 수평 및 수직 거리
  const distanceX = Math.abs(player.position[0] - enemy.position[0]);
  const distanceY = Math.abs(player.position[1] - enemy.position[1]);
  const inAttackRange = distanceX < 2.5 && distanceY < 1.5; // 더 정확한 범위 체크
  
  // 필요한 함수들
  const { basicAttack, specialAttack, useSkill } = useFighting.getState();
  
  // 1. 근접 공격 실행 (쿨다운 시간을 플레이어와 동일하게 500ms로 설정)
  if (inAttackRange && now - updatedEnemy.lastAttackTime > 500) {
    console.log("적 공격 시도!", distanceX, distanceY, now - updatedEnemy.lastAttackTime);
    
    // 캐릭터 타입별 공격 선택
    const typeBasedAttackChoice = Math.random();
    
    if (updatedEnemy.type === "warrior") {
      // 전사는 대부분 기본 공격 
      if (typeBasedAttackChoice < 0.6) {
        console.log("전사 기본 공격");
        basicAttack("enemy");
      } else {
        console.log("전사 특수 공격");
        specialAttack("enemy");
      }
    } else if (updatedEnemy.type === "mage") {
      // 마법사는 특수 공격 선호
      if (typeBasedAttackChoice < 0.3) {
        console.log("마법사 기본 공격");
        basicAttack("enemy");
      } else {
        console.log("마법사 특수 공격");
        specialAttack("enemy");
      }
    } else if (updatedEnemy.type === "rogue") {
      // 도적은 빠른 기본 공격 위주
      if (typeBasedAttackChoice < 0.7) {
        console.log("도적 기본 공격");
        basicAttack("enemy");
      } else {
        console.log("도적 특수 공격");
        specialAttack("enemy");
      }
    } else if (updatedEnemy.type === "paladin") {
      // 성기사는 균형 있게
      if (typeBasedAttackChoice < 0.5) {
        console.log("성기사 기본 공격");
        basicAttack("enemy");
      } else {
        console.log("성기사 특수 공격");
        specialAttack("enemy");
      }
    }
    
    // 공격 상태로 업데이트
    updatedEnemy.state = "attacking";
    return updatedEnemy;
  }
  
  // 2. 스킬 사용 (쿨다운이 끝난 스킬만)
  const availableSkills = updatedEnemy.skills.filter(skill => 
    now - skill.lastUsed >= skill.cooldown
  );
  
  // 스킬 사용 높은 확률 (70%)로 변경
  if (availableSkills.length > 0 && inAttackRange && Math.random() < 0.7) {
    // 데미지가 높은 스킬 우선 사용 (정렬)
    availableSkills.sort((a, b) => b.damage - a.damage);
    const selectedSkill = availableSkills[0]; // 가장 데미지가 높은 스킬 선택
    
    console.log(`스킬 사용: ${selectedSkill.name} (${selectedSkill.id}), 데미지: ${selectedSkill.damage}`);
    useSkill("enemy", selectedSkill.id);
    return updatedEnemy;
  }
  
  // 3. 플레이어에게 다가가기 (거리가 멀면)
  if (!inAttackRange) {
    console.log("플레이어에게 접근 중", distanceX, distanceY);
    updatedEnemy.state = "running";
    return updatedEnemy;
  }
  
  // 4. 가끔 점프 (10% 확률)
  if (Math.random() < 0.1 && updatedEnemy.velocity[1] === 0) {
    console.log("점프 실행");
    updatedEnemy.velocity[1] = 10;
    updatedEnemy.state = "jumping";
    return updatedEnemy;
  }
  
  // 5. 기본 상태
  updatedEnemy.state = "idle";
  return updatedEnemy;
}