"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Plus, Target, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Goal = {
  _id?: string;
  type: "savings" | "spending";
  name?: string;
  amount: number;
  categories?: string[];
};

// Struttura gerarchica delle categorie di spesa (escluse le entrate)
const EXPENSE_CATEGORIES = {
  Needs: {
    "Housing & Utilities": ["Rent & Mortgage", "Utilities", "Maintenance & Furniture"],
    "Car & Transport": ["Fuel", "Insurance & Taxes", "Car Maintenance", "Public Transport & Parking", "Car Purchase"],
    "Daily Life": ["Groceries", "Basic Clothing", "Medical Expenses", "Personal Care"],
    "Taxes & Other": ["Taxes", "Fines", "General Insurance", "Other Needs"],
  },
  Wants: {
    "Free Time": ["Restaurants & Bars", "Entertainment & Games", "Subscriptions", "Concerts & Festivals", "Hobbies & Music", "Sports"],
    "Lifestyle": ["Travel & Holidays", "Gifts", "Culture", "Other Wants"],
  }
};

export default function ObjectivesPage() {
  const t = useTranslations("Objectives");
  const tCat = useTranslations("Categories");
  const locale = useLocale();
  const dateLocale = locale === "it" ? it : enUS;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [savingsGoal, setSavingsGoal] = useState<Goal | null>(null);
  const [spendingGoals, setSpendingGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Modali State
  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const [newSavingsAmount, setNewSavingsAmount] = useState<number>(0);

  const [isAddingSpending, setIsAddingSpending] = useState(false);
  const [newSpendingName, setNewSpendingName] = useState("");
  const [newSpendingAmount, setNewSpendingAmount] = useState<number>(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate]);

  const fetchData = async (date: Date) => {
    setLoading(true);
    try {
      // 1. Fetch Obiettivi
      const objRes = await fetch("/api/objectives");
      const objData = await objRes.json();
      
      setSavingsGoal(objData.savingsGoal);
      const fetchedSpendingGoals = objData.spendingGoals || [];

      // 2. Traduzione automatica dei nomi degli obiettivi di spesa
      const translatedSpendingGoals = await Promise.all(
        fetchedSpendingGoals.map(async (goal: Goal) => {
          if (!goal.name) return goal;
          
          try {
            const transRes = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                text: goal.name, 
                targetLanguage: locale 
              }),
            });
            
            const transData = await transRes.json();
            
            if (transData.translatedText) {
              return { ...goal, name: transData.translatedText };
            } else if (transData.error) {
              console.warn(`Errore API traduzione per "${goal.name}":`, transData.error);
            }
          } catch (error) {
            console.error(`Errore di rete durante la traduzione di "${goal.name}":`, error);
          }
          
          return goal; // Fallback al nome originale
        })
      );

      setSpendingGoals(translatedSpendingGoals);

      // 3. Fetch Transazioni
      const start = format(startOfMonth(date), "yyyy-MM-dd");
      const end = format(endOfMonth(date), "yyyy-MM-dd");
      const txRes = await fetch(`/api/transactions?startDate=${start}&endDate=${end}&limit=5000`);
      const txData = await txRes.json();
      setTransactions(txData.transactions || []);

    } catch (error) {
      console.error("Errore nel caricamento dei dati", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetSavingsGoal = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setSavings", amount: newSavingsAmount * 100 }) 
      });
      setIsEditingSavings(false);
      fetchData(currentDate);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSpendingGoal = async () => {
    if (!newSpendingName || newSpendingAmount <= 0 || selectedCategories.length === 0) return;
    
    setIsSaving(true);
    try {
      await fetch("/api/objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "addSpending", 
          name: newSpendingName,
          amount: newSpendingAmount * 100,
          categories: selectedCategories
        }) 
      });
      setIsAddingSpending(false);
      setNewSpendingName("");
      setNewSpendingAmount(0);
      setSelectedCategories([]);
      fetchData(currentDate);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await fetch(`/api/objectives?id=${id}`, { method: "DELETE" });
      fetchData(currentDate);
    } catch (error) {
      console.error(error);
    }
  };

  // --- Logica Selezione Categorie ---
  const toggleCategory = (cat: string, checked: boolean) => {
    setSelectedCategories(prev => 
      checked ? [...prev, cat] : prev.filter(c => c !== cat)
    );
  };

  const toggleMacroGroup = (children: string[], checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => Array.from(new Set([...prev, ...children])));
    } else {
      setSelectedCategories(prev => prev.filter(c => !children.includes(c)));
    }
  };

  const isCategorySelected = (cat: string) => selectedCategories.includes(cat);
  
  const isMacroSelected = (children: string[]) => {
    return children.length > 0 && children.every(c => selectedCategories.includes(c));
  };
  
  const isMacroIndeterminate = (children: string[]) => {
    const selectedCount = children.filter(c => selectedCategories.includes(c)).length;
    return selectedCount > 0 && selectedCount < children.length;
  };

  // --- Calcoli del Mese Corrente ---
  const totalIncome = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
  const netSavingsCents = totalIncome - totalExpense;
  
  const savingsProgressPercent = savingsGoal 
    ? Math.max(0, Math.min(100, (netSavingsCents / savingsGoal.amount) * 100))
    : 0;

  const getSpendingProgress = (goal: Goal) => {
    const spentCents = transactions
      .filter(t => t.type === "expense" && goal.categories?.includes(t.category))
      .reduce((acc, t) => acc + t.amount, 0);
    const percent = Math.max(0, Math.min(100, (spentCents / goal.amount) * 100));
    return { spentCents, percent };
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-4 md:px-6 min-h-[calc(100dvh-4rem)]">
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold w-32 text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: dateLocale })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          
          {/* SEZIONE 1: Obiettivo di Risparmio Mensile */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> {t("savings.title")}
              </h2>
              {!savingsGoal && !isEditingSavings && (
                <Button size="sm" onClick={() => setIsEditingSavings(true)}>
                  <Plus className="w-4 h-4 mr-2" /> {t("savings.setGoal")}
                </Button>
              )}
            </div>

            {isEditingSavings ? (
              <Card className="bg-muted/30">
                <CardContent className="pt-6 flex flex-col md:flex-row items-end gap-4">
                  <div className="space-y-2 flex-1 w-full">
                    <Label>{t("savings.inputLabel")}</Label>
                    <Input 
                      type="number" 
                      value={newSavingsAmount || ""} 
                      onChange={(e) => setNewSavingsAmount(Number(e.target.value))} 
                    />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setIsEditingSavings(false)} disabled={isSaving}>
                      {t("savings.cancel")}
                    </Button>
                    <Button className="flex-1 md:flex-none" onClick={handleSetSavingsGoal} disabled={isSaving}>
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t("savings.save")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : savingsGoal ? (
              <Card>
                <CardContent className="pt-6 flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t("savings.currentNet")}</p>
                      <p className="text-3xl font-bold">
                        €{(netSavingsCents / 100).toFixed(2)} <span className="text-base font-normal text-muted-foreground">/ €{(savingsGoal.amount / 100).toFixed(2)}</span>
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setNewSavingsAmount(savingsGoal.amount / 100);
                      setIsEditingSavings(true);
                    }}>
                      {t("savings.edit")}
                    </Button>
                  </div>
                  <Progress value={savingsProgressPercent} className="h-3" />
                  {netSavingsCents >= savingsGoal.amount && (
                    <p className="text-sm text-emerald-500 font-medium">{t("savings.goalReached")}</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                {t("savings.emptyState")}
              </div>
            )}
          </section>

          {/* SEZIONE 2: Obiettivi di Spesa */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-destructive" /> {t("spending.title")}
              </h2>
              <Button size="sm" onClick={() => setIsAddingSpending(true)}>
                <Plus className="w-4 h-4 mr-2" /> {t("spending.newLimit")}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {spendingGoals.length === 0 ? (
                <div className="col-span-1 md:col-span-2 p-6 border border-dashed rounded-xl text-center text-muted-foreground">
                  {t("spending.emptyState")}
                </div>
              ) : (
                spendingGoals.map((goal) => {
                  const { spentCents, percent } = getSpendingProgress(goal);
                  const isOverBudget = spentCents > goal.amount;

                  // Traduzione visuale per mostrare un riepilogo
                  const translatedCats = goal.categories?.map(c => tCat(c)).join(", ") || "";

                  return (
                    <Card key={goal._id}>
                      <CardHeader className="pb-2">
                        {/* Aggiunto gap-2, flex-1 e min-w-0 per risolvere l'overflow */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate" title={goal.name}>
                              {goal.name}
                            </CardTitle>
                            {/* line-clamp-2 permette fino a due linee di testo prima di mostrare "..." */}
                            <CardDescription className="text-xs line-clamp-2 mt-1" title={translatedCats}>
                              {translatedCats}
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDeleteGoal(goal._id!)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-2">
                          <span className={`text-xl font-bold ${isOverBudget ? 'text-destructive' : ''}`}>
                            €{(spentCents / 100).toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground"> / €{(goal.amount / 100).toFixed(2)}</span>
                        </div>
                        <Progress value={percent} indicatorColor={isOverBudget ? "bg-destructive" : "bg-primary"} className="h-2" />
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </section>

        </div>
      )}

      {/* Modale Creazione Limite di Spesa */}
      <Dialog open={isAddingSpending} onOpenChange={setIsAddingSpending}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{t("spending.newLimit")}</DialogTitle>
            <DialogDescription>
              {t("spending.modalDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("spending.goalNameLabel")}</Label>
                <Input 
                  placeholder={t("spending.goalNamePlaceholder")} 
                  value={newSpendingName}
                  onChange={e => setNewSpendingName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("spending.amountLabel")}</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={newSpendingAmount || ""}
                  onChange={e => setNewSpendingAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <Label>{t("spending.categoriesLabel")}</Label>
              <div className="bg-muted/30 border rounded-lg p-4 flex flex-col gap-4 text-sm">
                
                {Object.entries(EXPENSE_CATEGORIES).map(([groupKey, macros]) => (
                  <div key={groupKey} className="flex flex-col gap-2">
                    <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">
                      {groupKey === "Needs" ? tCat("Needs") : tCat("Wants")}
                    </h4>
                    <div className="pl-2 border-l-2 flex flex-col gap-3">
                      
                      {Object.entries(macros).map(([macroKey, details]) => {
                        const checked = isMacroSelected(details);
                        const indeterminate = isMacroIndeterminate(details);

                        return (
                          <div key={macroKey} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id={`macro-${macroKey}`}
                                checked={checked ? true : indeterminate ? "indeterminate" : false}
                                onCheckedChange={(val) => toggleMacroGroup(details, !!val)}
                              />
                              <Label htmlFor={`macro-${macroKey}`} className="font-medium cursor-pointer">
                                {tCat(macroKey)}
                              </Label>
                            </div>
                            
                            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {details.map(detailKey => (
                                <div key={detailKey} className="flex items-center gap-2">
                                  <Checkbox 
                                    id={`detail-${detailKey}`}
                                    checked={isCategorySelected(detailKey)}
                                    onCheckedChange={(val) => toggleCategory(detailKey, !!val)}
                                  />
                                  <Label htmlFor={`detail-${detailKey}`} className="font-normal text-muted-foreground cursor-pointer">
                                    {tCat(detailKey)}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsAddingSpending(false)} disabled={isSaving}>
              {t("savings.cancel")}
            </Button>
            <Button onClick={handleAddSpendingGoal} disabled={isSaving || !newSpendingName || newSpendingAmount <= 0 || selectedCategories.length === 0}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("savings.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}