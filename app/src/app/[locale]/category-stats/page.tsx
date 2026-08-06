"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableCell, TableHead, TableHeader, TableRow, TableBody } from "@/components/ui/table";
import { Loader2, TrendingUp, TrendingDown, BarChart2, Activity, PieChart, Wallet } from "lucide-react";
// Aggiunto subDays per calcolare esattamente l'ultimo giorno del mese precedente
import { startOfMonth, startOfYear, subMonths, subDays, format } from "date-fns";

type Granularity = "budgetGroup" | "parentCategory" | "name";
type PeriodShortcut = "currentMonth" | "currentYear" | "last6Months" | "all" | "custom";

interface StatRow {
  key: string;
  group: string;
  totalAmount: number;
  percentage: number;
  monthlyAverage: number;
  stdDev: number;
  volatility: number;
  count: number;
}

export default function CategoryStatsPage() {
  const t = useTranslations("CategoryStats");
  const tCat = useTranslations("Categories");

  const [loading, setLoading] = React.useState(true);
  const [granularity, setGranularity] = React.useState<Granularity>("parentCategory");
  
  const [period, setPeriod] = React.useState<PeriodShortcut>("last6Months");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const [expenseStats, setExpenseStats] = React.useState<StatRow[]>([]);
  const [incomeStats, setIncomeStats] = React.useState<StatRow[]>([]);
  
  const [totalExpenses, setTotalExpenses] = React.useState<number>(0);
  const [totalIncomes, setTotalIncomes] = React.useState<number>(0);
  const [dynamicColors, setDynamicColors] = React.useState<Record<string, string>>({});

  // Gestione date rapide modificata per escludere il mese corrente
  React.useEffect(() => {
    const today = new Date();
    // L'ultimo giorno del mese precedente (es. se siamo ad Agosto, prende il 31 Luglio)
    const lastDayOfPrevMonth = subDays(startOfMonth(today), 1);

    if (period === "currentMonth") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (period === "currentYear") {
      // Dal 1° Gennaio fino all'ultimo giorno del mese precedente
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
    async function processStats() {
      if (period === "custom" && (!startDate || !endDate)) return;
      if (!endDate) return;

      setLoading(true);
      try {
        const [catRes, txRes] = await Promise.all([
          fetch("/api/categories").then((r) => r.json()),
          fetch(`/api/transactions?limit=100000${startDate ? `&startDate=${startDate}` : ""}&endDate=${endDate}`).then((r) => r.json()),
        ]);

        const categories = catRes || [];
        const catInfo: Record<string, any> = {};
        const colors: Record<string, string> = {};

        categories.forEach((c: any) => {
          catInfo[c.name] = c;
          colors[c.name] = c.color || "#94a3b8";
          if (c.parentCategory && !colors[c.parentCategory]) {
            colors[c.parentCategory] = c.color || "#94a3b8";
          }
        });
        setDynamicColors(colors);

        const transactions = txRes.transactions || [];

        const expenseMap: Record<string, any> = {};
        const incomeMap: Record<string, any> = {};
        
        let grandTotalExpense = 0;
        let grandTotalIncome = 0;

        const activeMonthsSet = new Set<string>();

        transactions.forEach((tx: any) => {
          const amount = tx.amount / 100;
          const cat = catInfo[tx.category] || { budgetGroup: "Altro", parentCategory: "Varie" };
          const txDate = new Date(tx.date);
          const monthKey = format(txDate, "yyyy-MM");
          activeMonthsSet.add(monthKey);

          let key = "";
          let group = cat.budgetGroup || "Altro";

          if (granularity === "budgetGroup") {
            key = cat.budgetGroup || "Altro";
            group = key;
          } else if (granularity === "parentCategory") {
            key = cat.parentCategory || cat.name || "Varie";
            group = cat.budgetGroup || "Altro";
          } else {
            key = tx.category;
            group = cat.budgetGroup || "Altro";
          }

          if (tx.type === "expense") {
            grandTotalExpense += amount;
            if (!expenseMap[key]) expenseMap[key] = { total: 0, count: 0, group, monthlyTotals: {} };
            expenseMap[key].total += amount;
            expenseMap[key].count += 1;
            expenseMap[key].monthlyTotals[monthKey] = (expenseMap[key].monthlyTotals[monthKey] || 0) + amount;
          } else if (tx.type === "income") {
            grandTotalIncome += amount;
            if (!incomeMap[key]) incomeMap[key] = { total: 0, count: 0, group, monthlyTotals: {} };
            incomeMap[key].total += amount;
            incomeMap[key].count += 1;
            incomeMap[key].monthlyTotals[monthKey] = (incomeMap[key].monthlyTotals[monthKey] || 0) + amount;
          }
        });

        setTotalExpenses(grandTotalExpense);
        setTotalIncomes(grandTotalIncome);

        const totalMonthsCount = Math.max(1, activeMonthsSet.size);
        const allMonthsRange = Array.from(activeMonthsSet);

        // Funzione per generare le righe formattate
        const generateRows = (map: Record<string, any>, grandTotal: number) => {
          return Object.entries(map).map(([key, data]) => {
            const percentage = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;
            const monthlyAverage = data.total / totalMonthsCount;
            
            let varianceSum = 0;
            allMonthsRange.forEach((m) => {
              const spentInMonth = data.monthlyTotals[m] || 0;
              varianceSum += Math.pow(spentInMonth - monthlyAverage, 2);
            });

            const variance = varianceSum / totalMonthsCount;
            const stdDev = Math.sqrt(variance);
            const volatility = monthlyAverage > 0 ? stdDev / monthlyAverage : 0;

            return {
              key,
              group: data.group,
              totalAmount: data.total,
              percentage,
              monthlyAverage,
              stdDev,
              volatility,
              count: data.count,
            };
          }).sort((a, b) => b.totalAmount - a.totalAmount);
        };

        setExpenseStats(generateRows(expenseMap, grandTotalExpense));
        setIncomeStats(generateRows(incomeMap, grandTotalIncome));

      } catch (err) {
        console.error("Errore calcolo statistiche categorie:", err);
      } finally {
        setLoading(false);
      }
    }

    processStats();
  }, [startDate, endDate, period, granularity]);

  const translateKey = (key: string) => {
    if (tCat.has(key)) return tCat(key);
    if (key === "Needs") return "Necessità";
    if (key === "Wants") return "Extra";
    return key;
  };

  const topExpense = expenseStats.length > 0 ? expenseStats[0] : null;
  const topIncome = incomeStats.length > 0 ? incomeStats[0] : null;
  const mostVolatileExpense = [...expenseStats].filter(s => s.monthlyAverage > 20).sort((a, b) => b.volatility - a.volatility)[0];
  
  const avgMonthlyExpense = expenseStats.reduce((acc, curr) => acc + curr.monthlyAverage, 0);
  const avgMonthlyIncome = incomeStats.reduce((acc, curr) => acc + curr.monthlyAverage, 0);

  // Componente interno per renderizzare le tabelle
  const StatsTable = ({ data, isIncome }: { data: StatRow[], isIncome?: boolean }) => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.category")}</TableHead>
            <TableHead>{t("table.group")}</TableHead>
            <TableHead className="text-right">{t("table.totalSpent")}</TableHead>
            <TableHead className="text-right">{t("table.share")}</TableHead>
            <TableHead className="text-right">{t("table.monthlyAvg")}</TableHead>
            <TableHead className="text-right">{t("table.stdDev")}</TableHead>
            <TableHead className="text-right">{t("table.volatility")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const color = dynamicColors[row.key] || (isIncome ? "#10b981" : "#94a3b8");
            return (
              <TableRow key={row.key}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                    <span className="truncate">{translateKey(row.key)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    isIncome ? "bg-emerald-500/10 text-emerald-500" : 
                    row.group === "Needs" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {translateKey(row.group)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold">
                  €{row.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-semibold text-muted-foreground">
                  {row.percentage.toFixed(1)}%
                </TableCell>
                <TableCell className={`text-right font-medium ${isIncome ? "text-emerald-500" : ""}`}>
                  €{row.monthlyAverage.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  ±€{row.stdDev.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    isIncome ? 'bg-emerald-500/10 text-emerald-500' :
                    row.volatility > 0.6 ? 'bg-destructive/10 text-destructive' : row.volatility > 0.3 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {(row.volatility * 100).toFixed(0)}%
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-6 px-1 sm:px-3 md:px-6 min-h-[calc(100dvh-4rem)] pb-24">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* FILTRI */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end w-full md:w-auto">
          <div className="space-y-1.5 w-full md:w-auto">
            <Label>{t("filters.periodLabel")}</Label>
            <Select value={period} onValueChange={(val) => setPeriod(val as PeriodShortcut)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("filters.periodLabel")} />
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

        <div className="space-y-1.5 w-full md:w-[260px] mt-4 md:mt-0">
          <Label>{t("filters.granularityLabel")}</Label>
          <Select value={granularity} onValueChange={(val) => setGranularity(val as Granularity)}>
            <SelectTrigger className="w-full">
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

      {loading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* TABELLA ENTRATE */}
          <Card>
            <CardHeader>
              <CardTitle>Entrate</CardTitle>
              <CardDescription>Analisi dettagliata delle categorie di entrata nel periodo selezionato</CardDescription>
            </CardHeader>
            <CardContent>
              {incomeStats.length === 0 ? (
                <div className="min-h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                  {t("table.noData")}
                </div>
              ) : (
                <StatsTable data={incomeStats} isIncome={true} />
              )}
            </CardContent>
          </Card>

          {/* TABELLA USCITE */}
          <Card>
            <CardHeader>
              <CardTitle>Spese</CardTitle>
              <CardDescription>Analisi dettagliata delle categorie di spesa nel periodo selezionato</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseStats.length === 0 ? (
                <div className="min-h-[150px] flex items-center justify-center text-muted-foreground text-sm">
                  {t("table.noData")}
                </div>
              ) : (
                <StatsTable data={expenseStats} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* RIEPILOGO KPI RAPIDI (INSIGHTS in basso) */}
      {!loading && (expenseStats.length > 0 || incomeStats.length > 0) && (
        <div className="mt-6">
          <h2 className="text-xl font-bold tracking-tight mb-4 px-2 sm:px-0">Insight Generali</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            
            {/* Entrate Medie Mensili */}
            <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Entrate Medie Mensili</p>
                <p className="text-2xl font-bold mt-1 text-emerald-500">€{avgMonthlyIncome.toFixed(0)}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            {/* Spese Medie Mensili */}
            <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">{t("cards.avgMonthlyExpense")}</p>
                <p className="text-2xl font-bold mt-1 text-destructive">€{avgMonthlyExpense.toFixed(0)}</p>
              </div>
              <div className="p-2.5 bg-destructive/10 rounded-lg text-destructive">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>

            {/* Categoria di Spesa Principale */}
            <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">{t("cards.topCategory")}</p>
                <p className="text-xl font-bold mt-1 truncate max-w-[150px]" title={topExpense ? translateKey(topExpense.key) : "-"}>
                  {topExpense ? translateKey(topExpense.key) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">€{topExpense?.totalAmount.toFixed(0)} ({topExpense?.percentage.toFixed(1)}%)</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>

            {/* Categoria di Spesa Più Volatile */}
            <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">{t("cards.mostVolatile")}</p>
                <p className="text-xl font-bold mt-1 truncate max-w-[150px]" title={mostVolatileExpense ? translateKey(mostVolatileExpense.key) : "-"}>
                  {mostVolatileExpense ? translateKey(mostVolatileExpense.key) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Volatilità: {mostVolatileExpense ? (mostVolatileExpense.volatility * 100).toFixed(0) : "0"}%</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-500">
                <Activity className="h-5 w-5" />
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}