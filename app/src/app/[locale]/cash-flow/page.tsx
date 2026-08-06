"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
// Aggiunto subDays per il calcolo della fine del mese precedente
import { startOfMonth, startOfYear, subMonths, subDays, format } from "date-fns";

type Granularity = "budgetGroup" | "parentCategory" | "name";
type PeriodShortcut = "currentMonth" | "currentYear" | "last6Months" | "all" | "custom";

type BreakdownItem = { name: string; amount: number };
type Breakdown = {
  totalIncome: number;
  totalNeeds: number;
  totalWants: number;
  savings: number;
  incomeItems: BreakdownItem[];
  needsItems: BreakdownItem[];
  wantsItems: BreakdownItem[];
};

export default function CashFlowPage() {
  const t = useTranslations("CashFlow");
  const tCat = useTranslations("Categories");
  
  const [loading, setLoading] = React.useState(true);
  const [granularity, setGranularity] = React.useState<Granularity>("parentCategory");
  
  const [period, setPeriod] = React.useState<PeriodShortcut>("last6Months");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const [chartData, setChartData] = React.useState<any[]>([]);
  const [activeKeys, setActiveKeys] = React.useState<string[]>([]);
  const [breakdown, setBreakdown] = React.useState<Breakdown | null>(null);
  
  const [dynamicColors, setDynamicColors] = React.useState<Record<string, string>>({
    "Income": "#10b981", "Needs": "#ef4444", "Wants": "#f59e0b", "Savings": "#3b82f6"
  });

  // Gestione date rapide modificata per escludere il mese corrente
  React.useEffect(() => {
    const today = new Date();
    // L'ultimo giorno del mese precedente
    const lastDayOfPrevMonth = subDays(startOfMonth(today), 1);

    if (period === "currentMonth") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd")); 
    } else if (period === "currentYear") {
      // Dal 1° Gennaio all'ultimo giorno del mese precedente
      setStartDate(format(startOfYear(today), "yyyy-MM-dd"));
      setEndDate(format(lastDayOfPrevMonth, "yyyy-MM-dd")); 
    } else if (period === "last6Months") {
      // Dal 1° del mese di 6 mesi fa fino all'ultimo giorno del mese precedente
      const firstDayOf6MonthsAgo = startOfMonth(subMonths(today, 6));
      setStartDate(format(firstDayOf6MonthsAgo, "yyyy-MM-dd"));
      setEndDate(format(lastDayOfPrevMonth, "yyyy-MM-dd"));
    } else if (period === "all") {
      setStartDate(""); 
      setEndDate(format(today, "yyyy-MM-dd"));
    }
  }, [period]);

  React.useEffect(() => {
    async function fetchAndProcessData() {
      if (period === "custom" && (!startDate || !endDate)) return;
      if (!endDate) return;
      
      setLoading(true);
      try {
        const catRes = await fetch("/api/categories");
        const categories = await catRes.json();
        
        const catInfo: Record<string, any> = {};
        const newColors: Record<string, string> = {
          "Income": "#10b981", "Needs": "#ef4444", "Wants": "#f59e0b", "Savings": "#3b82f6"
        };

        categories.forEach((c: any) => {
          catInfo[c.name] = c;
          newColors[c.name] = c.color;
          if (c.parentCategory && !newColors[c.parentCategory]) {
             newColors[c.parentCategory] = c.color; 
          }
        });
        setDynamicColors(newColors);

        const params = new URLSearchParams({ limit: "10000" });
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const txRes = await fetch(`/api/transactions?${params.toString()}`);
        const txData = await txRes.json();
        const transactions = txData.transactions || [];

        let totalIncome = 0;
        let totalNeeds = 0;
        let totalWants = 0;

        const incomeGroups: Record<string, number> = {};
        const needsGroups: Record<string, number> = {};
        const wantsGroups: Record<string, number> = {};

        transactions.forEach((tx: any) => {
          const amount = tx.amount / 100;
          const cat = catInfo[tx.category] || { budgetGroup: "Altro", parentCategory: "Varie" };
          
          let groupingKey = "";
          if (granularity === "budgetGroup") {
            groupingKey = tx.type === "income" ? "Income" : cat.budgetGroup;
          } else if (granularity === "parentCategory") {
            groupingKey = cat.parentCategory || "Varie";
          } else if (granularity === "name") {
            groupingKey = tx.category;
          }

          if (tx.type === "income") {
            totalIncome += amount;
            incomeGroups[groupingKey] = (incomeGroups[groupingKey] || 0) + amount;
          } else {
            if (cat.budgetGroup === "Needs") {
              totalNeeds += amount;
              needsGroups[groupingKey] = (needsGroups[groupingKey] || 0) + amount;
            } else {
              totalWants += amount;
              wantsGroups[groupingKey] = (wantsGroups[groupingKey] || 0) + amount;
            }
          }
        });

        const savings = totalIncome - totalNeeds - totalWants;
        const needsBase = totalIncome - totalNeeds;
        const wantsBase = needsBase - totalWants;

        let data: any[] = [];
        let keys: string[] = [];

        const labelIncome = t("breakdown.income");
        const labelNeeds = t("breakdown.needs");
        const labelWants = t("breakdown.wants");
        const labelSavings = t("breakdown.savings");

        if (granularity === "budgetGroup") {
          keys = ["Income", "Needs", "Wants", "Savings"];
          data = [
            { column: labelIncome, transparent: 0, "Income": totalIncome },
            { column: labelNeeds, transparent: needsBase > 0 ? needsBase : 0, "Needs": totalNeeds },
            { column: labelWants, transparent: wantsBase > 0 ? wantsBase : 0, "Wants": totalWants },
            { column: labelSavings, transparent: 0, "Savings": savings > 0 ? savings : 0 },
          ];
        } else {
          const allKeys = Array.from(new Set([
            ...Object.keys(incomeGroups),
            ...Object.keys(needsGroups),
            ...Object.keys(wantsGroups)
          ]));
          
          keys = [...allKeys, "Savings"];
          
          data = [
            { column: labelIncome, transparent: 0, ...incomeGroups },
            { column: labelNeeds, transparent: needsBase > 0 ? needsBase : 0, ...needsGroups },
            { column: labelWants, transparent: wantsBase > 0 ? wantsBase : 0, ...wantsGroups },
            { column: labelSavings, transparent: 0, "Savings": savings > 0 ? savings : 0 },
          ];
        }

        setChartData(data);
        setActiveKeys(keys);

        const formatItems = (dict: Record<string, number>) => 
          Object.entries(dict)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        setBreakdown({
          totalIncome,
          totalNeeds,
          totalWants,
          savings,
          incomeItems: formatItems(incomeGroups),
          needsItems: formatItems(needsGroups),
          wantsItems: formatItems(wantsGroups),
        });

      } catch (err) {
        console.error("Errore elaborazione waterfall:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndProcessData();
  }, [startDate, endDate, period, granularity, t]);

  const translateKey = (key: string) => {
    if (tCat.has(key)) return tCat(key);
    if (key === "Income") return t("breakdown.income");
    if (key === "Needs") return t("breakdown.needs");
    if (key === "Wants") return t("breakdown.wants");
    if (key === "Savings") return t("breakdown.savings");
    return key;
  };

  const renderBreakdownColumn = (
    title: string, 
    totalAmount: number, 
    items: BreakdownItem[], 
    baseline: number, 
    titleColor: string, 
    isSavings: boolean = false
  ) => {
    const totalPercentage = baseline > 0 ? ((totalAmount / baseline) * 100).toFixed(1) : "0.0";
    
    return (
      <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
            <p className={`text-xl font-bold mt-1 ${titleColor}`}>
              €{totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {title !== t("breakdown.income") && (
            <div className={`px-2 py-1 rounded-md text-xs font-bold ${totalAmount < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
              {totalPercentage}%
            </div>
          )}
        </div>

        {!isSavings ? (
          <div className="space-y-3 pt-1">
            {items.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t("breakdown.noData")}</span>
            ) : (
              items.map(item => {
                const itemPct = baseline > 0 ? ((item.amount / baseline) * 100).toFixed(1) : "0.0";
                const color = dynamicColors[item.name] || "#94a3b8";
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }}></span>
                        <span className="font-medium truncate">{translateKey(item.name)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground">€{item.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        <span className="font-semibold w-10 text-right">{itemPct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Number(itemPct), 100)}%`, backgroundColor: color }}></div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="pt-2 text-sm text-muted-foreground">
            {totalAmount >= 0 ? t("breakdown.savingsPositive") : t("breakdown.savingsNegative")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-1 sm:px-3 md:px-6 min-h-[calc(100dvh-4rem)] pb-24">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end w-full md:w-auto">
          <div className="space-y-1.5 w-full md:w-auto">
            <Label>{t("filters.periodLabel")}</Label>
            <Select value={period} onValueChange={(val) => setPeriod(val as PeriodShortcut)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("filters.selectPeriod")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currentMonth">{t("filters.currentMonth")}</SelectItem>
                <SelectItem value="currentYear">{t("filters.currentYear")}</SelectItem>
                <SelectItem value="last6Months">{t("filters.last6Months")}</SelectItem>
                <SelectItem value="all">{t("filters.allTime")}</SelectItem>
                <SelectItem value="custom">{t("filters.customPeriod")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {period === "custom" && (
            <>
              <div className="space-y-1.5 w-full md:w-auto">
                <Label>{t("filters.startDate")}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5 w-full md:w-auto">
                <Label>{t("filters.endDate")}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10" />
              </div>
            </>
          )}
        </div>

        <div className="space-y-1.5 w-full md:w-auto mt-4 md:mt-0">
          <Label>{t("filters.granularityLabel")}</Label>
          <Select value={granularity} onValueChange={(val) => setGranularity(val as Granularity)}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder={t("filters.granularityLabel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budgetGroup">{t("filters.macro")}</SelectItem>
              <SelectItem value="parentCategory">{t("filters.intermediate")}</SelectItem>
              <SelectItem value="name">{t("filters.detailed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>
            {period === "all" ? t("chart.titleAll") : period === "currentMonth" ? t("chart.titleMonthly") : period === "currentYear" ? t("chart.titleYearly") : t("chart.titleDefault")}
          </CardTitle>
          <CardDescription>{t("chart.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-8">
          {loading ? (
            <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                    <XAxis dataKey="column" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `€${val}`} axisLine={false} tickLine={false} />
                    
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      formatter={(value: number, name: string) => {
                        if (name === "transparent") return [null, null];
                        return [`€${value.toFixed(2)}`, translateKey(name)];
                      }}
                      labelStyle={{ color: 'black', fontWeight: 'bold', marginBottom: '8px' }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    
                    <Bar dataKey="transparent" stackId="a" fill="transparent" />
                    
                    {activeKeys.map((key) => (
                      <Bar 
                        key={key} 
                        dataKey={key} 
                        stackId="a" 
                        fill={dynamicColors[key] || "#94a3b8"} 
                        radius={[2, 2, 2, 2]}
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth={1}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {breakdown && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 border-t pt-8">
                  {renderBreakdownColumn(t("breakdown.income"), breakdown.totalIncome, breakdown.incomeItems, breakdown.totalIncome, "text-emerald-500")}
                  {renderBreakdownColumn(t("breakdown.needs"), breakdown.totalNeeds, breakdown.needsItems, breakdown.totalIncome, "text-foreground")}
                  {renderBreakdownColumn(t("breakdown.wants"), breakdown.totalWants, breakdown.wantsItems, breakdown.totalIncome, "text-foreground")}
                  {renderBreakdownColumn(t("breakdown.savings"), breakdown.savings, [], breakdown.totalIncome, breakdown.savings >= 0 ? "text-blue-500" : "text-destructive", true)}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}