import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart2, Clock, Mic, Zap, Globe, Flame, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { getUserSessions, VocalSession } from '../firebase/sessionService';

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
}

const LANG_COLORS  = ['#6366f1', '#a855f7'];
const EMOTE_COLORS: Record<string, string> = {
  Neutral: '#6366f1', Happy: '#f59e0b', Excited: '#ec4899',
  Sad: '#38bdf8', Angry: '#ef4444', Calm: '#10b981',
};
const EMOTE_EMOJI: Record<string, string> = {
  Neutral: '😐', Happy: '😊', Excited: '🤩',
  Sad: '😢', Angry: '😠', Calm: '😌',
};

/** Returns an ISO date string "YYYY-MM-DD" for a given Date */
const toDateKey = (d: Date) => d.toISOString().slice(0, 10);

/** Build a 365-day map: date → count */
const buildHeatmap = (sessions: VocalSession[]) => {
  const map: Record<string, number> = {};
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    map[toDateKey(d)] = 0;
  }
  for (const s of sessions) {
    if (s.createdAt) {
      const key = toDateKey(s.createdAt.toDate());
      if (key in map) map[key]++;
    }
  }
  return map;
};

/** Group heatmap days into 53 columns (Sun→Sat) */
const buildWeekGrid = (map: Record<string, number>) => {
  const days = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // pad front to start on Sunday
  const firstDay = new Date(days[0].date).getDay(); // 0=Sun
  const padded = [...Array(firstDay).fill(null), ...days];
  const weeks: (typeof days[0] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
};

const cellColor = (count: number) => {
  if (count === 0) return 'bg-white/5';
  if (count === 1) return 'bg-indigo-900/60';
  if (count === 2) return 'bg-indigo-700/70';
  if (count <= 4) return 'bg-indigo-500/80';
  return 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]';
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay?: number;
}> = ({ icon, label, value, sub, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`relative overflow-hidden p-5 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10 pointer-events-none`} />
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
    {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip for Pie
// ─────────────────────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-[#0a0f1e] border border-white/10 rounded-xl px-4 py-2 text-xs text-white shadow-2xl">
      <span className="font-bold">{name}</span>: {value} session{value !== 1 ? 's' : ''}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom Tooltip for Bar
// ─────────────────────────────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0f1e] border border-white/10 rounded-xl px-4 py-2 text-xs text-white shadow-2xl">
      <span>{EMOTE_EMOJI[label]} {label}</span>: <span className="font-bold">{payload[0].value}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; delay?: number }> = ({
  title, icon, children, delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white/5 border border-white/5 rounded-2xl p-5"
  >
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 text-indigo-400">{icon}</div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3>
    </div>
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Month labels for heatmap
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const getMonthLabels = (weeks: (any | null)[][]) => {
  const labels: { month: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const first = week.find(Boolean);
    if (!first) return;
    const m = new Date(first.date).getMonth();
    if (m !== lastMonth) { labels.push({ month: MONTHS[m], col }); lastMonth = m; }
  });
  return labels;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsDashboard: React.FC<Props> = ({ isOpen, onClose, uid }) => {
  const [sessions, setSessions] = useState<VocalSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && uid) {
      setIsLoading(true);
      getUserSessions(uid)
        .then(setSessions)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, uid]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.audioDurationSec ?? 0), 0) / 60;

    // Favourite voice
    const voiceCount: Record<string, number> = {};
    sessions.forEach(s => { voiceCount[s.voice] = (voiceCount[s.voice] ?? 0) + 1; });
    const favVoice = Object.entries(voiceCount).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—';

    // Favourite emotion
    const emoteCount: Record<string, number> = {};
    sessions.forEach(s => { emoteCount[s.emotion] = (emoteCount[s.emotion] ?? 0) + 1; });
    const favEmotion = Object.entries(emoteCount).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—';

    // Language breakdown
    const langCount: Record<string, number> = {};
    sessions.forEach(s => { langCount[s.language] = (langCount[s.language] ?? 0) + 1; });
    const langData = Object.entries(langCount).map(([name, value]) => ({ name, value }));

    // Emotion breakdown (bar chart)
    const emotionData = Object.entries(emoteCount).map(([name, count]) => ({ name, count }));

    // Current streak (consecutive days up to today)
    const heatmap = buildHeatmap(sessions);
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      if ((heatmap[toDateKey(d)] ?? 0) > 0) streak++;
      else break;
    }

    return { totalSessions, totalMinutes, favVoice, favEmotion, langData, emotionData, streak, heatmap };
  }, [sessions]);

  const weekGrid = useMemo(() => buildWeekGrid(stats.heatmap), [stats.heatmap]);
  const monthLabels = useMemo(() => getMonthLabels(weekGrid), [weekGrid]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* Panel — full right drawer, wider than history */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-2xl z-50 bg-[#0a0f1e] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <BarChart2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Analytics</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    Your generation insights
                  </p>
                </div>
              </div>
              <button
                id="close-analytics-btn"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-xs text-slate-600 uppercase tracking-widest font-bold">Loading analytics...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold">No data yet</p>
                    <p className="text-slate-600 text-xs mt-1">Generate your first audio session to see analytics.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Stat Cards ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={<BarChart2 className="w-5 h-5 text-white" />}
                      label="Total Sessions"
                      value={stats.totalSessions}
                      color="from-indigo-500 to-violet-600"
                      delay={0.05}
                    />
                    <StatCard
                      icon={<Clock className="w-5 h-5 text-white" />}
                      label="Audio Generated"
                      value={`${stats.totalMinutes.toFixed(1)}m`}
                      sub="Total minutes synthesized"
                      color="from-purple-500 to-pink-600"
                      delay={0.1}
                    />
                    <StatCard
                      icon={<Mic className="w-5 h-5 text-white" />}
                      label="Fav Voice"
                      value={stats.favVoice}
                      color="from-violet-500 to-indigo-600"
                      delay={0.15}
                    />
                    <StatCard
                      icon={<Zap className="w-5 h-5 text-white" />}
                      label="Fav Emotion"
                      value={`${EMOTE_EMOJI[stats.favEmotion] ?? ''} ${stats.favEmotion}`}
                      color="from-amber-500 to-orange-600"
                      delay={0.2}
                    />
                  </div>

                  {/* ── Language Breakdown ── */}
                  {stats.langData.length > 0 && (
                    <Section title="Language Breakdown" icon={<Globe className="w-5 h-5" />} delay={0.25}>
                      <div className="flex items-center gap-6">
                        <div className="w-44 h-44 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={stats.langData}
                                cx="50%" cy="50%"
                                innerRadius={46} outerRadius={70}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                              >
                                {stats.langData.map((_, i) => (
                                  <Cell key={i} fill={LANG_COLORS[i % LANG_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<PieTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-3 flex-1">
                          {stats.langData.map((lang, i) => {
                            const pct = Math.round((lang.value / stats.totalSessions) * 100);
                            return (
                              <div key={lang.name}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-bold text-slate-300">{lang.name}</span>
                                  <span className="text-xs text-slate-400 tabular-nums">
                                    {lang.value} <span className="text-slate-600">({pct}%)</span>
                                  </span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: LANG_COLORS[i % LANG_COLORS.length] }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* ── Emotion Breakdown ── */}
                  {stats.emotionData.length > 0 && (
                    <Section title="Emotion Breakdown" icon={<Zap className="w-5 h-5" />} delay={0.3}>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.emotionData} barSize={28} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                              tickLine={false} axisLine={false}
                              tickFormatter={(v) => `${EMOTE_EMOJI[v] ?? ''}`}
                            />
                            <YAxis
                              tick={{ fill: '#64748b', fontSize: 10 }}
                              tickLine={false} axisLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                              {stats.emotionData.map((entry, i) => (
                                <Cell
                                  key={i}
                                  fill={EMOTE_COLORS[entry.name] ?? '#6366f1'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Section>
                  )}

                  {/* ── Activity Heatmap ── */}
                  <Section title={`Activity Heatmap · ${stats.streak} day streak 🔥`} icon={<Flame className="w-5 h-5" />} delay={0.35}>
                    {/* Month labels */}
                    <div className="relative mb-1 overflow-x-auto pb-2">
                      <div className="flex gap-[3px] relative" style={{ minWidth: weekGrid.length * 13 }}>
                        {/* Month label row */}
                        <div className="absolute -top-5 left-0 right-0 flex" style={{ gap: '3px' }}>
                          {monthLabels.map(({ month, col }) => (
                            <span
                              key={`${month}-${col}`}
                              className="absolute text-[9px] text-slate-500 font-bold uppercase tracking-widest"
                              style={{ left: col * 13 }}
                            >
                              {month}
                            </span>
                          ))}
                        </div>
                        {/* Grid */}
                        {weekGrid.map((week, wi) => (
                          <div key={wi} className="flex flex-col gap-[3px]">
                            {week.map((day, di) =>
                              day === null ? (
                                <div key={di} className="w-[10px] h-[10px]" />
                              ) : (
                                <div
                                  key={di}
                                  title={`${day.date}: ${day.count} session${day.count !== 1 ? 's' : ''}`}
                                  className={`w-[10px] h-[10px] rounded-[2px] transition-all duration-150 hover:ring-1 hover:ring-indigo-400/60 cursor-default ${cellColor(day.count)}`}
                                />
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-2 mt-6">
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Less</span>
                      {['bg-white/5','bg-indigo-900/60','bg-indigo-700/70','bg-indigo-500/80','bg-indigo-400'].map((cls,i) => (
                        <div key={i} className={`w-[10px] h-[10px] rounded-[2px] ${cls}`} />
                      ))}
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">More</span>
                    </div>
                  </Section>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AnalyticsDashboard;
