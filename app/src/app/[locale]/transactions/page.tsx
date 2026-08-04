"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/routing"; 
import { useTranslations, useLocale } from "next-intl"; 
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale"; 
import { ChevronLeft, ChevronRight, Loader2, FilterX, Pencil, Trash2, Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableCell, TableHead, TableHeader, TableRow, TableBody
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { AddTransactionModal } from "@/components/add-transaction-modal";

interface Transaction {
  _id: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
  category: string; 
  description: string;
  date: string;
  userId?: string; 
  userName?: string; 
}

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter(); 
  
  const t = useTranslations("Transactions"); 
  const tErrors = useTranslations("ApiErrors");
  const tCat = useTranslations("Categories");
  const locale = useLocale(); 
  const dateLocale = locale === 'it' ? it : enUS; 

  const currentUserId = (session?.user as any)?.id;
  const currentUserRole = (session?.user as any)?.role;
  const canManageOwnership = currentUserRole === "superuser" || currentUserRole === "admin";
  
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  const [skip, setSkip] = React.useState(0);
  const constLimit = 50;
  const [total, setTotal] = React.useState(0);

  const [typeFilter, setTypeFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const [transactionToDelete, setTransactionToDelete] = React.useState<string | null>(null);
  const [transactionToEdit, setTransactionToEdit] = React.useState<Transaction | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [editError, setEditError] = React.useState("");

  const [translatedDescriptions, setTranslatedDescriptions] = React.useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = React.useState<Record<string, boolean>>({});

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "EUR",
    }).format(amount / 100);
  };

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  React.useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/categories").then(r => r.json()).then(setCategories);
      fetch("/api/users").then(r => r.json()).then(setUsers);
    }
  }, [status]);

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ skip: skip.toString(), limit: constLimit.toString() });
      if (typeFilter) queryParams.append("type", typeFilter);
      if (categoryFilter) queryParams.append("category", categoryFilter);
      if (userFilter) queryParams.append("user", userFilter);
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      const res = await fetch(`/api/transactions?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTotal(data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, [skip, constLimit, typeFilter, categoryFilter, userFilter, startDate, endDate]);

  React.useEffect(() => {
    if (status === "authenticated") fetchTransactions();
  }, [status, fetchTransactions]);

  const resetFilters = () => {
    setTypeFilter(""); setCategoryFilter(""); setUserFilter(""); setStartDate(""); setEndDate(""); setSkip(0);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transactionToDelete}`, { method: "DELETE" });
      if (res.ok) {
        setTransactionToDelete(null);
        fetchTransactions(); 
      } else {
        const errorData = await res.json();
        alert(errorData.error ? tErrors(errorData.error) : "Errore durante l'eliminazione");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transactionToEdit) return;
    setActionLoading(true);
    setEditError(""); 

    const formData = new FormData(e.currentTarget);
    const amountFloat = parseFloat(formData.get("amount") as string);
    
    const payload: any = {
      amount: Math.round(amountFloat * 100), 
      currency: transactionToEdit.currency || "EUR",
      type: transactionToEdit.type,
      category: formData.get("category"),
      description: formData.get("description"),
      date: formData.get("date"),
    };

    if (canManageOwnership) {
      payload.newUserId = formData.get("newUserId");
    }

    try {
      const res = await fetch(`/api/transactions/${transactionToEdit._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTransactionToEdit(null);
        fetchTransactions(); 
      } else {
        const errorData = await res.json();
        const apiError = errorData.error;
        
        if (apiError && tErrors.has(apiError)) {
          setEditError(tErrors(apiError));
        } else {
          setEditError(apiError || t("editModal.defaultError"));
        }
      }
    } catch (err) {
      console.error("Errore di rete durante la modifica:", err);
      setEditError(t("editModal.networkError"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTranslateDescription = async (txId: string, text: string) => {
    setIsTranslating((prev) => ({ ...prev, [txId]: true }));
    
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLanguage: locale }),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data.sameLanguage) {
          return;
        }

        if (data.translatedText) {
          const decodedText = data.translatedText
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"');

          setTranslatedDescriptions((prev) => ({ ...prev, [txId]: decodedText }));
        }
      } else {
        console.error("Errore traduzione");
      }
    } catch (err) {
      console.error("Errore di rete durante la traduzione", err);
    } finally {
      setIsTranslating((prev) => ({ ...prev, [txId]: false }));
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredCategories = typeFilter ? categories.filter(c => c.type === typeFilter) : categories;

  return (
    <div className="@container/main flex flex-col gap-6 py-4 px-1 sm:px-3 md:px-6 pb-24 min-h-[calc(100dvh-var(--header-height)-4rem)]">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6 p-4 rounded-md border bg-card text-card-foreground shadow-sm items-end">
        <div className="space-y-1">
          <Label>{t("filters.user")}</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setSkip(0); }}>
            <option value="">{t("filters.allUsers")}</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("filters.type")}</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCategoryFilter(""); setSkip(0); }}>
            <option value="">{t("filters.allTypes")}</option>
            <option value="expense">{t("filters.expense")}</option>
            <option value="income">{t("filters.income")}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("filters.category")}</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setSkip(0); }} disabled={filteredCategories.length === 0}>
            <option value="">{t("filters.allCategories")}</option>
            {filteredCategories.map(c => (
              <option key={c._id} value={c.name}>
                {tCat.has(c.name) ? tCat(c.name) : c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>{t("filters.fromDate")}</Label>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setSkip(0); }} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label>{t("filters.toDate")}</Label>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setSkip(0); }} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label className="opacity-0 hidden md:block">Reset</Label>
          <Button variant="outline" className="h-10 w-full" onClick={resetFilters}>
            <FilterX className="h-4 w-4 mr-2" /> {t("filters.reset")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm relative overflow-x-auto">
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.date")}</TableHead>
              <TableHead>{t("table.user")}</TableHead>
              <TableHead>{t("table.category")}</TableHead>
              <TableHead>{t("table.description")}</TableHead>
              <TableHead className="text-right">{t("table.amount")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 && !loading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{t("table.noTransactions")}</TableCell></TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx._id}>
                  <TableCell className="font-medium whitespace-nowrap">{format(new Date(tx.date), "dd MMM yyyy", { locale: dateLocale })}</TableCell>
                  <TableCell className="whitespace-nowrap">{tx.userName}</TableCell>
                  <TableCell>
                    {(() => {
                      const currentCat = categories.find(c => c.name === tx.category);
                      const catColor = currentCat?.color || "#64748b"; 

                      return (
                        <span 
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                          style={{
                            backgroundColor: `${catColor}15`, 
                            color: catColor,             
                            borderColor: `${catColor}30`,    
                          }}
                        >
                          {tCat.has(tx.category) ? tCat(tx.category) : tx.category}
                        </span>
                      );
                    })()}
                  </TableCell>
                  
                  <TableCell className="max-w-[200px] group">
                    {tx.description ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate" title={tx.description}>{tx.description}</span>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => handleTranslateDescription(tx._id, tx.description)}
                            disabled={isTranslating[tx._id]}
                            title={t("table.translate", { default: "Traduci" })}
                          >
                            {isTranslating[tx._id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                        
                        {translatedDescriptions[tx._id] && (
                          <span className="text-xs text-muted-foreground italic whitespace-normal border-l-2 border-primary/30 pl-2">
                            {translatedDescriptions[tx._id]}
                          </span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  <TableCell className={`text-right font-bold whitespace-nowrap ${tx.type === "expense" ? "text-destructive" : "text-emerald-500"}`}>
                    {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount, tx.currency)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {(canManageOwnership || tx.userId === currentUserId) && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setTransactionToEdit(tx); setEditError(""); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                          onClick={() => setTransactionToDelete(tx._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="text-sm text-muted-foreground text-center sm:text-left">
          {t("pagination.showing", {
            start: Math.min(skip + 1, total),
            end: Math.min(skip + constLimit, total),
            total: total
          })}
        </div>
        <div className="flex w-full sm:w-auto space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none"
            onClick={() => setSkip(Math.max(skip - constLimit, 0))} 
            disabled={skip === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> {t("pagination.previous")}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none"
            onClick={() => setSkip(skip + constLimit)} 
            disabled={skip + constLimit >= total || loading}
          >
            {t("pagination.next")} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <AddTransactionModal />

      <Dialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("deleteModal.title")}</DialogTitle></DialogHeader>
          <DialogDescription>{t("deleteModal.description")}</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionToDelete(null)}>{t("deleteModal.cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t("deleteModal.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transactionToEdit} onOpenChange={(open) => { if(!open) { setTransactionToEdit(null); setEditError(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("editModal.title")}</DialogTitle></DialogHeader>
          {transactionToEdit && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              
              {canManageOwnership && (
                <div className="space-y-2">
                  <Label>{t("filters.user", { default: "Utente / Proprietario" })}</Label>
                  <select name="newUserId" defaultValue={transactionToEdit.userId} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("editModal.amount")}</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={(transactionToEdit.amount / 100).toFixed(2)} />
              </div>
              <div className="space-y-2">
                <Label>{t("editModal.category")}</Label>
                <select name="category" required defaultValue={transactionToEdit.category} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {categories.filter(c => c.type === transactionToEdit.type).map(cat => (
                    <option key={cat._id} value={cat.name}>
                      {tCat.has(cat.name) ? tCat(cat.name) : cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t("editModal.description")}</Label>
                <Input name="description" maxLength={255} defaultValue={transactionToEdit.description} />
              </div>
              <div className="space-y-2">
                <Label>{t("editModal.date")}</Label>
                <Input name="date" type="date" required defaultValue={new Date(transactionToEdit.date).toISOString().split("T")[0]} />
              </div>

              {editError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
                  {editError}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setTransactionToEdit(null); setEditError(""); }}>{t("editModal.cancel")}</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t("editModal.save")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}