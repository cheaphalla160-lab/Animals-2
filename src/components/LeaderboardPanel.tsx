import { useState } from 'react';
import { Award, Plus, RotateCcw, Star, Trash2, Trophy } from 'lucide-react';
import { LeaderboardEntry, ScoreMode } from '../utils/leaderboard';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  onAddManual: (entry: { playerName: string; mode: ScoreMode; score: number; stars: number }) => void;
  onDeleteEntry: (id: string) => void;
  onResetSamples: () => void;
  onClearAll: () => void;
}

type FilterMode = 'ALL' | ScoreMode;

export function LeaderboardPanel({
  entries,
  onAddManual,
  onDeleteEntry,
  onResetSamples,
  onClearAll,
}: LeaderboardPanelProps) {
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [nameInput, setNameInput] = useState<string>('');
  const [scoreInput, setScoreInput] = useState<string>('120');

  const filtered =
    filter === 'ALL' ? entries : entries.filter((item) => item.mode === filter);

  const topThree = filtered.slice(0, 3);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) return;
    const numericScore = Math.max(0, Math.min(9999, parseInt(scoreInput, 10) || 100));
    onAddManual({
      playerName: cleanName,
      mode: '课堂奖励',
      score: numericScore,
      stars: numericScore >= 150 ? 3 : numericScore >= 90 ? 2 : 1,
    });
    setNameInput('');
  };

  return (
    <section className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
              <span>班级荣誉榜</span>
              <span aria-hidden="true">·</span>
              <span>本地自动保存</span>
              <span aria-hidden="true">·</span>
              <span>共 {entries.length} 条记录</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
              班级分数排行榜
            </h2>
            <p className="text-sm text-stone-600">
              记录同学们在第一关、第二关跟读与 PK 擂台赛中的精彩得分！
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
              {(
                [
                  { id: 'ALL', label: '全部' },
                  { id: 'Part 1', label: '第一关' },
                  { id: 'Part 2', label: '第二关' },
                  { id: 'PK 对战', label: 'PK 对战' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab.id
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Teacher quick bonus form */}
        <form
          onSubmit={handleQuickAdd}
          className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-600">老师加分登记：</span>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="学生或小组名称"
              maxLength={24}
              className="px-3 py-2 text-sm bg-[#FAF8F2] border border-stone-300 rounded-xl focus:outline-none focus:border-sky-500 w-44"
            />
            <input
              type="number"
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              min={10}
              max={999}
              step={10}
              className="px-3 py-2 text-sm font-mono bg-[#FAF8F2] border border-stone-300 rounded-xl focus:outline-none focus:border-sky-500 w-24"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              添加到榜
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetSamples}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              恢复示例
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 bg-white border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空记录
            </button>
          </div>
        </form>
      </div>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((item, idx) => {
            const medalStyles = [
              'bg-[#FFFBEB] border-amber-300 text-amber-800',
              'bg-[#F8FAFC] border-slate-300 text-slate-700',
              'bg-[#FFF7ED] border-orange-200 text-orange-800',
            ][idx];

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border-2 flex items-center justify-between ${medalStyles}`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Trophy className="w-4 h-4 shrink-0" />
                    <span>第 {idx + 1} 名 · {item.mode}</span>
                  </div>
                  <div className="font-display text-xl font-bold text-stone-900 truncate">
                    {item.playerName}
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= item.stars ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="font-mono text-3xl font-bold tabular-nums text-stone-900 pl-3">
                  {item.score}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Rankings Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Award className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="font-display text-lg font-semibold text-stone-700">
              当前分类还没有成绩记录
            </p>
            <p className="text-sm text-stone-500">
              完成分盘跟读或 PK 对战后，就可以把成绩存入这里啦！
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F2] border-b border-stone-200 text-xs font-semibold text-stone-500">
                  <th className="py-3.5 px-5 w-20">排名</th>
                  <th className="py-3.5 px-5">学生 / 小组</th>
                  <th className="py-3.5 px-5">挑战项目</th>
                  <th className="py-3.5 px-5">星级评价</th>
                  <th className="py-3.5 px-5 text-right">得分</th>
                  <th className="py-3.5 px-5 w-16 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {filtered.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold tabular-nums text-stone-600">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-stone-900">
                      {entry.playerName}
                    </td>
                    <td className="py-3.5 px-5 text-stone-600">{entry.mode}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= entry.stars
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-stone-200'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-base font-bold tabular-nums text-stone-900">
                      {entry.score}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        aria-label={`删除 ${entry.playerName} 的成绩`}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
