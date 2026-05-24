"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { formatPrice } from "@/app/utils/format";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDay(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(d);
}

function formatDayLong(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }).format(d);
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isYesterday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const y = new Date(); y.setDate(y.getDate() - 1);
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
}

function dayLabel(dateStr) {
  if (isToday(dateStr)) return "Hôm nay";
  if (isYesterday(dateStr)) return "Hôm qua";
  return formatDayLong(dateStr);
}

function calcChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// ─── Custom Tooltip cho Recharts ─────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-zinc-900 dark:bg-zinc-900 border border-violet-500/30 rounded-xl px-3.5 py-2.5 shadow-2xl text-xs min-w-[140px]">
      <p className="text-zinc-400 font-medium mb-1">{dayLabel(label)}</p>
      <p className="text-violet-300 font-black text-sm">{formatPrice(d?.minPrice)}</p>
      {d?.bestRetailer && (
        <p className="text-zinc-500 mt-0.5 truncate">{d.bestRetailer}</p>
      )}
    </div>
  );
}

// ─── Custom Active Dot ────────────────────────────────────────────────────────

function ActiveDot(props) {
  const { cx, cy } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="#7c3aed" opacity={0.2} />
      <circle cx={cx} cy={cy} r={4} fill="#7c3aed" stroke="#a78bfa" strokeWidth={2} />
    </g>
  );
}

// ─── Stats Row (shared) ───────────────────────────────────────────────────────

function StatsRow({ weekChangePercent, weekChangeTrend, minPrice, maxPrice }) {
  const trendConfig = {
    down:   { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40", icon: "▼" },
    up:     { color: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40",             icon: "▲" },
    stable: { color: "text-zinc-500 dark:text-zinc-400",       bg: "bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/40",            icon: "→" },
  };
  const trend = trendConfig[weekChangeTrend] || trendConfig.stable;

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      <div className={`flex flex-col items-center justify-center rounded-xl px-2 py-2.5 border text-center ${trend.bg}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${trend.color}`}>Tuần trước</span>
        {weekChangePercent !== null ? (
          <span className={`text-sm font-black ${trend.color}`}>
            {trend.icon} {weekChangePercent > 0 ? "+" : ""}{weekChangePercent}%
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

// ─── View: Bảng ───────────────────────────────────────────────────────────────

function TableView({ history, minPrice }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/60">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700/60">
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ngày</span>
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Giá thấp nhất</span>
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Thay đổi</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-700/40">
        {history.map((row, idx) => {
          const prevPrice = history[idx + 1]?.minPrice ?? null;
          const change = calcChange(row.minPrice, prevPrice);
          const isMin = minPrice && row.minPrice === minPrice;
          const isTodayRow = isToday(row.day);

          let changeBadge = null;
          if (change !== null) {
            const isDown = change < -0.1;
            const isUp = change > 0.1;
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
            <div key={row.day} className={`grid grid-cols-[1fr_1fr_auto] gap-2 items-center px-4 py-3 transition-colors ${
              isTodayRow ? "bg-violet-50 dark:bg-violet-900/10"
                         : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {isTodayRow && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                <div className={!isTodayRow ? "pl-3.5" : ""}>
                  <p className={`text-xs font-bold truncate ${isTodayRow ? "text-violet-700 dark:text-violet-300" : "text-zinc-800 dark:text-zinc-200"}`}>
                    {dayLabel(row.day)}
                  </p>
                  {row.bestRetailer && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{row.bestRetailer}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <p className={`text-sm font-black truncate ${
                  isMin ? "text-emerald-600 dark:text-emerald-400"
                  : isTodayRow ? "text-violet-700 dark:text-violet-300"
                               : "text-zinc-800 dark:text-zinc-100"
                }`}>
                  {formatPrice(row.minPrice)}
                </p>
                {isMin && (
                  <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full shrink-0">
                    MIN
                  </span>
                )}
              </div>

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

// ─── View: Biểu đồ ────────────────────────────────────────────────────────────

function ChartView({ history, minPrice }) {
  // Recharts cần data theo thứ tự tăng dần (cũ → mới)
  const chartData = [...history].reverse();
  const globalMin = minPrice;

  const yMin = globalMin ? Math.floor(globalMin * 0.97 / 100000) * 100000 : undefined;
  const yMax = Math.ceil(Math.max(...chartData.map((d) => d.minPrice)) * 1.03 / 100000) * 100000;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={200}>
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
            tickFormatter={formatDay}
            tick={{ fontSize: 10, fill: "currentColor", className: "text-zinc-400 dark:text-zinc-500" }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />

          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
            tick={{ fontSize: 10, fill: "currentColor", className: "text-zinc-400 dark:text-zinc-500" }}
            axisLine={false}
            tickLine={false}
            width={42}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#7c3aed", strokeWidth: 1, strokeDasharray: "4 4" }}
          />

          {/* Đường highlight giá MIN */}
          {globalMin && (
            <ReferenceLine
              y={globalMin}
              stroke="#10b981"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: "MIN",
                position: "insideTopRight",
                fontSize: 9,
                fill: "#10b981",
                fontWeight: "bold",
              }}
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
  const [view, setView] = useState("chart"); // "chart" | "table"

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/price-history?id=${productId}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch price history", e);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [productId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-3">
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
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Chưa có dữ liệu lịch sử giá</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-600">Dữ liệu sẽ được cập nhật sau khi crawler chạy</p>
      </div>
    );
  }

  const { history, weekChangePercent, weekChangeTrend, minPrice, maxPrice } = data;

  return (
    <div className="w-full space-y-3">

      {/* ── Tab toggle ── */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-fit">
        <button
          onClick={() => setView("chart")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            view === "chart"
              ? "bg-white dark:bg-zinc-700 text-violet-600 dark:text-violet-300 shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          {/* Line chart icon */}
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
          {/* Table icon */}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18" />
          </svg>
          Bảng
        </button>
      </div>

      {/* ── Content ── */}
      {view === "chart" ? (
        <ChartView history={history} minPrice={minPrice} />
      ) : (
        <TableView history={history} minPrice={minPrice} />
      )}

      {/* ── Stats row (chung cho cả 2 view) ── */}
      <StatsRow
        weekChangePercent={weekChangePercent}
        weekChangeTrend={weekChangeTrend}
        minPrice={minPrice}
        maxPrice={maxPrice}
      />

      {data._mock && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-right">
          * Dữ liệu demo — sẽ tự cập nhật sau khi crawler chạy
        </p>
      )}
    </div>
  );
}
