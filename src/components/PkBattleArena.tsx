import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Play, RotateCcw, Swords, Trophy, Volume2 } from 'lucide-react';
import { ALL_ANIMAL_IDS, ANIMALS, AnimalId, PART_1_IDS, PART_2_IDS } from '../data/animals';
import { audioEngine } from '../utils/audioEngine';
import { ScoreMode } from '../utils/leaderboard';
import { AnimalImage } from './AnimalImage';

interface PkBattleArenaProps {
  onSaveScore: (entry: { playerName: string; mode: ScoreMode; score: number; stars: number }) => void;
  onGoLeaderboard: () => void;
}

type PoolOption = 'ALL' | 'PART1' | 'PART2';
type PromptMode = 'AUDIO_AND_WORD' | 'AUDIO_ONLY';
type PkPhase = 'SETUP' | 'PLAYING' | 'ROUND_RESULT' | 'FINISHED';

const LEFT_KEYS = ['A', 'S', 'D', 'Q', 'W', 'E'];
const RIGHT_KEYS = ['J', 'K', 'L', 'U', 'I', 'O'];

export function PkBattleArena({ onSaveScore, onGoLeaderboard }: PkBattleArenaProps) {
  const [poolOption, setPoolOption] = useState<PoolOption>('ALL');
  const [promptMode, setPromptMode] = useState<PromptMode>('AUDIO_AND_WORD');
  const [totalRounds, setTotalRounds] = useState<number>(10);

  const [blueName, setBlueName] = useState<string>('蓝鲸队');
  const [goldName, setGoldName] = useState<string>('金狮队');

  const [phase, setPhase] = useState<PkPhase>('SETUP');
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [roundQueue, setRoundQueue] = useState<AnimalId[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(10);

  const [blueScore, setBlueScore] = useState<number>(0);
  const [goldScore, setGoldScore] = useState<number>(0);
  const [blueStreak, setBlueStreak] = useState<number>(0);
  const [goldStreak, setGoldStreak] = useState<number>(0);
  const [blueCooldown, setBlueCooldown] = useState<boolean>(false);
  const [goldCooldown, setGoldCooldown] = useState<boolean>(false);

  const [roundBanner, setRoundBanner] = useState<string>('');
  const [roundWinnerSide, setRoundWinnerSide] = useState<'BLUE' | 'GOLD' | 'NONE' | null>(null);
  const [savedToBoard, setSavedToBoard] = useState<boolean>(false);

  const roundTimerRef = useRef<number | null>(null);
  const nextRoundTimeoutRef = useRef<number | null>(null);

  const poolIds = useMemo(() => {
    if (poolOption === 'PART1') return PART_1_IDS;
    if (poolOption === 'PART2') return PART_2_IDS;
    return ALL_ANIMAL_IDS;
  }, [poolOption]);

  const currentTargetId: AnimalId | undefined = roundQueue[roundIndex];

  const clearTimers = () => {
    if (roundTimerRef.current) {
      window.clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (nextRoundTimeoutRef.current) {
      window.clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const buildQueue = (ids: AnimalId[], count: number): AnimalId[] => {
    const queue: AnimalId[] = [];
    for (let i = 0; i < count; i += 1) {
      const candidate = ids[i % ids.length];
      queue.push(candidate);
    }
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    // Avoid immediate duplicate where possible
    for (let i = 1; i < queue.length; i += 1) {
      if (queue[i] === queue[i - 1] && ids.length > 1) {
        const alt = ids.find((id) => id !== queue[i]);
        if (alt) queue[i] = alt;
      }
    }
    return queue;
  };

  const playTargetPrompt = useCallback((id: AnimalId) => {
    audioEngine.speakWord(ANIMALS[id].word);
  }, []);

  const startRoundCountdown = useCallback(
    (targetId: AnimalId, idx: number, queue: AnimalId[]) => {
      clearTimers();
      setTimeLeft(10);
      setRoundWinnerSide(null);
      setRoundBanner('');
      setBlueCooldown(false);
      setGoldCooldown(false);
      playTargetPrompt(targetId);

      roundTimerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearTimers();
            setPhase('ROUND_RESULT');
            setRoundWinnerSide('NONE');
            setRoundBanner(`时间到！正确答案是 ${ANIMALS[targetId].word} (${ANIMALS[targetId].chinese})`);
            audioEngine.playSfx('wrong');

            nextRoundTimeoutRef.current = window.setTimeout(() => {
              if (idx + 1 >= queue.length) {
                setPhase('FINISHED');
                audioEngine.playSfx('victory');
              } else {
                const nextIdx = idx + 1;
                setRoundIndex(nextIdx);
                setPhase('PLAYING');
                startRoundCountdown(queue[nextIdx], nextIdx, queue);
              }
            }, 1300);
            return 0;
          }
          if (prev <= 4) {
            audioEngine.playSfx('tick');
          }
          return prev - 1;
        });
      }, 1000);
    },
    [playTargetPrompt]
  );

  const handleStartMatch = () => {
    const queue = buildQueue(poolIds, totalRounds);
    setRoundQueue(queue);
    setRoundIndex(0);
    setBlueScore(0);
    setGoldScore(0);
    setBlueStreak(0);
    setGoldStreak(0);
    setSavedToBoard(false);
    setPhase('PLAYING');
    startRoundCountdown(queue[0], 0, queue);
  };

  const handleTeamPick = useCallback(
    (side: 'BLUE' | 'GOLD', pickedId: AnimalId) => {
      if (phase !== 'PLAYING' || !currentTargetId) return;
      if (side === 'BLUE' && blueCooldown) return;
      if (side === 'GOLD' && goldCooldown) return;

      if (pickedId === currentTargetId) {
        clearTimers();
        const speedBonus = timeLeft >= 7 ? 10 : timeLeft >= 4 ? 5 : 0;
        const points = 20 + speedBonus;

        if (side === 'BLUE') {
          setBlueScore((s) => s + points);
          setBlueStreak((st) => st + 1);
          setGoldStreak(0);
          setRoundWinnerSide('BLUE');
          setRoundBanner(
            `${blueName || '蓝鲸队'} 抢答成功！+${points} 分 · ${ANIMALS[currentTargetId].word}`
          );
        } else {
          setGoldScore((s) => s + points);
          setGoldStreak((st) => st + 1);
          setBlueStreak(0);
          setRoundWinnerSide('GOLD');
          setRoundBanner(
            `${goldName || '金狮队'} 抢答成功！+${points} 分 · ${ANIMALS[currentTargetId].word}`
          );
        }

        audioEngine.playSfx('correct');
        setPhase('ROUND_RESULT');

        nextRoundTimeoutRef.current = window.setTimeout(() => {
          if (roundIndex + 1 >= roundQueue.length) {
            setPhase('FINISHED');
            audioEngine.playSfx('victory');
          } else {
            const nextIdx = roundIndex + 1;
            setRoundIndex(nextIdx);
            setPhase('PLAYING');
            startRoundCountdown(roundQueue[nextIdx], nextIdx, roundQueue);
          }
        }, 1250);
      } else {
        audioEngine.playSfx('wrong');
        if (side === 'BLUE') {
          setBlueScore((s) => Math.max(0, s - 5));
          setBlueStreak(0);
          setBlueCooldown(true);
          window.setTimeout(() => setBlueCooldown(false), 950);
        } else {
          setGoldScore((s) => Math.max(0, s - 5));
          setGoldStreak(0);
          setGoldCooldown(true);
          window.setTimeout(() => setGoldCooldown(false), 950);
        }
      }
    },
    [
      phase,
      currentTargetId,
      blueCooldown,
      goldCooldown,
      timeLeft,
      blueName,
      goldName,
      roundIndex,
      roundQueue,
      startRoundCountdown,
    ]
  );

  // Keyboard shortcut listener for laptop PK battles
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const leftIdx = LEFT_KEYS.indexOf(key);
      if (leftIdx !== -1 && leftIdx < poolIds.length) {
        handleTeamPick('BLUE', poolIds[leftIdx]);
        return;
      }
      const rightIdx = RIGHT_KEYS.indexOf(key);
      if (rightIdx !== -1 && rightIdx < poolIds.length) {
        handleTeamPick('GOLD', poolIds[rightIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, poolIds, handleTeamPick]);

  const handleSaveBothScores = () => {
    if (savedToBoard) return;
    onSaveScore({
      playerName: blueName.trim() || '蓝鲸队',
      mode: 'PK 对战',
      score: blueScore,
      stars: blueScore >= goldScore ? 3 : 2,
    });
    onSaveScore({
      playerName: goldName.trim() || '金狮队',
      mode: 'PK 对战',
      score: goldScore,
      stars: goldScore >= blueScore ? 3 : 2,
    });
    setSavedToBoard(true);
    audioEngine.playSfx('plateComplete');
  };

  return (
    <section className="space-y-6">
      {/* Header / Setup Card */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
              <span>双人同屏抢答</span>
              <span aria-hidden="true">·</span>
              <span>支持触屏点击与键盘快捷键</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              动物单词 PK 擂台赛
            </h2>
            <p className="text-sm text-stone-600">
              听到单词后，左右两队同时抢答！答对 +20 分（极速抢答额外 +10），点错冷却 1 秒并扣 5 分。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {phase === 'SETUP' ? (
              <button
                type="button"
                onClick={handleStartMatch}
                className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                开始 PK 比赛
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  clearTimers();
                  setPhase('SETUP');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                返回设置
              </button>
            )}
          </div>
        </div>

        {phase === 'SETUP' && (
          <div className="mt-5 pt-5 border-t border-stone-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                蓝队名称 (左侧)
              </label>
              <input
                type="text"
                value={blueName}
                onChange={(e) => setBlueName(e.target.value)}
                maxLength={16}
                className="w-full px-3.5 py-2 text-sm bg-[#FAF8F2] border border-stone-300 rounded-xl focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                金队名称 (右侧)
              </label>
              <input
                type="text"
                value={goldName}
                onChange={(e) => setGoldName(e.target.value)}
                maxLength={16}
                className="w-full px-3.5 py-2 text-sm bg-[#FAF8F2] border border-stone-300 rounded-xl focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                单词范围
              </label>
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
                {(
                  [
                    { id: 'ALL', label: '全部6词' },
                    { id: 'PART1', label: '第一关' },
                    { id: 'PART2', label: '第二关' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPoolOption(opt.id)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      poolOption === opt.id
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                题目模式 · 题数
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPromptMode((m) =>
                      m === 'AUDIO_AND_WORD' ? 'AUDIO_ONLY' : 'AUDIO_AND_WORD'
                    )
                  }
                  className="flex-1 py-2 px-3 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition-colors cursor-pointer"
                >
                  {promptMode === 'AUDIO_AND_WORD' ? '听音+单词' : '纯听音盲猜'}
                </button>
                <button
                  type="button"
                  onClick={() => setTotalRounds((r) => (r === 10 ? 6 : 10))}
                  className="py-2 px-3 text-xs font-mono font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition-colors cursor-pointer"
                >
                  {totalRounds}题
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Finished Podium */}
      {phase === 'FINISHED' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-xs space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 mx-auto">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-3xl font-bold text-stone-900">
              {blueScore === goldScore
                ? '势均力敌！双方平局！'
                : blueScore > goldScore
                ? `${blueName || '蓝鲸队'} 赢得本场 PK！`
                : `${goldName || '金狮队'} 赢得本场 PK！`}
            </h3>
            <p className="text-sm text-stone-600">
              所有 {totalRounds} 轮动物单词抢答已完成，快把战绩记录到班级光荣榜吧！
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200">
              <div className="text-sm font-semibold text-sky-900">{blueName || '蓝鲸队'}</div>
              <div className="font-mono text-4xl font-bold tabular-nums text-sky-700 mt-1">
                {blueScore}
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-sm font-semibold text-amber-900">{goldName || '金狮队'}</div>
              <div className="font-mono text-4xl font-bold tabular-nums text-amber-700 mt-1">
                {goldScore}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!savedToBoard ? (
              <button
                type="button"
                onClick={handleSaveBothScores}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                将两队成绩存入排行榜
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoLeaderboard}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                已保存！查看排行榜
              </button>
            )}

            <button
              type="button"
              onClick={handleStartMatch}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4" />
              再来一局 PK
            </button>
          </div>
        </div>
      )}

      {/* Active Arena */}
      {(phase === 'PLAYING' || phase === 'ROUND_RESULT' || phase === 'SETUP') && (
        <div className="space-y-4">
          {/* Center Prompt Banner */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="px-3.5 py-2 bg-sky-50 border border-sky-200 rounded-xl text-center min-w-[92px]">
                  <div className="text-[11px] font-semibold text-sky-700 truncate max-w-[90px]">
                    {blueName || '蓝鲸队'}
                  </div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-sky-800">
                    {blueScore}
                  </div>
                  {blueStreak >= 2 && (
                    <div className="text-[11px] font-semibold text-sky-600">{blueStreak} 连胜</div>
                  )}
                </div>

                <span className="font-display text-lg font-bold text-stone-400">VS</span>

                <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[92px]">
                  <div className="text-[11px] font-semibold text-amber-800 truncate max-w-[90px]">
                    {goldName || '金狮队'}
                  </div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-amber-700">
                    {goldScore}
                  </div>
                  {goldStreak >= 2 && (
                    <div className="text-[11px] font-semibold text-amber-600">{goldStreak} 连胜</div>
                  )}
                </div>
              </div>

              {/* Target Word Prompt */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {phase === 'SETUP' ? (
                  <p className="text-sm text-stone-500">
                    点击右上角「开始 PK 比赛」，两队即可同时抢答！
                  </p>
                ) : phase === 'ROUND_RESULT' ? (
                  <div
                    className={`px-4 py-2 rounded-xl font-semibold text-sm sm:text-base ${
                      roundWinnerSide === 'BLUE'
                        ? 'bg-sky-50 text-sky-800 border border-sky-200'
                        : roundWinnerSide === 'GOLD'
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {roundBanner}
                  </div>
                ) : currentTargetId ? (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => playTargetPrompt(currentTargetId)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      再听一遍
                    </button>

                    {promptMode === 'AUDIO_AND_WORD' ? (
                      <span className="font-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-wide">
                        {ANIMALS[currentTargetId].word}
                      </span>
                    ) : (
                      <span className="font-display text-xl font-bold text-stone-600">
                        认真听发音，找出正确动物！
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Round & Timer */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] font-medium text-stone-500">轮次</div>
                  <div className="font-mono text-lg font-bold tabular-nums text-stone-800">
                    {phase === 'SETUP' ? `0/${totalRounds}` : `${roundIndex + 1}/${totalRounds}`}
                  </div>
                </div>
                <div className="h-7 w-px bg-stone-200" />
                <div className="text-right">
                  <div className="text-[11px] font-medium text-stone-500">倒计时</div>
                  <div
                    className={`font-mono text-lg font-bold tabular-nums ${
                      timeLeft <= 3 && phase === 'PLAYING' ? 'text-rose-600' : 'text-stone-800'
                    }`}
                  >
                    {timeLeft}s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Side Split PK Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Blue Team Side */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 bg-sky-50/40 transition-opacity ${
                blueCooldown ? 'border-rose-300 opacity-70' : 'border-sky-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-bold text-sky-900">
                  {blueName || '蓝鲸队'} · 抢答区
                </h3>
                <span className="text-xs text-sky-700 font-medium">
                  {blueCooldown ? '点错冷却中...' : `键盘: ${LEFT_KEYS.slice(0, poolIds.length).join(' / ')}`}
                </span>
              </div>
              <div
                className={`grid gap-3 ${
                  poolIds.length <= 3 ? 'grid-cols-3' : 'grid-cols-3'
                }`}
              >
                {poolIds.map((id, idx) => (
                  <button
                    key={`blue-${id}`}
                    type="button"
                    disabled={phase !== 'PLAYING' || blueCooldown}
                    onClick={() => handleTeamPick('BLUE', id)}
                    className="group relative flex flex-col items-center p-2.5 bg-white border-2 border-sky-200 hover:border-sky-500 rounded-2xl transition-transform duration-100 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <AnimalImage
                      animalId={id}
                      className="w-full aspect-square rounded-xl border border-stone-100"
                    />
                    <div className="mt-2 flex items-center justify-between w-full px-1">
                      <span className="font-display text-sm sm:text-base font-bold text-stone-800">
                        {promptMode === 'AUDIO_ONLY' ? ANIMALS[id].chinese : ANIMALS[id].word}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-sky-700">
                        [{LEFT_KEYS[idx]}]
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Gold Team Side */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 bg-amber-50/40 transition-opacity ${
                goldCooldown ? 'border-rose-300 opacity-70' : 'border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-bold text-amber-900">
                  {goldName || '金狮队'} · 抢答区
                </h3>
                <span className="text-xs text-amber-800 font-medium">
                  {goldCooldown ? '点错冷却中...' : `键盘: ${RIGHT_KEYS.slice(0, poolIds.length).join(' / ')}`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {poolIds.map((id, idx) => (
                  <button
                    key={`gold-${id}`}
                    type="button"
                    disabled={phase !== 'PLAYING' || goldCooldown}
                    onClick={() => handleTeamPick('GOLD', id)}
                    className="group relative flex flex-col items-center p-2.5 bg-white border-2 border-amber-200 hover:border-amber-500 rounded-2xl transition-transform duration-100 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <AnimalImage
                      animalId={id}
                      className="w-full aspect-square rounded-xl border border-stone-100"
                    />
                    <div className="mt-2 flex items-center justify-between w-full px-1">
                      <span className="font-display text-sm sm:text-base font-bold text-stone-800">
                        {promptMode === 'AUDIO_ONLY' ? ANIMALS[id].chinese : ANIMALS[id].word}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-amber-700">
                        [{RIGHT_KEYS[idx]}]
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
