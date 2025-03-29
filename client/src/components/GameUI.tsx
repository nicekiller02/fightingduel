import { useEffect, useState } from "react";
import { useFighting, type Skill } from "../lib/stores/useFighting";
import { toggleBackgroundMusic } from "../lib/sounds";

export default function GameUI() {
  const gamePhase = useFighting((state) => state.gamePhase);
  const player = useFighting((state) => state.player);
  const enemy = useFighting((state) => state.enemy);
  const winner = useFighting((state) => state.winner);
  const resetGame = useFighting((state) => state.resetGame);
  const startGame = useFighting((state) => state.startGame);
  
  // UI state for skill cooldowns
  const [cooldowns, setCooldowns] = useState<Record<number, number>>({});
  
  // Update cooldowns every 50ms for smoother updates
  useEffect(() => {
    if (gamePhase !== "fighting") {
      // 게임 시작 시 모든 쿨타임 초기화
      setCooldowns({});
      return;
    }
    
    const updateCooldowns = () => {
      const now = Date.now();
      const newCooldowns: Record<number, number> = {};
      
      player.skills.forEach(skill => {
        const elapsed = now - skill.lastUsed;
        const remaining = Math.max(0, skill.cooldown - elapsed);
        const percentage = (remaining / skill.cooldown) * 100;
        newCooldowns[skill.id] = Math.min(percentage, 100); // 최대 100%로 제한
      });
      
      setCooldowns(newCooldowns);
    };
    
    // 초기 실행 즉시
    updateCooldowns();
    
    // 더 빠른 주기로 업데이트
    const intervalId = setInterval(updateCooldowns, 50);
    return () => clearInterval(intervalId);
  }, [gamePhase, player.skills]);
  
  // Game over screen
  if (gamePhase === "match_end" || gamePhase === "menu") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 text-white">
        {gamePhase === "match_end" && (
          <h1 className="text-4xl font-bold mb-4">
            {winner === "player" ? "You Win!" : "You Lose!"}
          </h1>
        )}
        
        {gamePhase === "menu" && (
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-bold mb-2">
              현재 선택된 캐릭터: {player.name}
            </h2>
            
            <div className="flex space-x-4">
              <button 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
                onClick={() => {
                  resetGame();
                  // 음악 재생 중이면 중지
                  toggleBackgroundMusic();
                }}
              >
                캐릭터 선택
              </button>
              
              <button 
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold"
                onClick={() => {
                  startGame();
                }}
              >
                게임 시작
              </button>
            </div>
          </div>
        )}
        
        {gamePhase === "match_end" && (
          <button 
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-xl"
            onClick={() => {
              resetGame();
              // Stop background music
              toggleBackgroundMusic();
            }}
          >
            다시 하기
          </button>
        )}
      </div>
    );
  }
  
  return (
    <>
      {/* Player health and stamina (bottom left) - Compact UI */}
      <div className="absolute left-2 bottom-2 w-48">
        {/* Character type */}
        <div className="mb-1 text-white text-xs font-bold shadow-lg">
          {player.name} ({player.type})
        </div>
        {/* Health bar */}
        <div className="mb-1 text-white text-xs font-bold shadow-lg">
          HP: {player.health}/{player.maxHealth}
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${player.isFlashing ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
          />
        </div>
        
        {/* Stamina bar */}
        <div className="mt-2 mb-0 text-white text-xs font-bold shadow-lg flex justify-between">
          <span>ST: {Math.round(player.stamina)}</span>
          {player.isStaminaDepleted && 
            <span className="text-red-300">
              Recovery: {Math.max(0, Math.round(player.staminaRecoveryTimer * 10) / 10)}s
            </span>
          }
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${player.isStaminaDepleted ? 'bg-red-400' : 'bg-blue-400'}`}
            style={{ width: `${(player.stamina / player.maxStamina) * 100}%` }}
          />
        </div>
        
        {/* Shield bar - only shown when player has shield */}
        {player.shield > 0 && (
          <>
            <div className="mt-2 mb-0 text-white text-xs font-bold shadow-lg flex justify-between">
              <span className={player.type === "paladin" ? "text-yellow-300" : "text-blue-300"}>
                Shield: {Math.round(player.shield)}
              </span>
              {player.shieldDuration > 0 && (
                <span className="text-yellow-200">
                  Duration: {Math.max(0, Math.round(player.shieldDuration * 10) / 10)}s
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  player.type === "paladin" 
                    ? "bg-yellow-400" 
                    : player.type === "mage" 
                      ? "bg-blue-500" 
                      : "bg-white"
                }`}
                style={{ width: `${Math.min(100, player.shield)}%` }}
              />
            </div>
          </>
        )}
        
        {/* Skills and cooldowns (3개만 표시하고 더 크게 표시) */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {player.skills.slice(0, 3).map((skill) => (
            <SkillButton 
              key={skill.id}
              skill={skill}
              cooldownPercentage={cooldowns[skill.id] || 0}
              keyNumber={skill.id} // 키 번호 전달 (1-3)
            />
          ))}
        </div>
        
        {/* Controls help - more compact */}
        <div className="mt-1 text-white text-xs bg-black bg-opacity-70 p-1 rounded text-center">
          <div className="text-xs">→←: 이동 | Q: 방어 | W: 공격 | 1-3: 스킬</div>
        </div>
      </div>
      
      {/* Enemy health (top center) - Compact */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-40">
        <div className="mb-1 text-white text-xs font-bold text-center shadow-lg">
          {enemy.name} ({enemy.type}): {enemy.health}/{enemy.maxHealth}
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${enemy.isFlashing ? 'bg-red-500' : 'bg-red-600'}`}
            style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
          />
        </div>
        
        {/* Enemy shield - only shown when enemy has shield */}
        {enemy.shield > 0 && (
          <>
            <div className="mt-1 mb-0 text-white text-xs font-bold text-center shadow-lg">
              <span className={enemy.type === "paladin" ? "text-yellow-300" : "text-blue-300"}>
                Shield: {Math.round(enemy.shield)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  enemy.type === "paladin" 
                    ? "bg-yellow-400" 
                    : enemy.type === "mage" 
                      ? "bg-blue-500" 
                      : "bg-white"
                }`}
                style={{ width: `${Math.min(100, enemy.shield)}%` }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

// Skill button with cooldown indicator (enhanced version)
function SkillButton({ skill, cooldownPercentage, keyNumber }: { skill: Skill, cooldownPercentage: number, keyNumber?: number }) {
  // Skill type에 따른 버튼 색상 지정
  const getSkillTypeColor = () => {
    if (!skill.type) return 'bg-gray-800';
    
    switch(skill.type) {
      case 'melee': return 'bg-red-800';
      case 'ranged': return 'bg-yellow-800';
      case 'magic': return 'bg-blue-800';
      case 'defense': return 'bg-green-800';
      default: return 'bg-gray-800';
    }
  };
  
  // Effect에 따른 아이콘 표시
  const getEffectIcon = () => {
    if (!skill.effect) return null;
    
    switch(skill.effect) {
      case 'stun': return '⚡';
      case 'knockback': return '←→';
      case 'bleed': return '🩸';
      case 'heal': return '💚';
      case 'buff': return '⬆️';
      default: return null;
    }
  };
  
  // 스킬 범위를 아이콘으로 표시
  const getRangeIcon = () => {
    if (skill.range <= 2) return '⇢'; // 근접
    if (skill.range <= 4) return '⇢⇢'; // 중거리
    return '⇢⇢⇢'; // 원거리
  };
  
  const effectIcon = getEffectIcon();
  const typeColor = getSkillTypeColor();
  const rangeIcon = getRangeIcon();
  
  // 쿨타임 시간을 계산 (초 단위)
  const cooldownSeconds = Math.ceil((skill.cooldown / 1000) * (cooldownPercentage / 100));
  
  return (
    <div className="relative w-12 h-12 group">
      {/* 스킬 버튼 - 스킬 타입별 컬러 적용 */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center ${typeColor} rounded text-white text-sm font-bold border-2 border-gray-500`}
      >
        <div>{keyNumber}</div>
        <div className="text-[8px] mt-1">{rangeIcon}</div>
        {effectIcon && <span className="absolute text-xs right-1 top-1">{effectIcon}</span>}
      </div>
      
      {/* 쿨타임 오버레이 - 하단에서 위로 차오르는 방식에서 원형으로 변경 */}
      {cooldownPercentage > 0 && (
        <div className="absolute inset-0 bg-black bg-opacity-80 rounded flex items-center justify-center text-white font-bold">
          {cooldownSeconds}
        </div>
      )}
      
      {/* 툴팁 - 스킬 정보 표시 확장 */}
      <div className="hidden absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-black bg-opacity-95 text-white text-xs p-2 rounded-md group-hover:block pointer-events-none z-10">
        <div className="font-bold text-sm">{skill.name}</div>
        <div className="text-gray-300 mt-1 mb-1">{skill.description}</div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <span className="font-bold">데미지:</span> {skill.damage}
          </div>
          <div>
            <span className="font-bold">쿨타임:</span> {skill.cooldown/1000}초
          </div>
          <div>
            <span className="font-bold">범위:</span> {skill.range.toFixed(1)}
          </div>
          <div>
            <span className="font-bold">타입:</span> {skill.type}
          </div>
          {skill.effect && (
            <div className="col-span-2">
              <span className="font-bold">효과:</span> {skill.effect}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
