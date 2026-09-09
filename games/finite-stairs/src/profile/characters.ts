export type CharacterId = 'mint' | 'sunset' | 'violet' | 'snow';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  price: number;
  colors: readonly [string, string];
}

export const CHARACTERS: readonly CharacterDefinition[] = [
  { id: 'mint', name: '민트 러너', price: 0, colors: ['#62f6c7', '#143c4b'] },
  { id: 'sunset', name: '선셋 점퍼', price: 120, colors: ['#ffb04a', '#752d3b'] },
  { id: 'violet', name: '보라 번개', price: 260, colors: ['#c7a6ff', '#422c70'] },
  { id: 'snow', name: '설산 탐험가', price: 500, colors: ['#f4fbff', '#5594ad'] },
];
