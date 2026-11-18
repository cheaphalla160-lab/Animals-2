import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { ALL_ANIMAL_IDS, ANIMALS, AnimalId } from '../data/animals';
import { audioEngine } from '../utils/audioEngine';
import { AnimalImage } from './AnimalImage';

export function WordPreviewBar() {
  const [activeId, setActiveId] = useState<AnimalId | null>(null);

  const handlePlay = (id: AnimalId) => {
    audioEngine.playSfx('pickup');
    audioEngine.speakWord(ANIMALS[id].word, {
      onStart: () => setActiveId(id),
      onEnd: () => setActiveId((cur) => (cur === id ? null : cur)),
    });
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-stone-900">
            课前 6 词点读预习卡
          </h3>
          <p className="text-xs text-stone-500">
            点击任意小动物卡片，立即播放标准英语发音与音标提示
          </p>
        </div>
        <span className="text-xs font-medium text-stone-500">
          Part 1: bear · dolphin · lion / Part 2: parrot · penguin · whale
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ALL_ANIMAL_IDS.map((id) => {
          const animal = ANIMALS[id];
          const isSpeaking = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handlePlay(id)}
              className={`group flex flex-col items-center p-2.5 rounded-2xl border transition-all cursor-pointer text-left ${
                isSpeaking
                  ? 'border-sky-500 bg-sky-50/60 shadow-sm -translate-y-0.5'
                  : 'border-stone-200 bg-[#FAF8F2] hover:border-amber-300 hover:-translate-y-0.5'
              }`}
            >
              <AnimalImage
                animalId={id}
                className="w-full aspect-square rounded-xl border border-stone-200/70"
                imgClassName="group-hover:scale-105 transition-transform duration-200"
              />
              <div className="w-full mt-2 flex items-center justify-between gap-1 px-0.5">
                <div className="min-w-0">
                  <div className="font-display text-base font-bold text-stone-900 leading-tight">
                    {animal.word}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {animal.chinese} · {animal.phonetic}
                  </div>
                </div>
                <Volume2
                  className={`w-4 h-4 shrink-0 ${
                    isSpeaking ? 'text-sky-600' : 'text-stone-400 group-hover:text-sky-600'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
