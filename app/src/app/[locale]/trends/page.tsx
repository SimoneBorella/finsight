"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
  BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Brush 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it, enUS } from "date-fns/locale";

type TrendData = {
  timeKey: string;
  displayDate: string;
  income: number;
  expenses: number;
  needs: number;
  wants: number;
  savings: number;
  savingsRate: number;
};

export default function ExpenseTrendsPage() {
  const t = useTranslations("Trends");
  const locale = useLocale();
  const dateLocale = locale === 'it' ? it : enUS;
  
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"monthly" | "yearly">("monthly");
  
  const [monthlyData, setMonthlyData] = React.useState<TrendData[]>([]);
  const [yearlyData, setYearlyData] = React.useState<TrendData[]>([]);

  React.useEffect(() => {
    async function fetchAndProcessData() {
      setLoading(true);
      try {
        const catRes = await fetch("/api/categories");
        const categories = await catRes.json();
        const catInfo: Record<string, string> = {};
        categories.forEach((c: any) => {
          catInfo[c.name] = c.budgetGroup || "Altro";
        });

        const params = new URLSearchParams({ limit: "100000" });
        const txRes = await fetch(`/api/transactions?${params.toString()}`);
        const txData = await txRes.json();
        const transactions = txData.transactions || [];

        const monthlyGroups: Record<string, { inc: number; needs: number; wants: number }> = {};
        const yearlyGroups: Record<string, { inc: number; needs: number; wants: number }> = {};

        transactions.forEach((tx: any) => {
          const rawDate = new Date(tx.date);
          const monthKey = format(rawDate, "yyyy-MM");
          const yearKey = format(rawDate, "yyyy");
          const amountCents = tx.amount; 

          if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = { inc: 0, needs: 0, wants: 0 };
          if (!yearlyGroups[yearKey]) yearlyGroups[yearKey] = { inc: 0, needs: 0, wants: 0 };

          if (tx.type === "income") {
            monthlyGroups[monthKey].inc += amountCents;
            yearlyGroups[yearKey].inc += amountCents;
          } else {
            const group = catInfo[tx.category];
            if (group === "Needs") {
              monthlyGroups[monthKey].needs += amountCents;
              yearlyGroups[yearKey].needs += amountCents;
            } else {
              monthlyGroups[monthKey].wants += amountCents;
              yearlyGroups[yearKey].wants += amountCents;
            }
          }
        });

        const mapToTrendData = (groups: Record<string, any>, isMonthly: boolean): TrendData[] => {
          return Object.keys(groups).sort().map(key => {
            const data = groups[key];
            const income = data.inc / 100;
            const needs = data.needs / 100;
            const wants = data.wants / 100;
            const expenses = needs + wants;
            const savings = income - expenses; // Il Bilancio Netto
            const savingsRate = income > 0 ? (savings / income) * 100 : 0;

            const parsedDate = isMonthly ? parseISO(`${key}-01`) : parseISO(`${key}-01-01`);
            const displayDate = format(parsedDate, isMonthly ? "MMM yyyy" : "yyyy", { locale: dateLocale });

            return {
              timeKey: key, displayDate, income, expenses, needs, wants, savings, 
              savingsRate: Number(savingsRate.toFixed(1))
            };
          });
        };

        setMonthlyData(mapToTrendData(monthlyGroups, true));
        setYearlyData(mapToTrendData(yearlyGroups, false));

      } catch (err) {
        console.error("Errore elaborazione trends:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndProcessData();
  }, [dateLocale]);

  const currentData = activeTab === "monthly" ? monthlyData : yearlyData;
  const defaultStartIndex = Math.max(0, currentData.length - (activeTab === "monthly" ? 12 : 5));

  // Tooltip personalizzato per il Bilancio Netto
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
    // MODIFICATO: px-1 su mobile per sfruttare al massimo lo spazio laterale esattamente come le altre pagine
    <div className="flex flex-col gap-6 py-6 px-1 sm:px-3 md:px-6 min-h-[calc(100dvh-4rem)] pb-24">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex bg-muted/50 p-1 rounded-lg w-full max-w-sm border shadow-sm">
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

          {/* GRAFICO 1: ENTRATE VS USCITE */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("charts.incomeVsExpense")}</CardTitle>
              <CardDescription>Trascina la mini-mappa in basso per navigare nel tempo.</CardDescription>
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

          {/* GRAFICO 2: ANDAMENTO BILANCIO NETTO */}
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

          {/* GRAFICO 3: COMPOSIZIONE USCITE (100% Stacked Area) */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("charts.expenseComposition")}</CardTitle>
              <CardDescription>
                Ignora gli importi per mostrare la proporzione (percentuale) tra Necessità ed Extra.
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