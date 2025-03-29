import { useFighting, type CharacterType } from "../lib/stores/useFighting";

// 캐릭터 선택 화면 컴포넌트
export default function CharacterSelection() {
  const availableCharacters = useFighting((state) => state.availableCharacters);
  const selectedCharacterType = useFighting((state) => state.selectedCharacterType);
  const selectCharacter = useFighting((state) => state.selectCharacter);
  const startGame = useFighting((state) => state.startGame);
  
  // 캐릭터 선택 핸들러
  const handleSelectCharacter = (characterType: CharacterType) => {
    selectCharacter(characterType);
  };
  
  // 게임 시작 핸들러
  const handleStartGame = () => {
    startGame();
  };
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-95 z-50">
      <div className="text-white text-3xl font-bold mb-8">캐릭터 선택</div>
      
      <div className="grid grid-cols-2 gap-6 mb-8">
        {availableCharacters.map((character) => (
          <div 
            key={character.type}
            className={`w-80 p-5 rounded-lg cursor-pointer transition-all ${
              selectedCharacterType === character.type
                ? 'bg-opacity-90 border-2 border-white shadow-lg transform scale-105'
                : 'bg-opacity-60 border border-gray-600'
            }`}
            style={{ backgroundColor: character.color }}
            onClick={() => handleSelectCharacter(character.type)}
          >
            <h3 className="text-white text-2xl font-bold mb-2">{character.name}</h3>
            {/* 간결한 설명 - 첫 문장만 표시 */}
            <p className="text-white text-sm mb-3 h-10 overflow-hidden">
              {character.description.length > 70 
                ? character.description.substring(0, 70) + "..." 
                : character.description
              }
            </p>
            
            {/* 캐릭터 스탯 */}
            <div className="grid grid-cols-2 gap-2 text-sm text-white mt-3 mb-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span>체력:</span>
                  <span>{renderStatBars(character.stats.healthMultiplier)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>공격력:</span>
                  <span>{renderStatBars(character.stats.damageMultiplier)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>스태미나:</span>
                  <span>{renderStatBars(character.stats.staminaMultiplier)}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>이동속도:</span>
                  <span>{renderStatBars(character.stats.speedMultiplier)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>방어력:</span>
                  <span>{renderStatBars(character.stats.defenseMultiplier)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>회복력:</span>
                  <span>{renderStatBars(character.stats.recoveryMultiplier)}</span>
                </div>
              </div>
            </div>
            
            {/* 캐릭터 스킬 - 더 간결하게 표시 */}
            <div className="mt-3">
              <p className="text-white text-sm font-semibold border-b border-white pb-1 mb-2">
                주요 스킬
              </p>
              <ul className="text-white text-xs">
                {character.skills.slice(0, 3).map((skill) => (
                  <li key={skill.id} className="mb-2 flex">
                    <span className="font-semibold min-w-[80px] inline-block">{skill.name}:</span>
                    <span className="line-clamp-1 break-words">
                      {/* 스킬 설명 간소화 */}
                      {skill.description.length > 30 
                        ? skill.description.substring(0, 30) + "..."
                        : skill.description
                      }
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xl transition-colors"
        onClick={handleStartGame}
      >
        게임 시작
      </button>
    </div>
  );
}

// 스탯 바 렌더링 함수
function renderStatBars(value: number) {
  // 스탯을 1-5 사이의 값으로 변환
  const normalizedValue = Math.round(value * 3);
  const bars = '★'.repeat(normalizedValue) + '☆'.repeat(5 - normalizedValue);
  return bars;
}