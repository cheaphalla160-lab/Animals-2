export type ScoreMode = 'Part 1' | 'Part 2' | 'PK 对战' | '课堂奖励';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  mode: ScoreMode;
  score: number;
  stars: number;
  createdAt: string;
}

const STORAGE_KEY = 'animal_word_park_leaderboard_v1';

const SAMPLE_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'sample-1',
    playerName: 'Mia · 蓝鲸队',
    mode: 'PK 对战',
    score: 185,
    stars: 3,
    createdAt: '2026-11-18T08:10:00Z',
  },
  {
    id: 'sample-2',
    playerName: 'Leo · 三年级一班',
    mode: 'Part 2',
    score: 160,
    stars: 3,
    createdAt: '2026-11-18T08:05:00Z',
  },
  {
    id: 'sample-3',
    playerName: 'Sunny · 金狮队',
    mode: 'Part 1',
    score: 150,
    stars: 3,
    createdAt: '2026-11-18T08:00:00Z',
  },
  {
    id: 'sample-4',
    playerName: 'Lucas · 闪电组',
    mode: 'PK 对战',
    score: 135,
    stars: 2,
    createdAt: '2026-11-18T07:55:00Z',
  },
];

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ENTRIES));
      return [...SAMPLE_ENTRIES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SAMPLE_ENTRIES];
    return parsed.sort((a, b) => b.score - a.score);
  } catch {
    return [...SAMPLE_ENTRIES];
  }
}

export function addLeaderboardEntry(
  entry: Omit<LeaderboardEntry, 'id' | 'createdAt'>
): LeaderboardEntry[] {
  const current = loadLeaderboard();
  const newItem: LeaderboardEntry = {
    ...entry,
    id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...current].sort((a, b) => b.score - a.score).slice(0, 30);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return updated;
}

export function deleteLeaderboardEntry(id: string): LeaderboardEntry[] {
  const current = loadLeaderboard().filter((item) => item.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore
  }
  return current;
}

export function clearLeaderboard(): LeaderboardEntry[] {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch {
    // Ignore
  }
  return [];
}

export function resetSampleLeaderboard(): LeaderboardEntry[] {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ENTRIES));
  } catch {
    // Ignore
  }
  return [...SAMPLE_ENTRIES];
}
