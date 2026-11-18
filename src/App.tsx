import { useEffect, useState } from 'react';
import { BookOpen, Music, Volume2, VolumeX } from 'lucide-react';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { PkBattleArena } from './components/PkBattleArena';
import { SortingAndReadAloudStage } from './components/SortingAndReadAloudStage';
import { WordPreviewBar } from './components/WordPreviewBar';
import { audioEngine } from './utils/audioEngine';
import {
  addLeaderboardEntry,
  clearLeaderboard,
  deleteLeaderboardEntry,
  LeaderboardEntry,
  loadLeaderboard,
  resetSampleLeaderboard,
  ScoreMode,
} from './utils/leaderboard';

type ActiveView = 'PART1' | 'PART2' | 'PK' | 'LEADERBOARD';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('PART1');
  const [showWordPreview, setShowWordPreview] = useState<boolean>(true);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [userMutedMusic, setUserMutedMusic] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(0.26);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());

  // Start gentle background music on first user gesture unless explicitly muted
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!userMutedMusic && !audioEngine.isMusicPlaying()) {
        const started = audioEngine.startMusic();
        setMusicPlaying(started);
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, [userMutedMusic]);

  const handleToggleMusic = () => {
    const nowPlaying = audioEngine.toggleMusic();
    setMusicPlaying(nowPlaying);
    setUserMutedMusic(!nowPlaying);
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    audioEngine.setSfxEnabled(next);
  };

  const handleVolumeChange = (val: number) => {
    setMusicVolume(val);
    audioEngine.setMusicVolume(val);
  };

  const handleSaveScore = (entry: {
    playerName: string;
    mode: ScoreMode;
    score: number;
    stars: number;
  }) => {
    setLeaderboard(addLeaderboardEntry(entry));
  };

  const navItems: { id: ActiveView; label: string }[] = [
    { id: 'PART1', label: '第一关 · 熊豚狮' },
    { id: 'PART2', label: '第二关 · 鹦企鲸' },
    { id: 'PK', label: 'PK 对战' },
    { id: 'LEADERBOARD', label: '排行榜' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F2] text-stone-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-[#FAF8F2]/95 backdrop-blur-xs border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('PART1')}
            className="font-display text-xl sm:text-2xl font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Animal Word Park
          </button>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav
            aria-label="主导航"
            className="hidden md:flex items-center gap-7 text-sm font-semibold"
          >
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-amber-500 text-stone-900'
                      : 'border-transparent text-stone-500 hover:text-stone-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleToggleMusic}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                musicPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              <Music className="w-4 h-4" />
              {musicPlaying ? '音乐播放中' : '开启背景音乐'}
            </button>
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="md:hidden border-t border-stone-200 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={`mob-${item.id}`}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  active ? 'bg-amber-500 text-white' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Workspace Audio & Classroom Preview Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white border border-stone-200 rounded-2xl shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-stone-600">
            <span className="font-semibold text-stone-800">小学英语动物单词课堂</span>
            <span aria-hidden="true">·</span>
            <span>Part 1: bear, dolphin, lion</span>
            <span aria-hidden="true">·</span>
            <span>Part 2: parrot, penguin, whale</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-600">
              <span>音乐音量</span>
              <input
                type="range"
                min={0}
                max={0.6}
                step={0.02}
                value={musicVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="背景音乐音量"
                className="w-20 accent-amber-500 cursor-pointer"
              />
            </label>

            <button
              type="button"
              onClick={handleToggleSfx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              音效: {sfxEnabled ? '开' : '关'}
            </button>

            <button
              type="button"
              onClick={() => setShowWordPreview((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showWordPreview
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {showWordPreview ? '收起单词预习卡' : '展开单词预习卡'}
            </button>
          </div>
        </div>

        {/* Optional 6-Word Audio Preview Grid */}
        {showWordPreview && <WordPreviewBar />}

        {/* Active Stage */}
        {activeView === 'PART1' && (
          <SortingAndReadAloudStage
            part={1}
            onSaveScore={handleSaveScore}
            onGoNextPart={() => setActiveView('PART2')}
            onGoPk={() => setActiveView('PK')}
          />
        )}

        {activeView === 'PART2' && (
          <SortingAndReadAloudStage
            part={2}
            onSaveScore={handleSaveScore}
            onGoNextPart={() => setActiveView('PART1')}
            onGoPk={() => setActiveView('PK')}
          />
        )}

        {activeView === 'PK' && (
          <PkBattleArena
            onSaveScore={handleSaveScore}
            onGoLeaderboard={() => setActiveView('LEADERBOARD')}
          />
        )}

        {activeView === 'LEADERBOARD' && (
          <LeaderboardPanel
            entries={leaderboard}
            onAddManual={handleSaveScore}
            onDeleteEntry={(id) => setLeaderboard(deleteLeaderboardEntry(id))}
            onResetSamples={() => setLeaderboard(resetSampleLeaderboard())}
            onClearAll={() => setLeaderboard(clearLeaderboard())}
          />
        )}
      </main>

      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        Animal Word Park · 小学英语课堂动物词汇互动游戏（bear · dolphin · lion · parrot · penguin · whale）
      </footer>
    </div>
  );
}
