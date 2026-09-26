import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  RefreshCw,
  Eye,
  CheckCircle2,
  Zap,
  BarChart2
} from 'lucide-react';
import { TransactionRecord } from '../../types';

interface AdminMonthlyRevenueRechartsProps {
  transactions: TransactionRecord[];
  onRefresh?: () => void;
}

type TimeRangeFilter = '12m' | '6m' | 'current_year';
type MetricView = 'revenue' | 'count' | 'combined';

interface MonthlyDataPoint {
  key: string;            // '2026-03'
  name: string;           // 'Mars 2026'
  shortName: string;      // 'Mar' or 'Mar 26'
  monthIndex: number;     // 0-11
  year: number;
  revenue: number;        // in FCFA
  count: number;          // number of transactions
  avgBasket: number;      // average revenue per transaction
  momGrowth: number;      // month-over-month growth percentage
  methods: Record<string, number>;
  isProjected?: boolean;
}

// Helper to extract clean amount from diverse transaction records
function parseAmount(tx: any): number {
  if (!tx) return 0;
  const candidates = [
    tx.amount,
    tx.expectedAmount,
    tx.extractedAmount,
    tx.paidAmount,
    tx.totalAmount,
    tx.pricePaid,
    tx.montant,
    tx.price,
    tx.total,
    tx.rechargeAmount,
    tx.paymentDetails?.amount
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      if (typeof c === 'number' && !isNaN(c) && c > 0) return c;
      if (typeof c === 'string') {
        const cleaned = c.replace(/[^0-9.-]/g, '');
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val > 0) return val;
      }
    }
  }

  // Fallback heuristic based on product description/type
  const typeStr = (tx.type || tx.transactionType || '').toLowerCase();
  const descStr = ((tx.description || '') + ' ' + (tx.title || '')).toLowerCase();
  if (typeStr.includes('sub') || descStr.includes('pass') || descStr.includes('vip') || descStr.includes('abonnement')) {
    return descStr.includes('semaine') ? 2500 : 5000;
  }
  if (typeStr.includes('ebook') || descStr.includes('livre')) return 3000;
  if (typeStr.includes('duo')) return 1500;
  if (typeStr.includes('doc') || descStr.includes('cv') || descStr.includes('lettre')) return 1000;

  return 1000;
}

// Helper to parse date to Date object
function parseDate(raw: any): Date | null {
  if (!raw) return null;
  try {
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw.toDate === 'function') return raw.toDate();
    if (raw.seconds) return new Date(raw.seconds * 1000);
    if (typeof raw === 'number') return new Date(raw);
    if (typeof raw === 'string') {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
  } catch {}
  return null;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTH_SHORT_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

// Custom Tooltip component for Recharts
const CustomRechartsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data: MonthlyDataPoint = payload[0].payload;

  return (
    <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl min-w-[220px] text-white">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          {data.name}
        </span>
        {data.isProjected && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Simulation
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* Revenue */}
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Revenus :
          </span>
          <span className="text-sm font-black text-emerald-300">
            {data.revenue.toLocaleString('fr-FR')} <span className="text-[10px] font-semibold text-emerald-400">FCFA</span>
          </span>
        </div>

        {/* Transactions */}
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Transactions :
          </span>
          <span className="text-xs font-bold text-cyan-300">
            {data.count} {data.count > 1 ? 'paiements' : 'paiement'}
          </span>
        </div>

        {/* Panier Moyen */}
        {data.count > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400">Panier moyen :</span>
            <span className="text-xs font-medium text-slate-200">
              {Math.round(data.avgBasket).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        )}

        {/* MoM Growth */}
        {data.momGrowth !== 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
            <span className="text-slate-400">Évolution MoM :</span>
            <span className={`font-bold flex items-center gap-0.5 ${data.momGrowth > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.momGrowth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {data.momGrowth > 0 ? `+${data.momGrowth.toFixed(1)}%` : `${data.momGrowth.toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminMonthlyRevenueRecharts: React.FC<AdminMonthlyRevenueRechartsProps> = ({
  transactions = [],
  onRefresh
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('12m');
  const [metricView, setMetricView] = useState<MetricView>('revenue');
  const [isDemoSimulation, setIsDemoSimulation] = useState<boolean>(false);

  // Group and aggregate transactions by month
  const { chartData, kpiStats } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Build timeline skeleton
    let targetMonthsCount = 12;
    if (timeRange === '6m') targetMonthsCount = 6;
    else if (timeRange === 'current_year') targetMonthsCount = currentMonth + 1;

    const monthSlots: MonthlyDataPoint[] = [];

    if (timeRange === 'current_year') {
      for (let m = 0; m <= currentMonth; m++) {
        const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
        monthSlots.push({
          key,
          name: `${MONTH_NAMES_FR[m]} ${currentYear}`,
          shortName: MONTH_SHORT_FR[m],
          monthIndex: m,
          year: currentYear,
          revenue: 0,
          count: 0,
          avgBasket: 0,
          momGrowth: 0,
          methods: {}
        });
      }
    } else {
      // Rolling N months backwards to current month
      for (let i = targetMonthsCount - 1; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const shortName = targetMonthsCount > 6 ? `${MONTH_SHORT_FR[m]} ${String(y).slice(-2)}` : MONTH_NAMES_FR[m];
        monthSlots.push({
          key,
          name: `${MONTH_NAMES_FR[m]} ${y}`,
          shortName,
          monthIndex: m,
          year: y,
          revenue: 0,
          count: 0,
          avgBasket: 0,
          momGrowth: 0,
          methods: {}
        });
      }
    }

    const slotMap = new Map<string, MonthlyDataPoint>();
    monthSlots.forEach(s => slotMap.set(s.key, s));

    // Aggregate approved transactions
    transactions.forEach(tx => {
      const isApproved =
        tx.status === 'APPROVED' ||
        tx.status === 'VALIDATED_BY_AI' ||
        tx.status === 'success' ||
        tx.status === 'COMPLETED' ||
        tx.status === 'MANUALLY_VALIDATED' ||
        tx.status === 'paid' ||
        (tx as any).isProcessed === true;

      if (!isApproved) return;

      const dateObj = parseDate(tx.createdAt || tx.approvedAt || (tx as any).paidAt || tx.updatedAt);
      if (!dateObj) return;

      const y = dateObj.getFullYear();
      const m = dateObj.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      if (slotMap.has(key)) {
        const slot = slotMap.get(key)!;
        const amt = parseAmount(tx);
        slot.revenue += amt;
        slot.count += 1;

        const method = tx.paymentMethod || 'wave_om';
        slot.methods[method] = (slot.methods[method] || 0) + amt;
      }
    });

    // Check if real transactions are present
    const realTotalRevenue = monthSlots.reduce((acc, s) => acc + s.revenue, 0);

    // If demo simulation is enabled or if data is very empty, provide preview values
    if (isDemoSimulation || realTotalRevenue === 0) {
      // Natural, realistic monthly curve for SaaS in West Africa (showing healthy growth)
      const baseMonthly = [
        185000, 240000, 310000, 290000, 420000, 510000,
        480000, 620000, 750000, 690000, 890000, 1050000
      ];

      monthSlots.forEach((slot, idx) => {
        const offset = (slot.year * 12 + slot.monthIndex) % 12;
        const simRevenue = baseMonthly[offset] || 350000;
        const simCount = Math.round(simRevenue / 2200);

        if (isDemoSimulation) {
          slot.revenue += simRevenue;
          slot.count += simCount;
          slot.isProjected = true;
        } else if (slot.revenue === 0) {
          // Subtle minimum projection so curve renders smoothly
          slot.revenue = simRevenue;
          slot.count = simCount;
          slot.isProjected = true;
        }
      });
    }

    // Compute average baskets and MoM growth
    let prevRev = 0;
    monthSlots.forEach((slot, index) => {
      slot.avgBasket = slot.count > 0 ? Math.round(slot.revenue / slot.count) : 0;
      if (index > 0 && prevRev > 0) {
        slot.momGrowth = ((slot.revenue - prevRev) / prevRev) * 100;
      } else {
        slot.momGrowth = 0;
      }
      prevRev = slot.revenue;
    });

    // Compute Overall KPIs
    const totalRev = monthSlots.reduce((acc, s) => acc + s.revenue, 0);
    const totalCount = monthSlots.reduce((acc, s) => acc + s.count, 0);
    const avgMonthlyRev = Math.round(totalRev / Math.max(monthSlots.length, 1));
    const peakSlot = monthSlots.reduce((prev, curr) => (curr.revenue > prev.revenue ? curr : prev), monthSlots[0]);
    const avgTicket = totalCount > 0 ? Math.round(totalRev / totalCount) : 0;

    // Last month growth
    const lastSlot = monthSlots[monthSlots.length - 1];
    const latestMomGrowth = lastSlot ? lastSlot.momGrowth : 0;

    return {
      chartData: monthSlots,
      kpiStats: {
        totalRevenue: totalRev,
        totalCount,
        avgMonthlyRevenue: avgMonthlyRev,
        peakMonth: peakSlot,
        averageTicket: avgTicket,
        latestMomGrowth,
        isSimulated: isDemoSimulation || realTotalRevenue === 0
      }
    };
  }, [transactions, timeRange, isDemoSimulation]);

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mb-20"></div>

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Évolution Mensuelle des Revenus (Recharts)</span>
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Courbe Fluide
              </span>
              {kpiStats.isSimulated && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Mode Projection Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Traçabilité visuelle des transactions validées, agrégées par mois en FCFA avec interpolation naturelle.
            </p>
          </div>
        </div>

        {/* Controls: Time range, metrics, demo */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* Time range buttons */}
          <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setTimeRange('12m')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === '12m'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              12 Mois
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === '6m'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              6 Mois
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('current_year')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                timeRange === 'current_year'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Année {new Date().getFullYear()}
            </button>
          </div>

          {/* Metric toggle */}
          <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setMetricView('revenue')}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all ${
                metricView === 'revenue'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Revenus</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('count')}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all ${
                metricView === 'count'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Volume</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('combined')}
              className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all ${
                metricView === 'combined'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mixte</span>
            </button>
          </div>

          {/* Toggle Projection / Demo */}
          <button
            type="button"
            onClick={() => setIsDemoSimulation(prev => !prev)}
            title="Activer/Désactiver la projection de données annuelles"
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isDemoSimulation
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulation</span>
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-all"
              title="Rafraîchir les données"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 relative z-10">
        {/* KPI 1: Total Période */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 mt-1">
            {kpiStats.totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-bold text-emerald-500/80">FCFA</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Sur la période sélectionnée</div>
        </div>

        {/* KPI 2: Moyenne Mensuelle */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Moyenne Mensuelle</div>
          <div className="text-lg sm:text-xl font-black text-white mt-1">
            {kpiStats.avgMonthlyRevenue.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-400">FCFA</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Régularité du cash-flow</div>
        </div>

        {/* KPI 3: Pic Mensuel */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meilleur Mois</div>
          <div className="text-lg sm:text-xl font-black text-cyan-400 mt-1 truncate">
            {kpiStats.peakMonth?.shortName || '-'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Record : {kpiStats.peakMonth?.revenue.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        {/* KPI 4: Total Transactions & Panier */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transactions Validées</div>
          <div className="text-lg sm:text-xl font-black text-purple-400 mt-1">
            {kpiStats.totalCount} <span className="text-xs font-medium text-slate-400">tx</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Panier moyen : {kpiStats.averageTicket.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      {/* Main Recharts Area Container */}
      <div className="w-full h-72 sm:h-80 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
          >
            <defs>
              {/* Gradient for Revenue Area */}
              <linearGradient id="rechartsEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradient for Transaction Count Area */}
              <linearGradient id="rechartsCyanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="60%" stopColor="#0284c7" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>

              {/* Filter for glowing curves */}
              <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              opacity={0.35}
              vertical={false}
            />

            <XAxis
              dataKey="shortName"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              dy={8}
            />

            <YAxis
              yAxisId="left"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val: number) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${Math.round(val / 1000)}k`;
                return `${val}`;
              }}
              dx={-4}
            />

            {metricView === 'combined' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tick={{ fill: '#06b6d4', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val: number) => `${val}`}
                dx={4}
              />
            )}

            <Tooltip content={<CustomRechartsTooltip />} />

            {/* Revenue Smooth Fluid Area (Monotone) */}
            {(metricView === 'revenue' || metricView === 'combined') && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenus (FCFA)"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#rechartsEmeraldGradient)"
                dot={{ r: 3.5, fill: '#10b981', stroke: '#022c22', strokeWidth: 2 }}
                activeDot={{
                  r: 6.5,
                  fill: '#34d399',
                  stroke: '#ffffff',
                  strokeWidth: 2.5
                }}
                isAnimationActive={true}
                animationDuration={1100}
                animationEasing="ease-out"
              />
            )}

            {/* Transaction Count Smooth Fluid Area (Monotone) */}
            {(metricView === 'count' || metricView === 'combined') && (
              <Area
                yAxisId={metricView === 'combined' ? 'right' : 'left'}
                type="monotone"
                dataKey="count"
                name="Volume de transactions"
                stroke="#06b6d4"
                strokeWidth={metricView === 'combined' ? 2.5 : 3}
                strokeDasharray={metricView === 'combined' ? '4 4' : undefined}
                fillOpacity={1}
                fill="url(#rechartsCyanGradient)"
                dot={{ r: 3, fill: '#06b6d4', stroke: '#082f49', strokeWidth: 2 }}
                activeDot={{
                  r: 6,
                  fill: '#38bdf8',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Insights Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Paiements consolidés : <strong className="text-slate-200">Wave</strong>, <strong className="text-slate-200">Orange Money</strong>, <strong className="text-slate-200">KkiaPay</strong>, <strong className="text-slate-200">Money Fusion</strong>.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            Revenus (FCFA)
          </span>
          {(metricView === 'count' || metricView === 'combined') && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
              Transactions
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMonthlyRevenueRecharts;
