"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { 
  startOfMonth, endOfMonth, startOfYear, subMonths,
  format, differenceInDays, addDays, addMonths 
} from "date-fns";
import { it, enUS } from "date-fns/locale";

type PeriodShortcut = "currentMonth" | "currentYear" | "last6Months" | "all" | "custom";

export default function WealthPage() {
  const t = useTranslations("Wealth");
  const locale = useLocale();
  const dateLocale = locale === 'it' ? it : enUS;
  
  const [loading, setLoading] = React.useState(true);
  
  const [period, setPeriod] = React.useState<PeriodShortcut>("last6Months");
  const [displayStartDate, setDisplayStartDate] = React.useState<string>("");
  const [displayEndDate, setDisplayEndDate] = React.useState<string>("");
  
  const [chartData, setChartData] = React.useState<any[]>([]);
  
  const [totalWealth, setTotalWealth] = React.useState<number>(0);
  const [periodVariation, setPeriodVariation] = React.useState<number>(0);

  React.useEffect(() => {
    const today = new Date();
    if (period === "currentMonth") {
      setDisplayStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setDisplayEndDate(format(endOfMonth(today), "yyyy-MM-dd")); 
    } else if (period === "currentYear") {
      setDisplayStartDate(format(startOfYear(today), "yyyy-MM-dd"));
      setDisplayEndDate(format(endOfMonth(today), "yyyy-MM-dd")); 
    } else if (period === "last6Months") {
      const sixMonthsAgo = subMonths(today, 6);
      setDisplayStartDate(format(sixMonthsAgo, "yyyy-MM-dd"));
      setDisplayEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
    } else if (period === "all") {
      setDisplayStartDate(""); 
      setDisplayEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
    }
  }, [period]);

  React.useEffect(() => {
    async function fetchAndProcessData() {
      if (period === "custom" && (!displayStartDate || !displayEndDate)) return;
      if (!displayEndDate) return;
      
      setLoading(true);
      try {
        const params = new URLSearchParams({ endDate: displayEndDate, limit: "100000" });
        const txRes = await fetch(`/api/transactions?${params.toString()}`);
        const txData = await txRes.json();
        
        const transactions = (txData.transactions || []).reverse();

        let absoluteTotalCents = 0;
        let initialWealthCents = 0;
        const displayedTransactions: any[] = [];

        const startLimit = displayStartDate ? new Date(`${displayStartDate}T00:00:00`) : null;
        const endLimit = new Date(`${displayEndDate}T23:59:59.999`);

        transactions.forEach((tx: any) => {
          const txDate = new Date(tx.date);
          const signedAmountCents = tx.type === "income" ? tx.amount : -tx.amount;

          if (txDate > endLimit) return; 

          absoluteTotalCents += signedAmountCents;

          if (startLimit && txDate < startLimit) {
            initialWealthCents += signedAmountCents;
          } else {
            displayedTransactions.push({ ...tx, signedAmountCents, txDate });
          }
        });

        const absoluteTotal = absoluteTotalCents / 100;
        const initialWealth = initialWealthCents / 100;

        setTotalWealth(absoluteTotal);
        setPeriodVariation((absoluteTotalCents - initialWealthCents) / 100);

        const validActualStart: Date = startLimit ?? (displayedTransactions.length > 0 ? displayedTransactions[0].txDate : new Date());
        const validEndLimit: Date = endLimit ?? new Date();

        const diffDays = differenceInDays(validEndLimit, validActualStart);
        const isDaily = diffDays <= 35; 

        const grouped: Record<string, { displayDate: string; netCents: number }> = {};
        
        let curr = new Date(validActualStart);
        if (isDaily) {
          while (curr <= validEndLimit) {
            const key = format(curr, "yyyy-MM-dd");
            grouped[key] = { displayDate: format(curr, "dd MMM", { locale: dateLocale }), netCents: 0 };
            curr = addDays(curr, 1);
          }
        } else {
          curr = startOfMonth(curr);
          const endMonth = endOfMonth(validEndLimit);
          while (curr <= endMonth) {
            const key = format(curr, "yyyy-MM");
            grouped[key] = { displayDate: format(curr, "MMM yyyy", { locale: dateLocale }), netCents: 0 };
            curr = addMonths(curr, 1);
          }
        }

        displayedTransactions.forEach((tx: any) => {
          const key = isDaily ? format(tx.txDate, "yyyy-MM-dd") : format(tx.txDate, "yyyy-MM");
          if (grouped[key]) {
            grouped[key].netCents += tx.signedAmountCents;
          }
        });

        let cumulativeCents = initialWealthCents;
        const sortedKeys = Object.keys(grouped).sort();
        
        const data = sortedKeys.map((key, index) => {
          cumulativeCents += grouped[key].netCents;
          
          if (index === sortedKeys.length - 1) {
            cumulativeCents = absoluteTotalCents;
          }

          return {
            timeKey: key,
            displayDate: grouped[key].displayDate,
            wealth: cumulativeCents / 100
          };
        });

        setChartData(data);
        
      } catch (err) {
        console.error("Errore elaborazione wealth:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAndProcessData();
  }, [displayStartDate, displayEndDate, period, dateLocale]);

  return (
    <div className="flex flex-col gap-6 py-6 px-1 sm:px-3 md:px-6 min-h-[calc(100dvh-4rem)] pb-24">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-xl border shadow-sm w-full">
        <div className="space-y-1.5 w-full md:w-auto">
          <Label>{t("filters.viewLabel")}</Label>
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
              <Input 
                type="date" 
                value={displayStartDate} 
                onChange={(e) => setDisplayStartDate(e.target.value)} 
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 w-full md:w-auto">
              <Label>{t("filters.endDate")}</Label>
              <Input 
                type="date" 
                value={displayEndDate} 
                onChange={(e) => setDisplayEndDate(e.target.value)} 
                className="h-10"
              />
            </div>
          </>
        )}
      </div>

      <Card className="flex-1 min-h-[500px] flex flex-col">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <CardTitle>{t("chart.title")}</CardTitle>
              <CardDescription>{t("chart.subtitle")}</CardDescription>
            </div>
            
            {!loading && (
              <div className="flex flex-col items-end gap-1 text-right shrink-0">
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">{t("stats.totalWealth")}</span>
                  <span className={`text-2xl font-bold ${totalWealth >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {totalWealth >= 0 ? '+' : ''}€{totalWealth.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="bg-muted px-2 py-1 rounded-md mt-1">
                  <span className="text-[11px] font-medium text-muted-foreground mr-2">{t("stats.periodVariation")}</span>
                  <span className={`text-xs font-bold ${periodVariation >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    {periodVariation >= 0 ? '+' : ''}€{periodVariation.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-6">
          {loading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {t("stats.noData")}
            </div>
          ) : (
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                  
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    minTickGap={30} 
                  />
                  
                  <YAxis 
                    tickFormatter={(val) => `€${val}`} 
                    axisLine={false} 
                    tickLine={false}
                    domain={['auto', 'auto']} 
                  />
                  
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toFixed(2)}`, t("chart.tooltip")]}
                    labelStyle={{ color: 'black', fontWeight: 'bold', marginBottom: '8px' }}
                    itemStyle={{ padding: '2px 0', color: '#10b981', fontWeight: '600' }}
                  />
                  
                  <Area 
                    type="monotone" 
                    dataKey="wealth" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorWealth)" 
                    activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}