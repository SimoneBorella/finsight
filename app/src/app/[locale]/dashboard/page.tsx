"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/routing"; 
import { useTranslations, useLocale } from "next-intl"; 
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  ArrowRight, 
  Activity,
  Target,
  BarChart3,
  Layers,
  Loader2,
  PieChart
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine
} from "recharts";

import { Button } from "@/components/ui/button";
import { AddTransactionModal } from "@/components/add-transaction-modal";

interface Transaction {
  _id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  currency: string;
}

interface Category {
  _id: string;
  name: string;
  type: "income" | "expense";
  parentCategory?: string;
  budgetGroup?: string;
  color: string;
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  
  const t = useTranslations("Dashboard"); 
  const tCat = useTranslations("Categories");
  const locale = useLocale(); 

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  React.useEffect(() => {
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/transactions?limit=10000").then((res) => res.json()), 
        fetch("/api/categories").then((res) => res.json())
      ])
        .then(([txData, catData]) => {
          if (txData && txData.transactions) setTransactions(txData.transactions);
          if (Array.isArray(catData)) setCategories(catData);
        })
        .catch((err) => console.error("Errore caricamento dashboard:", err))
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- DEFINIZIONE FINESTRA 6 MESI (Termina al mese precedente a quello attuale) ---
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const endOfPreviousMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
  
  const sixMonthsData: { month: string; sortKey: string; net: number; startDate: Date; endDate: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const startD = new Date(currentYear, currentMonth - 1 - i, 1);
    const endD = new Date(currentYear, currentMonth - i, 0, 23, 59, 59, 999);
    const monthKey = `${startD.toLocaleString(locale, { month: 'short' })} ${startD.getFullYear()}`;
    const sortKey = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`;
    sixMonthsData.push({ month: monthKey, sortKey, net: 0, startDate: startD, endDate: endD });
  }
  
  const sixMonthsAgo = sixMonthsData[0].startDate;

  // --- CALCOLO AREA CHART (Bilancio Netto ultimi 6 mesi chiusi) ---
  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    if (txDate >= sixMonthsAgo && txDate <= endOfPreviousMonth) {
      const sortKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      const targetMonth = sixMonthsData.find(m => m.sortKey === sortKey);
      if (targetMonth) {
        targetMonth.net += (tx.type === "income" ? tx.amount : -tx.amount) / 100;
      }
    }
  });

  // --- CALCOLI METRICHE SOGGETTE AI 6 MESI CHIUSI ---
  const sixMonthsTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= sixMonthsAgo && txDate <= endOfPreviousMonth;
  });

  const totalIncomeSixMonths = sixMonthsTransactions
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalExpenseSixMonths = sixMonthsTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + tx.amount, 0);

  const netSavingsSixMonths = totalIncomeSixMonths - totalExpenseSixMonths;
  const savingsRateSixMonths = totalIncomeSixMonths > 0 ? Math.max(0, Math.round((netSavingsSixMonths / totalIncomeSixMonths) * 100)) : 0;

  // --- CALCOLO RADAR CHART (Ultimi 6 mesi chiusi) ---
  const radarMap: Record<string, { amount: number; budgetGroup: string }> = {};
  
  sixMonthsTransactions.forEach((tx) => {
    if (tx.type === "expense") {
      const catObj = categories.find((c) => c.name === tx.category);
      const parentCat = catObj?.parentCategory || catObj?.name || "Varie";
      const budgetGroup = catObj?.budgetGroup === "Needs" ? "Needs" : "Wants";

      if (!radarMap[parentCat]) {
        radarMap[parentCat] = { amount: 0, budgetGroup };
      }
      radarMap[parentCat].amount += (tx.amount / 100);
    }
  });

  const radarData = Object.entries(radarMap)
    .sort((a, b) => b[1].amount - a[1].amount) 
    .slice(0, 7)
    .sort((a, b) => {
      if (a[1].budgetGroup === "Needs" && b[1].budgetGroup !== "Needs") return -1;
      if (a[1].budgetGroup !== "Needs" && b[1].budgetGroup === "Needs") return 1;
      return b[1].amount - a[1].amount; 
    })
    .map(([catName, data]) => ({
      category: tCat.has(catName) ? tCat(catName) : catName,
      amount: data.amount,
      budgetGroup: data.budgetGroup, 
    }));

  return (
    <div className="@container/main flex flex-col gap-8 py-6 px-2 sm:px-2 md:px-6 pb-24 min-h-[calc(100dvh-var(--header-height)-4rem)]">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <AddTransactionModal />
      </div>

      {/* KPI CARDS (Ultimi 6 mesi chiusi) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <div 
          onClick={() => router.push("/cash-flow")}
          className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{t("incomeMonth")}</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncomeSixMonths)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("incomeUpdated")}</p>
          </div>
        </div>

        <div 
          onClick={() => router.push("/trends")}
          className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{t("expenseMonth")}</h3>
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenseSixMonths)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("expenseTotal")}</p>
          </div>
        </div>

        <div 
          onClick={() => router.push("/wealth")}
          className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{t("netBalance")}</h3>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-bold ${netSavingsSixMonths >= 0 ? "text-foreground" : "text-destructive"}`}>
              {formatCurrency(netSavingsSixMonths)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("netDifference")}</p>
          </div>
        </div>

        <div 
          onClick={() => router.push("/wealth")}
          className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{t("savingsRate")}</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-foreground">{savingsRateSixMonths}%</div>
            <p className="text-xs text-muted-foreground mt-1">{t("savingsCapital")}</p>
          </div>
        </div>

      </div>

      {/* SEZIONE GRAFICI (Area Chart & Radar) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Radar Chart: Impronta di Spesa */}
        <div className="lg:col-span-2 p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{t("radarTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("radarSubtitle")}</p>
            </div>
            <Target className="h-5 w-5 text-muted-foreground opacity-50" />
          </div>
          
          <div className="flex-1 min-h-[280px] w-full flex flex-col items-center justify-center mt-4 pb-2">
            {radarData.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center">{t("noChartData")}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                  <PolarGrid strokeOpacity={0.2} />
                  
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={(props: any) => {
                      const { payload, x, y, textAnchor } = props;
                      const isNeed = radarData.find(d => d.category === payload.value)?.budgetGroup === "Needs";
                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor={textAnchor}
                          fill={isNeed ? "#ef4444" : "#f59e0b"}
                          className="text-[11px] font-bold"
                          dominantBaseline="central"
                        >
                          {payload.value}
                        </text>
                      );
                    }} 
                  />
                  
                  <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [`€${Number(value).toFixed(0)}`, t("amount")]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Radar name="Spese" dataKey="amount" stroke="#f97316" strokeWidth={2} fill="#f97316" fillOpacity={0.45} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
              {t("needsArea")}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
              {t("wantsArea")}
            </div>
          </div>
        </div>

        {/* Area Chart: Trend Bilancio Netto (Mesi) */}
        <div className="lg:col-span-3 p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg">{t("netTrendTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("netTrendSubtitle")}</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground opacity-50" />
          </div>
          
          <div className="flex-1 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sixMonthsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val}`} />
                <Tooltip 
                  formatter={(value: any) => [`€${Number(value).toFixed(2)}`, t("netBalance")]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                <Area 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorNet)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* QUICK LINKS DI NAVIGAZIONE */}
      <div>
        <h3 className="font-semibold text-lg mb-4">{t("quickLinksTitle")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          
          <Button 
            variant="outline" 
            className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => router.push("/cash-flow")}
          >
            <Layers className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold mt-2">{t("linkCashFlow")}</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => router.push("/trends")}
          >
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span className="font-semibold mt-2">{t("linkTrends")}</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => router.push("/category-stats")}
          >
            <PieChart className="h-5 w-5 text-purple-500" />
            <span className="font-semibold mt-2">{t("linkCategoryStats")}</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => router.push("/wealth")}
          >
            <PiggyBank className="h-5 w-5 text-amber-500" />
            <span className="font-semibold mt-2">{t("linkWealth")}</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => router.push("/transactions")}
          >
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold mt-2">{t("linkTransactions")}</span>
          </Button>

        </div>
      </div>

    </div>
  );
}