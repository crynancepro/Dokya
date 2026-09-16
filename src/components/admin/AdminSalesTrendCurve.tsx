import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, ArrowUpRight, DollarSign, Zap, CheckCircle2 } from 'lucide-react';
import { TransactionRecord } from '../../types';

interface AdminSalesTrendCurveProps {
  transactions: TransactionRecord[];
}

interface DayData {
  dateIso: string;
  label: string;
  dayOfMonth: string;
  revenue: number;
  count: number;
}

export const AdminSalesTrendCurve: React.FC<AdminSalesTrendCurveProps> = ({ transactions }) => {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Compute 30 days timeline ending today
  const { days, total30Days, averageDaily, peakDay, totalCount30Days, maxRevenue } = useMemo(() => {
    const dayMap = new Map<string, DayData>();
    const now = new Date();

    // 30 days back from today
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const dayOfMonth = d.getDate().toString();
      dayMap.set(iso, {
        dateIso: iso,
        label,
        dayOfMonth,
        revenue: 0,
        count: 0
      });
    }

    let total = 0;
    let countTotal = 0;

    transactions.forEach((tx) => {
      const isApproved = 
        tx.status === 'APPROVED' || 
        tx.status === 'VALIDATED_BY_AI' || 
        tx.status === 'success' || 
        tx.status === 'COMPLETED' || 
        tx.status === 'MANUALLY_VALIDATED';

      if (!isApproved) return;

      try {
        const txIso = new Date(tx.createdAt).toISOString().split('T')[0];
        if (dayMap.has(txIso)) {
          const entry = dayMap.get(txIso)!;
          const amt = Math.abs(Number(tx.amount || tx.expectedAmount || tx.extractedAmount || 0));
          entry.revenue += amt;
          entry.count += 1;
          total += amt;
          countTotal += 1;
        }
      } catch (_e) {}
    });

    const dayArray = Array.from(dayMap.values());
    const maxRev = Math.max(...dayArray.map((d) => d.revenue), 1000); // minimum scale ceiling
    const peak = dayArray.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), dayArray[0]);

    return {
      days: dayArray,
      total30Days: total,
      averageDaily: Math.round(total / 30),
      peakDay: peak,
      totalCount30Days: countTotal,
      maxRevenue: maxRev
    };
  }, [transactions]);

  // Dimensions for SVG plotting
  const width = 800;
  const height = 220;
  const paddingX = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  // Compute points
  const points = useMemo(() => {
    return days.map((day, idx) => {
      const x = paddingX + (idx / (days.length - 1)) * chartW;
      const y = paddingTop + chartH - (day.revenue / maxRevenue) * chartH;
      return { x, y, day };
    });
  }, [days, maxRevenue, chartW, chartH]);

  // Build SVG path (Bézier smoothing)
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  // Area path for gradient fill
  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const groundY = paddingTop + chartH;
    return `${pathD} L ${lastX} ${groundY} L ${firstX} ${groundY} Z`;
  }, [pathD, points, chartH]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header & Meta KPIs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Courbe des Ventes — 30 Derniers Jours</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Firestore Réel
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Évolution quotidienne des flux encaissés automatiquement via Webhook Money Fusion.
          </p>
        </div>

        {/* 4 mini badges metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total 30j</span>
            <span className="text-sm sm:text-base font-black text-white">
              {total30Days.toLocaleString('fr-FR')} <span className="text-[10px] text-emerald-400 font-semibold">FCFA</span>
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Moyenne / Jour</span>
            <span className="text-sm sm:text-base font-black text-slate-200">
              {averageDaily.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-400 font-semibold">FCFA</span>
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pic Journalier</span>
            <span className="text-sm sm:text-base font-black text-amber-400">
              {peakDay.revenue.toLocaleString('fr-FR')} <span className="text-[10px] text-amber-300 font-semibold">FCFA</span>
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Paiements Validés</span>
            <span className="text-sm sm:text-base font-black text-emerald-300">
              {totalCount30Days} <span className="text-[10px] font-semibold">ventes</span>
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart Graphic */}
      <div className="relative pt-2">
        {/* Tooltip on Hover */}
        {hoveredDay && (
          <div className="absolute top-2 right-4 z-10 px-3.5 py-2 rounded-xl bg-slate-950/95 border border-emerald-500/40 shadow-2xl backdrop-blur-sm pointer-events-none transition-all">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white">{hoveredDay.label}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono">
              <span className="text-sm font-black text-emerald-400">
                {hoveredDay.revenue.toLocaleString('fr-FR')} FCFA
              </span>
              <span className="text-[10px] text-slate-400">
                ({hoveredDay.count} transaction{hoveredDay.count > 1 ? 's' : ''})
              </span>
            </div>
          </div>
        )}

        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-48 sm:h-56 select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#059669" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingTop + chartH * (1 - ratio);
              const val = Math.round(maxRevenue * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="#1E293B"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={width - paddingX - 4}
                    y={y - 4}
                    textAnchor="end"
                    fill="#64748B"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {val.toLocaleString('fr-FR')} F
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {points.length > 0 && (
              <path d={areaD} fill="url(#curveGradient)" />
            )}

            {/* Curve Line */}
            {points.length > 0 && (
              <path
                d={pathD}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points & Interactive Touch */}
            {points.map((pt, i) => {
              const isPeak = pt.day.dateIso === peakDay.dateIso && pt.day.revenue > 0;
              const isHovered = hoveredDay?.dateIso === pt.day.dateIso;
              const hasSales = pt.day.revenue > 0;

              return (
                <g key={pt.day.dateIso}>
                  {/* Invisible hit area */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDay(pt.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  />

                  {/* Visible point circle */}
                  {(hasSales || isHovered || isPeak) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isPeak ? 5 : isHovered ? 4.5 : 3}
                      fill={isPeak ? '#F59E0B' : '#10B981'}
                      stroke="#0F172A"
                      strokeWidth="2"
                      className="transition-all duration-150 pointer-events-none"
                    />
                  )}
                </g>
              );
            })}

            {/* X-axis date labels */}
            {points.map((pt, i) => {
              // Show label every 5 days + last day
              const showLabel = i % 5 === 0 || i === points.length - 1;
              if (!showLabel) return null;

              return (
                <text
                  key={`label-${pt.day.dateIso}`}
                  x={pt.x}
                  y={height - 12}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {pt.day.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Données réelles synchronisées en continu avec la collection Firestore <code className="text-emerald-400">transactions</code></span>
        </div>
        <div className="text-slate-500 font-mono">
          Fenêtre glissante : 30 jours calendaires
        </div>
      </div>
    </div>
  );
};
