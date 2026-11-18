import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ANIMALS, AnimalId, PART_META } from '../data/animals';
import { audioEngine } from '../utils/audioEngine';
import { ScoreMode } from '../utils/leaderboard';
import { AnimalImage } from './AnimalImage';

interface TokenItem {
  uid: string;
  animalId: AnimalId;
}

interface SortingAndReadAloudStageProps {
  part: 1 | 2;
  onSaveScore: (entry: { playerName: string; mode: ScoreMode; score: number; stars: number }) => void;
  onGoNextPart: () => void;
  onGoPk: () => void;
}

type StageStep = 'SORT' | 'READ_ALOUD';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const ACCEPTED_SPEECH_VARIANTS: Record<AnimalId, string[]> = {
  bear: ['bear', 'bare', 'pear', 'pair', 'there', 'beer'],
  dolphin: ['dolphin', 'dolphins', 'dolphin.', 'dolfin'],
  lion: ['lion', 'lions', 'line', 'lying', 'ryan'],
  parrot: ['parrot', 'parrots', 'carrot', 'parent', 'pirate'],
  penguin: ['penguin', 'penguins', 'panguin', 'penguine'],
  whale: ['whale', 'whales', 'well', 'will', 'while', 'wail', 'wheel'],
};

function buildShuffledTokens(animalIds: AnimalId[], perAnimal: number): TokenItem[] {
  const list: TokenItem[] = [];
  animalIds.forEach((id) => {
    for (let i = 0; i < perAnimal; i += 1) {
      list.push({ uid: `${id}-${i}-${Math.random().toString(36).slice(2, 6)}`, animalId: id });
    }
  });
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function SortingAndReadAloudStage({
  part,
  onSaveScore,
  onGoNextPart,
  onGoPk,
}: SortingAndReadAloudStageProps) {
  const meta = PART_META[part];
  const animalIds = meta.animalIds;

  const [step, setStep] = useState<StageStep>('SORT');
  const [tokensPerAnimal, setTokensPerAnimal] = useState<2 | 3>(2);
  const [showWordHintsOnTokens, setShowWordHintsOnTokens] = useState<boolean>(false);
  const [slowSpeech, setSlowSpeech] = useState<boolean>(false);

  const [trayTokens, setTrayTokens] = useState<TokenItem[]>(() =>
    buildShuffledTokens(animalIds, 2)
  );
  const [plateContents, setPlateContents] = useState<Record<AnimalId, TokenItem[]>>(() => ({
    bear: [],
    dolphin: [],
    lion: [],
    parrot: [],
    penguin: [],
    whale: [],
  }));

  const [selectedTokenUid, setSelectedTokenUid] = useState<string | null>(null);
  const [draggingUid, setDraggingUid] = useState<string | null>(null);
  const [dragOverPlate, setDragOverPlate] = useState<AnimalId | null>(null);
  const [shakingPlate, setShakingPlate] = useState<AnimalId | null>(null);
  const [glowingPlate, setGlowingPlate] = useState<AnimalId | null>(null);

  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string>(
    '点击或拖动上方的小动物，把它们放进对应的 3 个盘子里！'
  );

  // Read-aloud states
  const [readDone, setReadDone] = useState<Record<string, boolean>>({});
  const [speakingId, setSpeakingId] = useState<AnimalId | null>(null);
  const [listeningId, setListeningId] = useState<AnimalId | null>(null);
  const [speechHeardText, setSpeechHeardText] = useState<Record<string, string>>({});
  const [chantActive, setChantActive] = useState<boolean>(false);
  const chantTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Save score states
  const [playerName, setPlayerName] = useState<string>('');
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);

  const speechRecognitionSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const w = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  const resetRound = (countPerAnimal: 2 | 3 = tokensPerAnimal) => {
    if (chantTimerRef.current) {
      window.clearTimeout(chantTimerRef.current);
      chantTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setChantActive(false);
    setStep('SORT');
    setTrayTokens(buildShuffledTokens(animalIds, countPerAnimal));
    setPlateContents({
      bear: [],
      dolphin: [],
      lion: [],
      parrot: [],
      penguin: [],
      whale: [],
    });
    setSelectedTokenUid(null);
    setDraggingUid(null);
    setDragOverPlate(null);
    setScore(0);
    setStreak(0);
    setMistakes(0);
    setReadDone({});
    setSpeechHeardText({});
    setScoreSaved(false);
    setFeedbackMsg('点击或拖动上方的小动物，把它们放进对应的 3 个盘子里！');
  };

  useEffect(() => {
    resetRound(tokensPerAnimal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  useEffect(() => {
    return () => {
      if (chantTimerRef.current) {
        window.clearTimeout(chantTimerRef.current);
      }
      recognitionRef.current?.stop();
    };
  }, []);

  const totalTokens = animalIds.length * tokensPerAnimal;
  const placedCount = animalIds.reduce((sum, id) => sum + (plateContents[id]?.length || 0), 0);
  const allSorted = placedCount === totalTokens;

  const readDoneCount = animalIds.filter((id) => readDone[id]).length;
  const allReadCompleted = readDoneCount === animalIds.length;

  const earnedStars = useMemo(() => {
    if (!allSorted && !allReadCompleted) return 1;
    if (mistakes === 0 && allReadCompleted) return 3;
    if (mistakes <= 2) return 2;
    return 1;
  }, [allSorted, allReadCompleted, mistakes]);

  const handlePlaceTokenOnPlate = (tokenUid: string, targetPlateId: AnimalId) => {
    const token = trayTokens.find((t) => t.uid === tokenUid);
    if (!token) return;

    if (token.animalId === targetPlateId) {
      const nextTray = trayTokens.filter((t) => t.uid !== tokenUid);
      const nextPlateList = [...(plateContents[targetPlateId] || []), token];
      const nextStreak = streak + 1;
      const earned = 20 + Math.min(nextStreak - 1, 4) * 5;

      setTrayTokens(nextTray);
      setPlateContents((prev) => ({
        ...prev,
        [targetPlateId]: nextPlateList,
      }));
      setSelectedTokenUid(null);
      setDraggingUid(null);
      setDragOverPlate(null);
      setStreak(nextStreak);
      setScore((s) => s + earned);

      setGlowingPlate(targetPlateId);
      window.setTimeout(() => setGlowingPlate(null), 360);

      const word = ANIMALS[targetPlateId].word;
      if (nextTray.length === 0) {
        audioEngine.playSfx('plateComplete');
        setFeedbackMsg('太棒了！所有小动物都回到盘子里了！现在进入「大声跟读」环节吧！');
      } else {
        audioEngine.playSfx('correct');
        setFeedbackMsg(`答对啦！这是 ${word}（${ANIMALS[targetPlateId].chinese}）+${earned} 分`);
      }

      audioEngine.speakWord(word, {
        slow: slowSpeech,
        onStart: () => setSpeakingId(targetPlateId),
        onEnd: () => setSpeakingId((cur) => (cur === targetPlateId ? null : cur)),
      });
    } else {
      audioEngine.playSfx('wrong');
      setMistakes((m) => m + 1);
      setStreak(0);
      setScore((s) => Math.max(0, s - 5));
      setShakingPlate(targetPlateId);
      setDragOverPlate(null);
      window.setTimeout(() => setShakingPlate(null), 400);
      setFeedbackMsg(
        `这不是 ${ANIMALS[targetPlateId].word} 的盘子哦，再仔细看看（-5 分）`
      );
    }
  };

  const handleSpeakAnimal = (id: AnimalId, withSentence = false) => {
    const animal = ANIMALS[id];
    const phrase = withSentence ? `${animal.word}. ${animal.sentence}` : animal.word;
    audioEngine.speakWord(phrase, {
      slow: slowSpeech,
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId((cur) => (cur === id ? null : cur)),
    });
  };

  const markReadSuccess = (id: AnimalId) => {
    if (!readDone[id]) {
      setScore((s) => s + 15);
    }
    setReadDone((prev) => ({ ...prev, [id]: true }));
    audioEngine.playSfx('plateComplete');
    setFeedbackMsg(`跟读成功！${ANIMALS[id].word} 发音真棒！+15 分`);
  };

  const handleStartSpeechCheck = (id: AnimalId) => {
    if (listeningId === id) {
      recognitionRef.current?.stop();
      setListeningId(null);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRec) {
      markReadSuccess(id);
      return;
    }

    try {
      recognitionRef.current?.stop();
      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 3;

      setListeningId(id);
      setSpeechHeardText((prev) => ({ ...prev, [id]: '正在聆听你的声音...' }));

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        const result = event.results[0];
        const transcripts: string[] = [];
        for (let i = 0; i < 3; i += 1) {
          if (result && result[i]?.transcript) {
            transcripts.push(result[i].transcript.toLowerCase().trim());
          }
        }
        const primary = transcripts[0] || '';
        const accepted = ACCEPTED_SPEECH_VARIANTS[id];
        const matched = transcripts.some((t) =>
          accepted.some((variant) => t.includes(variant))
        );

        if (matched) {
          setSpeechHeardText((prev) => ({ ...prev, [id]: `识别到: "${primary}" · 发音很棒！` }));
          markReadSuccess(id);
        } else {
          audioEngine.playSfx('wrong');
          setSpeechHeardText((prev) => ({
            ...prev,
            [id]: `听到了 "${primary || '...'}"，再试一次读 "${ANIMALS[id].word}"`,
          }));
        }
      };

      rec.onerror = () => {
        setListeningId(null);
        setSpeechHeardText((prev) => ({
          ...prev,
          [id]: '未检测到麦克风声音，可以直接点击「完成跟读」点亮星星',
        }));
      };

      rec.onend = () => {
        setListeningId((cur) => (cur === id ? null : cur));
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setListeningId(null);
      markReadSuccess(id);
    }
  };

  const handleToggleClassChant = () => {
    if (chantActive) {
      if (chantTimerRef.current) {
        window.clearTimeout(chantTimerRef.current);
        chantTimerRef.current = null;
      }
      setChantActive(false);
      setSpeakingId(null);
      return;
    }

    setChantActive(true);
    let idx = 0;
    const runNext = () => {
      const currentId = animalIds[idx % animalIds.length];
      setSpeakingId(currentId);
      audioEngine.speakWord(ANIMALS[currentId].word, {
        slow: slowSpeech,
      });
      idx += 1;
      if (idx < animalIds.length * 2) {
        chantTimerRef.current = window.setTimeout(runNext, slowSpeech ? 1750 : 1350);
      } else {
        chantTimerRef.current = window.setTimeout(() => {
          setChantActive(false);
          setSpeakingId(null);
        }, 1200);
      }
    };
    runNext();
  };

  const handleSaveToBoard = () => {
    const trimmed = playerName.trim() || `第${part}关小达人`;
    onSaveScore({
      playerName: trimmed,
      mode: part === 1 ? 'Part 1' : 'Part 2',
      score,
      stars: earnedStars,
    });
    audioEngine.playSfx('victory');
    setScoreSaved(true);
  };

  return (
    <section className="space-y-6">
      {/* Stage Top Info & Teacher Toolbar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
              <span>单元练习</span>
              <span aria-hidden="true">·</span>
              <span>3 个词汇盘子</span>
              <span aria-hidden="true">·</span>
              <span>分盘归类 + 语音跟读</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              {meta.title}
            </h2>
            <p className="text-sm text-stone-600">{meta.subtitle}</p>
          </div>

          {/* Score & Step Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 px-4 py-2.5 bg-[#FAF8F2] border border-stone-200 rounded-xl">
              <div className="text-right">
                <div className="text-[11px] font-medium text-stone-500">当前得分</div>
                <div className="font-mono text-xl font-bold tabular-nums text-amber-600">
                  {score}
                </div>
              </div>
              <div className="h-7 w-px bg-stone-200" />
              <div className="text-right">
                <div className="text-[11px] font-medium text-stone-500">已放盘子</div>
                <div className="font-mono text-xl font-bold tabular-nums text-stone-800">
                  {placedCount}/{totalTokens}
                </div>
              </div>
              <div className="h-7 w-px bg-stone-200" />
              <div className="text-right">
                <div className="text-[11px] font-medium text-stone-500">跟读进度</div>
                <div className="font-mono text-xl font-bold tabular-nums text-emerald-600">
                  {readDoneCount}/{animalIds.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-toolbar: Step tabs + Teacher helpers */}
        <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setStep('SORT')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                step === 'SORT'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              1. 分盘归类 ({placedCount}/{totalTokens})
            </button>
            <button
              type="button"
              onClick={() => setStep('READ_ALOUD')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                step === 'READ_ALOUD'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              2. 跟读挑战 ({readDoneCount}/{animalIds.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = tokensPerAnimal === 2 ? 3 : 2;
                setTokensPerAnimal(next);
                resetRound(next);
              }}
              className="px-3 py-2 text-xs font-medium bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              卡片数量: {tokensPerAnimal === 2 ? '6 张 (基础)' : '9 张 (进阶)'}
            </button>

            <button
              type="button"
              onClick={() => setShowWordHintsOnTokens((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showWordHintsOnTokens ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              卡片提示词: {showWordHintsOnTokens ? '显示' : '隐藏'}
            </button>

            <button
              type="button"
              onClick={() => setSlowSpeech((v) => !v)}
              className={`px-3 py-2 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                slowSpeech
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              语速: {slowSpeech ? '慢速跟读' : '标准语速'}
            </button>

            <button
              type="button"
              onClick={() => resetRound(tokensPerAnimal)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重新洗牌
            </button>
          </div>
        </div>
      </div>

      {/* Live Feedback Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-sm text-stone-800">
        <span className="font-medium">{feedbackMsg}</span>
        {allSorted && step === 'SORT' && (
          <button
            type="button"
            onClick={() => setStep('READ_ALOUD')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            前往跟读挑战
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {step === 'SORT' ? (
        <div className="space-y-6">
          {/* Top Basket: Mixed Animal Tokens */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">
                  待分类的小动物篮子
                </h3>
                <p className="text-xs text-stone-500">
                  方式一：直接把动物卡片拖到下方对应盘子 · 方式二：先点选一张卡片，再点击对应盘子
                </p>
              </div>
              {selectedTokenUid && (
                <span className="text-xs font-semibold text-sky-700">
                  已选中 1 只小动物，请点击下方对应盘子
                </span>
              )}
            </div>

            {trayTokens.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center bg-[#FAF8F2] border border-dashed border-stone-300 rounded-xl gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                <div>
                  <p className="font-display text-xl font-bold text-stone-900">
                    太棒了！{totalTokens} 只小动物全部归位！
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    接下来一起大声跟读这 3 个动物单词吧！
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('READ_ALOUD')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  开始第二步：大声跟读
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {trayTokens.map((token) => {
                  const animal = ANIMALS[token.animalId];
                  const isSelected = selectedTokenUid === token.uid;
                  const isDragging = draggingUid === token.uid;

                  return (
                    <button
                      key={token.uid}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', token.uid);
                        setDraggingUid(token.uid);
                        setSelectedTokenUid(token.uid);
                        audioEngine.playSfx('pickup');
                      }}
                      onDragEnd={() => {
                        setDraggingUid(null);
                        setDragOverPlate(null);
                      }}
                      onClick={() => {
                        audioEngine.playSfx('pickup');
                        setSelectedTokenUid((cur) => (cur === token.uid ? null : token.uid));
                      }}
                      className={`group relative flex flex-col items-center p-2.5 rounded-2xl border-2 transition-transform duration-150 cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 -translate-y-1 shadow-md'
                          : 'border-stone-200 bg-[#FAF8F2] hover:border-amber-300 hover:-translate-y-0.5'
                      } ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}`}
                    >
                      <AnimalImage
                        animalId={token.animalId}
                        className="w-full aspect-square rounded-xl border border-stone-200/80"
                        imgClassName="group-hover:scale-105 transition-transform duration-200"
                      />
                      {showWordHintsOnTokens ? (
                        <span className="mt-2 font-display text-sm font-bold text-stone-800">
                          {animal.word}
                        </span>
                      ) : (
                        <span className="mt-2 text-xs font-medium text-stone-500">
                          {isSelected ? '点击盘子放入' : '点我 / 拖动'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3 Ceramic Plates Drop Zone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {animalIds.map((plateId, index) => {
              const animal = ANIMALS[plateId];
              const placedList = plateContents[plateId] || [];
              const isDragTarget = dragOverPlate === plateId;
              const isShaking = shakingPlate === plateId;
              const isGlowing = glowingPlate === plateId;
              const isPlateFull = placedList.length >= tokensPerAnimal;

              return (
                <div
                  key={plateId}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverPlate !== plateId) {
                      setDragOverPlate(plateId);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverPlate === plateId) {
                      setDragOverPlate(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const uid = e.dataTransfer.getData('text/plain') || draggingUid;
                    if (uid) {
                      handlePlaceTokenOnPlate(uid, plateId);
                    }
                    setDragOverPlate(null);
                  }}
                  onClick={() => {
                    if (selectedTokenUid) {
                      handlePlaceTokenOnPlate(selectedTokenUid, plateId);
                    } else {
                      handleSpeakAnimal(plateId);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (selectedTokenUid) {
                        handlePlaceTokenOnPlate(selectedTokenUid, plateId);
                      } else {
                        handleSpeakAnimal(plateId);
                      }
                    }
                  }}
                  className={`relative flex flex-col items-center p-5 rounded-[2rem] border-2 transition-all cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                    animal.plateSurfaceClass
                  } ${
                    isDragTarget || selectedTokenUid
                      ? `${animal.plateRingClass} shadow-md`
                      : 'border-stone-200 hover:border-stone-300'
                  } ${isDragTarget ? 'scale-[1.02]' : ''} ${
                    isShaking ? 'animate-gentle-shake border-rose-400' : ''
                  } ${isGlowing ? 'animate-plate-glow' : ''}`}
                >
                  {/* Plate Top Label */}
                  <div className="w-full flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-stone-500">
                      盘子 0{index + 1} · {placedList.length}/{tokensPerAnimal}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeakAnimal(plateId);
                      }}
                      aria-label={`听 ${animal.word} 发音`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        speakingId === plateId
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      听发音
                    </button>
                  </div>

                  {/* Ceramic Inner Rim Dish */}
                  <div
                    className={`w-full min-h-[200px] rounded-[1.5rem] bg-white border-2 border-dashed flex flex-col items-center justify-center p-4 shadow-inner transition-colors ${
                      isDragTarget
                        ? 'border-sky-400 bg-sky-50/40'
                        : isPlateFull
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-stone-200'
                    }`}
                  >
                    {placedList.length === 0 ? (
                      <div className="text-center space-y-1.5 py-6">
                        <p className="font-display text-3xl font-bold text-stone-900">
                          {animal.word}
                        </p>
                        <p className="text-sm text-stone-500">
                          {animal.phonetic} · {animal.chinese}
                        </p>
                        <p className="text-xs text-stone-400 pt-2">
                          {selectedTokenUid ? '点击此处放入盘子' : '把对应的小动物放进来'}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full space-y-3">
                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                          {placedList.map((item) => (
                            <div
                              key={item.uid}
                              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-stone-200 overflow-hidden shadow-xs animate-pop-settle"
                            >
                              <AnimalImage animalId={item.animalId} className="w-full h-full" />
                            </div>
                          ))}
                        </div>
                        <div className="text-center pt-1">
                          <div className="font-display text-2xl font-bold text-stone-900">
                            {animal.word}
                          </div>
                          <div className="text-xs text-stone-500">
                            {animal.phonetic} · {animal.chinese}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isPlateFull && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      本盘已收集齐！
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Step 2: Read Aloud Challenge */
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-bold text-stone-900">
                听一听 · 大声跟读 3 个单词
              </h3>
              <p className="text-sm text-stone-600 mt-0.5">
                先点击「示范领读」听标准发音，再点击「语音跟读」大声读出单词（或由老师点亮完成星）
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleClassChant}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                chantActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              {chantActive ? '停止全班齐读' : '全班齐读节拍 (1→2→3)'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {animalIds.map((id) => {
              const animal = ANIMALS[id];
              const isDone = Boolean(readDone[id]);
              const isSpeaking = speakingId === id;
              const isListening = listeningId === id;
              const heardMsg = speechHeardText[id];

              return (
                <div
                  key={id}
                  className={`flex flex-col justify-between p-5 rounded-2xl border-2 bg-white transition-all ${
                    isSpeaking
                      ? 'border-sky-500 shadow-md -translate-y-0.5'
                      : isDone
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-stone-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-stone-500">
                        {animal.chinese} · {animal.phonetic}
                      </span>
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          跟读通关
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">待跟读</span>
                      )}
                    </div>

                    <AnimalImage
                      animalId={id}
                      className="w-full aspect-square rounded-2xl border border-stone-200/80 mb-4"
                    />

                    <div className="text-center space-y-1 mb-4">
                      <h4 className="font-display text-3xl font-bold text-stone-900">
                        {animal.word}
                      </h4>
                      <p className="text-xs text-stone-500">{animal.syllableTip}</p>
                      <p className="text-xs text-stone-600 pt-1 italic">“{animal.sentence}”</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-stone-100">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSpeakAnimal(id, false)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                          isSpeaking
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        读单词
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSpeakAnimal(id, true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        读例句
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {speechRecognitionSupported && (
                        <button
                          type="button"
                          onClick={() => handleStartSpeechCheck(id)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                            isListening
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          {isListening ? (
                            <>
                              <MicOff className="w-4 h-4" />
                              停止录音
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4" />
                              麦克风跟读
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => markReadSuccess(id)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isDone ? '已完成' : '点亮跟读星'}
                      </button>
                    </div>

                    {heardMsg && (
                      <p className="text-xs text-center text-stone-600 pt-1">{heardMsg}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion & Save Score Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h4 className="font-display text-xl font-bold text-stone-900">
                    {allReadCompleted
                      ? `恭喜通关第 ${part} 关！`
                      : `完成跟读即可收获满星评价 (${readDoneCount}/${animalIds.length})`}
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-sm text-stone-600">
                  <span>总分：<strong className="font-mono text-stone-900 tabular-nums">{score}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    星级：
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= earnedStars
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!scoreSaved ? (
                  <>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="输入学生姓名或小组名"
                      maxLength={24}
                      className="px-3.5 py-2.5 text-sm bg-[#FAF8F2] border border-stone-300 rounded-xl focus:outline-none focus:border-sky-500 w-52"
                    />
                    <button
                      type="button"
                      onClick={handleSaveToBoard}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      存入排行榜
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    已成功记入班级排行榜！
                  </span>
                )}

                {part === 1 ? (
                  <button
                    type="button"
                    onClick={onGoNextPart}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    进入第二关 (Parrot/Penguin/Whale)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGoPk}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    前往双人 PK 大挑战
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
