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
  Calendar, 
  PieChart as PieChartIcon, 
  Loader2 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  PieChart,
  Pie
} from "recharts";

import { Button } from "@/components/ui/button";
import { AddTransactionModal } from "@/components/add-transaction-modal";

interface Transaction {
  _id: string;
  amount: number;
  type: "income" | "expense";
  category: string; // Nome in inglese salvato nel DB
  date: string;
  currency: string;
}

interface Category {
  _id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  
  const t = useTranslations("Dashboard"); 
  const tCat = useTranslations("Categories"); // <-- Traduttore per le categorie
  const locale = useLocale(); 

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]); // <-- Stato per le categorie dal DB
  const [loading, setLoading] = React.useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(amount / 100);
  };

  // Caricamento transazioni e categorie dal database
  React.useEffect(() => {
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/transactions?skip=0&limit=500").then((res) => res.json()),
        fetch("/api/categories").then((res) => res.json())
      ])
        .then(([txData, catData]) => {
          if (txData && txData.transactions) {
            setTransactions(txData.transactions);
          }
          if (Array.isArray(catData)) {
            setCategories(catData);
          }
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

  // --- CALCOLI E STATISTICHE ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });

  const totalIncomeMonth = currentMonthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalExpenseMonth = currentMonthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + tx.amount, 0);

  const netSavingsMonth = totalIncomeMonth - totalExpenseMonth;
  const savingsRate = totalIncomeMonth > 0 ? Math.max(0, Math.round((netSavingsMonth / totalIncomeMonth) * 100)) : 0;

  // Dati per il grafico a barre mensile
  const monthlyDataMap: { [key: string]: { income: number; expense: number } } = {};
  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const key = `${date.toLocaleString(locale, { month: 'short' })} ${date.getFullYear()}`;
    if (!monthlyDataMap[key]) {
      monthlyDataMap[key] = { income: 0, expense: 0 };
    }
    if (tx.type === "income") monthlyDataMap[key].income += tx.amount / 100;
    if (tx.type === "expense") monthlyDataMap[key].expense += tx.amount / 100;
  });

  const barChartData = Object.keys(monthlyDataMap).slice(-6).map((month) => ({
    month,
    [t("income")]: monthlyDataMap[month].income,
    [t("expenses")]: monthlyDataMap[month].expense,
  }));

  // Dati per il grafico a torta con nome localizzato e colore estratto dal DB
  const categoryMap: { [key: string]: { amount: number; color: string } } = {};
  
  currentMonthTransactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      // Cerca la categoria nel database per estrarre il colore reale
      const categoryObj = categories.find((c) => c.name === tx.category);
      const color = categoryObj?.color || "#94a3b8"; // Fallback grigio se non trovata
      
      // Traduciamo il nome della categoria tramite tCat
      const localizedCategoryName = tCat.has(tx.category) ? tCat(tx.category) : tx.category;

      if (!categoryMap[localizedCategoryName]) {
        categoryMap[localizedCategoryName] = { amount: 0, color };
      }
      categoryMap[localizedCategoryName].amount += tx.amount / 100;
    });

  const pieChartData = Object.keys(categoryMap).map((name) => ({
    name,
    value: categoryMap[name].amount,
    color: categoryMap[name].color,
  }));

  return (
    <div className="@container/main flex flex-col gap-8 py-6 px-4 md:px-6 pb-24 min-h-[calc(100dvh-var(--header-height)-4rem)]">
      
      {/* HEADER & WELCOME */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t("incomeMonth")}</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncomeMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("incomeUpdated")}</p>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t("expenseMonth")}</span>
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenseMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("expenseTotal")}</p>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t("netBalance")}</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-bold ${netSavingsMonth >= 0 ? "text-foreground" : "text-destructive"}`}>
              {formatCurrency(netSavingsMonth)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("netDifference")}</p>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t("savingsRate")}</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-foreground">{savingsRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{t("savingsCapital")}</p>
          </div>
        </div>

      </div>

      {/* SEZIONE GRAFICI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Grafico a Barre */}
        <div className="lg:col-span-2 p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{t("trendTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("trendSubtitle")}</p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="h-[300px] w-full mt-4">
            {barChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                {t("noChartData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                  <Tooltip formatter={(value: any) => [`€${Number(value).toFixed(2)}`, '']} />
                  <Bar dataKey={t("income")} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t("expenses")} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Grafico a Torta con colori dinamici del DB */}
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{t("categoryTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("categorySubtitle")}</p>
            </div>
            <PieChartIcon className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="h-[240px] w-full flex items-center justify-center">
            {pieChartData.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center">
                {t("noCategoryData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`€${Number(value).toFixed(2)}`, t("amount")]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 justify-center max-h-24 overflow-y-auto">
            {pieChartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SEZIONE AZIONI RAPIDE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold">{t("analyzeTitle")}</h4>
            <p className="text-sm text-muted-foreground">{t("analyzeSubtitle")}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/transactions")} className="w-full sm:w-auto shrink-0">
            {t("historyButton")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-semibold">{t("annotationsTitle")}</h4>
            <p className="text-sm text-muted-foreground">{t("annotationsSubtitle")}</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/annotations")} className="w-full sm:w-auto shrink-0">
            {t("annotationsButton")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

      </div>

      <AddTransactionModal />
    </div>
  );
}