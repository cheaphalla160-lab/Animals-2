export type AnimalId = 'bear' | 'dolphin' | 'lion' | 'parrot' | 'penguin' | 'whale';

export interface AnimalWord {
  id: AnimalId;
  word: string;
  phonetic: string;
  chinese: string;
  part: 1 | 2;
  imagePath: string;
  plateAccentHex: string;
  plateSurfaceClass: string;
  plateRingClass: string;
  syllableTip: string;
  sentence: string;
}

export const ANIMALS: Record<AnimalId, AnimalWord> = {
  bear: {
    id: 'bear',
    word: 'bear',
    phonetic: '/beə(r)/',
    chinese: '熊',
    part: 1,
    imagePath: '/src/assets/images/animal_bear_1795019373307.jpg',
    plateAccentHex: '#B45309',
    plateSurfaceClass: 'bg-[#FFF9EB]',
    plateRingClass: 'border-amber-300',
    syllableTip: 'b + ear · 嘴角微笑发 /beə/',
    sentence: 'Look at the friendly bear!',
  },
  dolphin: {
    id: 'dolphin',
    word: 'dolphin',
    phonetic: '/ˈdɒlfɪn/',
    chinese: '海豚',
    part: 1,
    imagePath: '/src/assets/images/animal_dolphin_1795019373933.jpg',
    plateAccentHex: '#0284C7',
    plateSurfaceClass: 'bg-[#F0F9FF]',
    plateRingClass: 'border-sky-300',
    syllableTip: 'dol · phin · ph 发 /f/ 音',
    sentence: 'The dolphin jumps in the sea!',
  },
  lion: {
    id: 'lion',
    word: 'lion',
    phonetic: '/ˈlaɪən/',
    chinese: '狮子',
    part: 1,
    imagePath: '/src/assets/images/animal_lion_1795019373725.jpg',
    plateAccentHex: '#EA580C',
    plateSurfaceClass: 'bg-[#FFF7ED]',
    plateRingClass: 'border-orange-300',
    syllableTip: 'li · on · 重音在第一个音节',
    sentence: 'The lion has a golden mane!',
  },
  parrot: {
    id: 'parrot',
    word: 'parrot',
    phonetic: '/ˈpærət/',
    chinese: '鹦鹉',
    part: 2,
    imagePath: '/src/assets/images/animal_parrot_1795019374235.jpg',
    plateAccentHex: '#059669',
    plateSurfaceClass: 'bg-[#ECFDF5]',
    plateRingClass: 'border-emerald-300',
    syllableTip: 'par · rot · 双写 r 清脆短读',
    sentence: 'The colorful parrot can talk!',
  },
  penguin: {
    id: 'penguin',
    word: 'penguin',
    phonetic: '/ˈpeŋɡwɪn/',
    chinese: '企鹅',
    part: 2,
    imagePath: '/src/assets/images/animal_penguin_1795019374398.jpg',
    plateAccentHex: '#4F46E5',
    plateSurfaceClass: 'bg-[#EEF2FF]',
    plateRingClass: 'border-indigo-300',
    syllableTip: 'pen · guin · gu 发 /gw/ 音',
    sentence: 'The little penguin loves ice!',
  },
  whale: {
    id: 'whale',
    word: 'whale',
    phonetic: '/weɪl/',
    chinese: '鲸鱼',
    part: 2,
    imagePath: '/src/assets/images/animal_whale_1795019374337.jpg',
    plateAccentHex: '#0369A1',
    plateSurfaceClass: 'bg-[#F0F9FF]',
    plateRingClass: 'border-cyan-400',
    syllableTip: 'wh + ale · wh 发 /w/ 音',
    sentence: 'The big whale swims happily!',
  },
};

export const PART_1_IDS: AnimalId[] = ['bear', 'dolphin', 'lion'];
export const PART_2_IDS: AnimalId[] = ['parrot', 'penguin', 'whale'];
export const ALL_ANIMAL_IDS: AnimalId[] = [...PART_1_IDS, ...PART_2_IDS];

export interface PartMeta {
  part: 1 | 2;
  title: string;
  subtitle: string;
  animalIds: AnimalId[];
}

export const PART_META: Record<1 | 2, PartMeta> = {
  1: {
    part: 1,
    title: '第一关 · Bear / Dolphin / Lion',
    subtitle: '把打乱的小动物分别放进 3 个对应盘子，再大声跟读单词',
    animalIds: PART_1_IDS,
  },
  2: {
    part: 2,
    title: '第二关 · Parrot / Penguin / Whale',
    subtitle: '帮鹦鹉、企鹅和小鲸鱼找到自己的盘子，完成语音跟读挑战',
    animalIds: PART_2_IDS,
  },
};
