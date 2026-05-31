"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { getPriceHistory } from "@/lib/apiClient";
import { formatPrice } from "@/app/utils/format";

// ─── Config khoảng thời gian ──────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { key: "7d",   label: "7 ngày",  shortLabel: "7N" },
  { key: "30d",  label: "1 tháng", shortLabel: "1T" },
  { key: "90d",  label: "3 tháng", shortLabel: "3T" },
  { key: "180d", label: "6 tháng", shortLabel: "6T" },
];

const RANGE_LABEL_MAP = {
  "7d":   "Tuần trước",
  "30d":  "Tháng trước",
  "90d":  "3 tháng trước",
  "180d": "6 tháng trước",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAxisDay(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(d);
}

function formatAxisWeek(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(d);
}

/** Khử dedup: chỉ giữ lại những điểm mà giá thay đổi so với điểm trước — tránh bậu thang */
function deduplicateConsecutive(history) {
  if (!history || history.length === 0) return history;
  const result = [history[0]];
  for (let i = 1; i < history.length; i++) {
    if (history[i].minPrice !== history[i - 1].minPrice) {
      result.push(history[i]);
    }
  }
  return result;
}

function formatTooltipDate(dateStr, groupBy) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (groupBy === "week") {
    return `Tuần từ ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(d)}`;
  }
  const today = new Date();
  const diffDay = Math.floor((today - d) / 86400000);
  if (diffDay === 0) return "Hôm nay";
  if (diffDay === 1) return "Hôm qua";
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }).format(d);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, groupBy }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-zinc-900 border border-violet-500/30 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs min-w-[150px]">
      <p className="text-zinc-400 font-medium mb-1">{formatTooltipDate(d?.day, groupBy)}</p>
      <p className="text-violet-300 font-black text-sm">{formatPrice(d?.minPrice)}</p>
      {d?.bestRetailer && (
        <p className="text-zinc-500 mt-0.5 truncate">{d.bestRetailer}</p>
      )}
    </div>
  );
}

// ─── Custom Active Dot ────────────────────────────────────────────────────────

function ActiveDot({ cx, cy }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#7c3aed" opacity={0.2} />
      <circle cx={cx} cy={cy} r={4} fill="#7c3aed" stroke="#a78bfa" strokeWidth={2} />
    </g>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ periodChangePercent, periodChangeTrend, minPrice, maxPrice, range }) {
  const trendConfig = {
    down:   { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40", icon: "▼" },
    up:     { color: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40",             icon: "▲" },
    stable: { color: "text-zinc-500 dark:text-zinc-400",       bg: "bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/40",            icon: "→" },
  };
  const trend = trendConfig[periodChangeTrend] || trendConfig.stable;
  const periodLabel = RANGE_LABEL_MAP[range] || "Kỳ trước";

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      <div className={`flex flex-col items-center justify-center rounded-xl px-2 py-2.5 border text-center ${trend.bg}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${trend.color}`}>{periodLabel}</span>
        {periodChangePercent !== null ? (
          <span className={`text-sm font-black ${trend.color}`}>
            {trend.icon} {periodChangePercent > 0 ? "+" : ""}{periodChangePercent}%
          </span>
        ) : <span className="text-xs text-zinc-400">—</span>}
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl px-2 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-emerald-600 dark:text-emerald-500">Thấp nhất</span>
        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 leading-tight">
          {minPrice ? formatPrice(minPrice) : "—"}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl px-2 py-2.5 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-rose-600 dark:text-rose-500">Cao nhất</span>
        <span className="text-xs font-black text-rose-700 dark:text-rose-400 leading-tight">
          {maxPrice ? formatPrice(maxPrice) : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Group các ngày liên tiếp có cùng giá ────────────────────────────────────
// history được sort DESC (mới nhất trước). Duyệt từ đầu → cuối:
// mỗi nhóm có endDay (ngày mới nhất) và startDay (ngày cũ nhất).

function groupConsecutivePrices(history) {
  if (!history || history.length === 0) return [];

  const groups = [];
  // endDay = ngày đầu tiên gặp (mới nhất vì DESC)
  let endDay      = history[0].day;
  let startDay    = history[0].day;
  let groupPrice  = history[0].minPrice;
  let groupRetailer = history[0].bestRetailer;

  for (let i = 1; i < history.length; i++) {
    if (history[i].minPrice === groupPrice) {
      // Cùng giá → mở rộng nhóm về phía quá khứ
      startDay = history[i].day;
    } else {
      groups.push({ startDay, endDay, minPrice: groupPrice, bestRetailer: groupRetailer });
      endDay       = history[i].day;
      startDay     = history[i].day;
      groupPrice   = history[i].minPrice;
      groupRetailer = history[i].bestRetailer;
    }
  }
  groups.push({ startDay, endDay, minPrice: groupPrice, bestRetailer: groupRetailer });

  return groups; // vẫn theo thứ tự DESC
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({ history, minPrice, groupBy }) {
  const groups = groupConsecutivePrices(history);

  function calcChange(current, previous) {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }

  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  function formatShort(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(d);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/60">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700/60">
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {groupBy === "week" ? "Tuần" : "Giai đoạn"}
        </span>
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Giá thấp nhất</span>
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Thay đổi</span>
      </div>

      {/* Rows — mỗi row là 1 nhóm giá liên tiếp */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-700/40 max-h-[300px] overflow-y-auto">
        {groups.map((grp, idx) => {
          const prevPrice = groups[idx + 1]?.minPrice ?? null;
          const change = calcChange(grp.minPrice, prevPrice);
          const isMin = minPrice && grp.minPrice === minPrice;
          const isSingleDay = grp.startDay === grp.endDay;
          const includestoday = groupBy === "day" && isToday(grp.endDay);

          // Label ngày
          let dateLabel;
          if (groupBy === "week") {
            dateLabel = isSingleDay
              ? `Tuần ${formatShort(grp.startDay)}`
              : `${formatShort(grp.startDay)} – ${formatShort(grp.endDay)}`;
          } else if (isSingleDay) {
            dateLabel = includestoday ? "Hôm nay" : formatShort(grp.endDay);
          } else {
            const startFmt = formatShort(grp.startDay);
            const endFmt   = includestoday ? "nay" : formatShort(grp.endDay);
            dateLabel = `${startFmt} – ${endFmt}`;
          }

          let changeBadge = null;
          if (change !== null) {
            const isDown = change < -0.1;
            const isUp   = change > 0.1;
            changeBadge = (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isDown ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : isUp  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              }`}>
                {isDown ? "▼" : isUp ? "▲" : "→"} {Math.abs(change).toFixed(1)}%
              </span>
            );
          }

          return (
            <div
              key={`${grp.startDay}-${grp.endDay}`}
              className={`grid grid-cols-[1fr_1fr_auto] gap-2 items-center px-4 py-3 transition-colors ${
                includestoday
                  ? "bg-violet-50 dark:bg-violet-900/10"
                  : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              }`}
            >
              {/* Cột ngày */}
              <div className="flex items-center gap-2 min-w-0">
                {includestoday && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                <div className={!includestoday ? "pl-3.5" : ""}>
                  <p className={`text-xs font-bold truncate ${
                    includestoday ? "text-violet-700 dark:text-violet-300" : "text-zinc-800 dark:text-zinc-200"
                  }`}>
                    {dateLabel}
                  </p>
                  {grp.bestRetailer && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{grp.bestRetailer}</p>
                  )}
                </div>
              </div>

              {/* Cột giá */}
              <div className="flex items-center gap-1.5 min-w-0">
                <p className={`text-sm font-black truncate ${
                  isMin ? "text-emerald-600 dark:text-emerald-400"
                  : includestoday ? "text-violet-700 dark:text-violet-300"
                                  : "text-zinc-800 dark:text-zinc-100"
                }`}>
                  {formatPrice(grp.minPrice)}
                </p>
                {isMin && (
                  <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full shrink-0">
                    MIN
                  </span>
                )}
              </div>

              {/* Cột thay đổi */}
              <div className="text-right">
                {changeBadge ?? <span className="text-[10px] text-zinc-300 dark:text-zinc-600">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chart View ───────────────────────────────────────────────────────────────

function ChartView({ history, minPrice, groupBy }) {
  // Dedup cho LINE: ch\u1ec9 v\u1ebd \u0111i\u1ec3m khi gi\u00e1 thay \u0111\u1ed5i
  const raw = [...history].reverse();
  const chartData = deduplicateConsecutive(raw);

  // Dynamic Y-axis ticks: l\u1ea5y c\u00e1c m\u1ee9c gi\u00e1 th\u1ef1c t\u1ebf xu\u1ea5t hi\u1ec7n trong data
  const uniquePrices = [...new Set(history.map((d) => d.minPrice))].sort((a, b) => a - b);

  const globalMin = minPrice;
  const pricesInView = chartData.map((d) => d.minPrice).filter(Boolean);
  const dataMax = pricesInView.length ? Math.max(...pricesInView) : 0;
  const dataMin = pricesInView.length ? Math.min(...pricesInView) : 0;
  const pad = (dataMax - dataMin) * 0.12 || dataMax * 0.06 || 50000;
  const yMin = Math.floor((dataMin - pad) / 10000) * 10000;
  const yMax = Math.ceil((dataMax + pad) / 10000) * 10000;

  // Width c\u1ed9t Y d\u1ef1a theo \u0111\u1ed9 d\u00e0i s\u1ed1 l\u1edbn nh\u1ea5t (VD: "17.190.000 \u20ab" r\u1ed9ng h\u01a1n "690.000 \u20ab")
  const yAxisWidth = dataMax >= 10_000_000 ? 100 : dataMax >= 1_000_000 ? 88 : 78;

  const xTickFormatter = groupBy === "week" ? formatAxisWeek : formatAxisDay;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="4 4"
            stroke="currentColor"
            className="text-zinc-200 dark:text-zinc-700/50"
            vertical={false}
          />

          <XAxis
            dataKey="day"
            tickFormatter={xTickFormatter}
            tick={{ fontSize: 10, fill: "currentColor", className: "text-zinc-400 dark:text-zinc-500" }}
            axisLine={false}
            tickLine={false}
            dy={6}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[yMin, yMax]}
            ticks={uniquePrices}
            tickFormatter={(v) => formatPrice(v)}
            tick={{ fontSize: 10, fill: "currentColor", className: "text-zinc-400 dark:text-zinc-500" }}
            axisLine={false}
            tickLine={false}
            width={yAxisWidth}
          />

          <Tooltip
            content={<CustomTooltip groupBy={groupBy} />}
            cursor={{ stroke: "#7c3aed", strokeWidth: 1, strokeDasharray: "4 4" }}
          />

          {globalMin && (
            <ReferenceLine
              y={globalMin}
              stroke="#10b981"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{ value: "MIN", position: "insideTopRight", fontSize: 9, fill: "#10b981", fontWeight: "bold" }}
            />
          )}

          <Area
            type="monotone"
            dataKey="minPrice"
            stroke="#7c3aed"
            strokeWidth={2.5}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={<ActiveDot />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PriceHistoryChart({ productId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("chart");   // "chart" | "table"
  const [range, setRange] = useState("7d");    // "7d" | "30d" | "90d" | "180d"

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await getPriceHistory(productId, range);
      setData(res.data);
    } catch (e) {
      console.error("Failed to fetch price history", e);
    } finally {
      setLoading(false);
    }
  }, [productId, range]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-3">
        {/* Range tabs skeleton */}
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((r) => (
            <div key={r.key} className="h-7 w-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
        {/* View tabs skeleton */}
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="h-48 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!data || !data.history || data.history.length === 0) {
    return (
      <div className="space-y-3">
        {/* Range tabs (vẫn hiển thị kể cả khi empty để user chuyển tab) */}
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                range === opt.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Chưa có dữ liệu lịch sử giá</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">Dữ liệu sẽ được cập nhật sau khi crawler chạy</p>
        </div>
      </div>
    );
  }

  const { history, groupBy, periodChangePercent, periodChangeTrend, minPrice, maxPrice } = data;

  return (
    <div className="w-full space-y-3">

      {/* ── Range Tabs ── */}
      <div className="flex gap-1.5 flex-wrap">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              range === opt.key
                ? "bg-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/30"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── View Toggle (Biểu đồ / Bảng) ── */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-fit">
        <button
          onClick={() => setView("chart")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            view === "chart"
              ? "bg-white dark:bg-zinc-700 text-violet-600 dark:text-violet-300 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
          </svg>
          Biểu đồ
        </button>
        <button
          onClick={() => setView("table")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            view === "table"
              ? "bg-white dark:bg-zinc-700 text-violet-600 dark:text-violet-300 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18" />
          </svg>
          Bảng
        </button>
      </div>

      {/* ── Content ── */}
      {view === "chart" ? (
        <ChartView history={history} minPrice={minPrice} groupBy={groupBy} />
      ) : (
        <TableView history={history} minPrice={minPrice} groupBy={groupBy} />
      )}

      {/* ── Stats Row ── */}
      <StatsRow
        periodChangePercent={periodChangePercent}
        periodChangeTrend={periodChangeTrend}
        minPrice={minPrice}
        maxPrice={maxPrice}
        range={range}
      />

    </div>
  );
}
