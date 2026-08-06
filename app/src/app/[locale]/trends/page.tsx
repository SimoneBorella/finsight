"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Brush 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it, enUS } from "date-fns/locale";

type Granularity = "budgetGroup" | "parentCategory" | "name";

type TrendData = {
  timeKey: string;
  displayDate: string;
  income: number;
  expenses: number;
  needs: number;
  wants: number;
  savings: number;
  savingsRate: number;
  [categoryKey: string]: any; // Consente chiavi dinamiche per le categorie
};

export default function ExpenseTrendsPage() {
  const t = useTranslations("Trends");
  const tCat = useTranslations("Categories");
  const locale = useLocale();
  const dateLocale = locale === 'it' ? it : enUS;
  
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"monthly" | "yearly">("monthly");
  const [granularity, setGranularity] = React.useState<Granularity>("parentCategory");
  
  const [rawTransactions, setRawTransactions] = React.useState<any[]>([]);
  const [rawCategories, setRawCategories] = React.useState<any[]>([]);
  const [hiddenSeries, setHiddenSeries] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);
      try {
        const [catRes, txRes] = await Promise.all([
          fetch("/api/categories").then(res => res.json()),
          fetch("/api/transactions?limit=100000").then(res => res.json())
        ]);
        
        setRawCategories(catRes || []);
        setRawTransactions(txRes.transactions || []);
      } catch (err) {
        console.error("Errore recupero dati:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  const { monthlyData, yearlyData, seriesKeys, dynamicColors } = React.useMemo(() => {
    if (!rawTransactions.length || !rawCategories.length) {
      return { monthlyData: [], yearlyData: [], seriesKeys: [], dynamicColors: {} };
    }

    const catInfo: Record<string, any> = {};
    const colors: Record<string, string> = {
      "Needs": "#ef4444", "Wants": "#f59e0b", "Altro": "#94a3b8"
    };

    rawCategories.forEach((c: any) => {
      catInfo[c.name] = c;
      if (c.color) {
        colors[c.name] = c.color;
        if (c.parentCategory && !colors[c.parentCategory]) {
          colors[c.parentCategory] = c.color;
        }
      }
    });

    const monthlyGroups: Record<string, any> = {};
    const yearlyGroups: Record<string, any> = {};
    const seenCategories = new Set<string>();

    rawTransactions.forEach((tx: any) => {
      const rawDate = new Date(tx.date);
      const monthKey = format(rawDate, "yyyy-MM");
      const yearKey = format(rawDate, "yyyy");
      const amount = tx.amount / 100; 

      if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = { inc: 0, needs: 0, wants: 0 };
      if (!yearlyGroups[yearKey]) yearlyGroups[yearKey] = { inc: 0, needs: 0, wants: 0 };

      if (tx.type === "income") {
        monthlyGroups[monthKey].inc += amount;
        yearlyGroups[yearKey].inc += amount;
      } else {
        const cat = catInfo[tx.category] || { budgetGroup: "Altro", parentCategory: "Varie", name: tx.category };
        
        // Determina la chiave di raggruppamento per il grafico a linee in base alla granularità
        let groupKey = "";
        if (granularity === "budgetGroup") groupKey = cat.budgetGroup || "Altro";
        else if (granularity === "parentCategory") groupKey = cat.parentCategory || cat.name || "Varie";
        else groupKey = cat.name;

        seenCategories.add(groupKey);

        // Aggiorna totali specifici per la categoria
        monthlyGroups[monthKey][groupKey] = (monthlyGroups[monthKey][groupKey] || 0) + amount;
        yearlyGroups[yearKey][groupKey] = (yearlyGroups[yearKey][groupKey] || 0) + amount;

        // Aggiorna aggregati globali (Needs/Wants) per gli altri grafici
        if (cat.budgetGroup === "Needs") {
          monthlyGroups[monthKey].needs += amount;
          yearlyGroups[yearKey].needs += amount;
        } else {
          monthlyGroups[monthKey].wants += amount;
          yearlyGroups[yearKey].wants += amount;
        }
      }
    });

    const mapToTrendData = (groups: Record<string, any>, isMonthly: boolean): TrendData[] => {
      return Object.keys(groups).sort().map(key => {
        const data = groups[key];
        const income = data.inc;
        const needs = data.needs;
        const wants = data.wants;
        const expenses = needs + wants;
        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        const parsedDate = isMonthly ? parseISO(`${key}-01`) : parseISO(`${key}-01-01`);
        const displayDate = format(parsedDate, isMonthly ? "MMM yyyy" : "yyyy", { locale: dateLocale });

        // Crea l'oggetto base
        const rowData: any = {
          timeKey: key, displayDate, income, expenses, needs, wants, savings, 
          savingsRate: Number(savingsRate.toFixed(1))
        };

        // Aggiunge le chiavi di categoria (impostando a 0 se non ci sono spese in quel mese)
        seenCategories.forEach(cat => {
          rowData[cat] = data[cat] || 0;
        });

        return rowData as TrendData;
      });
    };

    return { 
      monthlyData: mapToTrendData(monthlyGroups, true), 
      yearlyData: mapToTrendData(yearlyGroups, false),
      seriesKeys: Array.from(seenCategories).sort(),
      dynamicColors: colors
    };
  }, [rawTransactions, rawCategories, granularity, dateLocale]);

  const currentData = activeTab === "monthly" ? monthlyData : yearlyData;
  const defaultStartIndex = Math.max(0, currentData.length - (activeTab === "monthly" ? 12 : 5));

  const translateKey = (key: string) => {
    if (tCat.has(key)) return tCat(key);
    if (key === "Needs") return t("labels.needs");
    if (key === "Wants") return t("labels.wants");
    if (key === "Altro" || key === "Varie") return tCat("Miscellaneous");
    return key;
  };

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  };

  // Legenda personalizzata interattiva per le Categorie
  const CustomInteractiveLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2 px-4">
        {payload.map((entry: any, index: number) => {
          const isHidden = hiddenSeries.has(entry.dataKey);
          return (
            <div 
              key={`item-${index}`} 
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity select-none px-2 py-1 hover:bg-muted rounded-md ${isHidden ? 'opacity-40 grayscale' : 'opacity-100'}`}
              onClick={() => toggleSeries(entry.dataKey)}
            >
              <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-medium">{translateKey(entry.value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const CustomNetBalanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TrendData;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-bold mb-2">{label}</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">{t("labels.savings")}:</span>
              <span className={`font-bold ${data.savings >= 0 ? "text-blue-500" : "text-destructive"}`}>
                €{data.savings.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">{t("labels.savingsRate")}:</span>
              <span className="font-bold">{data.savingsRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-1 sm:px-3 md:px-6 min-h-[calc(100dvh-4rem)] pb-24">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-muted/50 p-1 rounded-lg w-full sm:w-[300px] border shadow-sm">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "monthly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tabs.monthly")}
          </button>
          <button
            onClick={() => setActiveTab("yearly")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "yearly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("tabs.yearly")}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto px-2 sm:px-0">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">{t("filters.granularityLabel")}</Label>
          <Select value={granularity} onValueChange={(val) => setGranularity(val as Granularity)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t("filters.selectLevel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budgetGroup">{t("filters.macro")}</SelectItem>
              <SelectItem value="parentCategory">{t("filters.intermediate")}</SelectItem>
              <SelectItem value="name">{t("filters.detailed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : currentData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {t("labels.noData")}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          <div className="xl:col-span-2 px-2 sm:px-0">
            <h2 className="text-xl font-bold">
              {activeTab === "monthly" ? t("monthlyView.title") : t("yearlyView.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === "monthly" ? t("monthlyView.description") : t("yearlyView.description")}
            </p>
          </div>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("charts.categoryTrends")}</CardTitle>
              <CardDescription>{t("charts.categoryTrendsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `€${val}`} axisLine={false} tickLine={false} />
                    
                    <Tooltip 
                      formatter={(value: number, name: string) => [`€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, translateKey(name)]}
                      labelStyle={{ color: 'black', fontWeight: 'bold', marginBottom: '8px' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    
                    <Legend content={<CustomInteractiveLegend />} verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                    
                    {seriesKeys.map((key) => {
                      const isHidden = hiddenSeries.has(key);
                      return (
                        <Line
                          key={key}
                          name={key}
                          type="monotone"
                          dataKey={key}
                          stroke={dynamicColors[key] || "#94a3b8"}
                          strokeWidth={isHidden ? 0 : 3}
                          dot={false}
                          activeDot={!isHidden ? { r: 6, strokeWidth: 0 } : false}
                          hide={isHidden}
                        />
                      );
                    })}
                    <Brush dataKey="displayDate" height={30} stroke="#94a3b8" startIndex={defaultStartIndex} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* GRAFICO: ENTRATE VS USCITE */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("charts.incomeVsExpense")}</CardTitle>
              <CardDescription>{t("charts.incomeVsExpenseDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `€${val}`} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: number) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                    <Bar name={t("labels.income")} dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name={t("labels.expenses")} dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Brush dataKey="displayDate" height={30} stroke="#94a3b8" startIndex={defaultStartIndex} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* GRAFICO: BILANCIO NETTO */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("charts.netBalance")}</CardTitle>
              <CardDescription>{t("charts.netBalanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorNetTrends" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val}`} />
                    <Tooltip content={<CustomNetBalanceTooltip />} />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                    <Area 
                      name={t("labels.savings")}
                      type="monotone" 
                      dataKey="savings" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorNetTrends)" 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Brush dataKey="displayDate" height={30} stroke="#94a3b8" startIndex={defaultStartIndex} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* GRAFICO: COMPOSIZIONE USCITE (Needs vs Wants) */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("charts.expenseComposition")}</CardTitle>
              <CardDescription>
                {t("charts.expenseCompositionDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData} stackOffset="expand" margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                    <XAxis dataKey="displayDate" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => {
                        const payload = props.payload;
                        const total = (payload.needs || 0) + (payload.wants || 0);
                        const percent = total > 0 ? (value / total) * 100 : 0;
                        
                        return [
                          `${percent.toFixed(1)}% (€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })})`, 
                          name
                        ];
                      }}
                    />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                    <Area type="monotone" name={t("labels.needs")} dataKey="needs" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    <Area type="monotone" name={t("labels.wants")} dataKey="wants" stackId="1" stroke="#f59e0b" fill="#fbd38d" fillOpacity={0.8} />
                    <Brush dataKey="displayDate" height={30} stroke="#94a3b8" startIndex={defaultStartIndex} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}