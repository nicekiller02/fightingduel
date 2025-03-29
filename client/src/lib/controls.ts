// Define control keys for the game
export enum Controls {
  LEFT = 'left',
  RIGHT = 'right',
  JUMP = 'jump',
  DEFENSE = 'defense',
  ATTACK = 'attack',
  SPECIAL_ATTACK = 'specialAttack',
  SKILL_1 = 'skill1',
  SKILL_2 = 'skill2',
  SKILL_3 = 'skill3',
  SKILL_4 = 'skill4',
  SKILL_5 = 'skill5',
}

export const controlsMap = [
  { name: Controls.LEFT, keys: ["ArrowLeft"] },
  { name: Controls.RIGHT, keys: ["ArrowRight"] },
  { name: Controls.JUMP, keys: ["ArrowUp"] },
  { name: Controls.DEFENSE, keys: ["KeyQ"] },
  { name: Controls.ATTACK, keys: ["KeyW"] },
  { name: Controls.SPECIAL_ATTACK, keys: ["KeyE"] },
  { name: Controls.SKILL_1, keys: ["Digit1"] },
  { name: Controls.SKILL_2, keys: ["Digit2"] },
  { name: Controls.SKILL_3, keys: ["Digit3"] },
  { name: Controls.SKILL_4, keys: ["Digit4"] },
  { name: Controls.SKILL_5, keys: ["Digit5"] },
];
