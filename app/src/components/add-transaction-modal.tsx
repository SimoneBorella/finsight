"use client";

import * as React from "react";
import { Plus, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Category {
  _id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export function AddTransactionModal() {
  const { status } = useSession();
  const router = useRouter(); 
  const t = useTranslations("AddTransactionModal");
  const tErrors = useTranslations("ApiErrors");
  const tCat = useTranslations("Categories");
  
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(""); 
  const [type, setType] = React.useState<"expense" | "income">("expense");
  
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false);

  React.useEffect(() => {
    if (open && status === "authenticated") {
      setIsLoadingCategories(true);
      fetch("/api/categories")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCategories(data);
        })
        .catch((err) => console.error("Errore caricamento categorie:", err))
        .finally(() => setIsLoadingCategories(false));
    }
  }, [open, status]);

  if (status !== "authenticated") {
    return null;
  }

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setError(""); 
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const amountFloat = parseFloat(formData.get("amount") as string);

    const payload = {
      amount: Math.round(amountFloat * 100),
      currency: formData.get("currency") || "EUR",
      type,
      category: formData.get("category"),
      description: formData.get("description"),
      date: formData.get("date") || new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const errorData = await res.json();
        const apiError = errorData.error;
        
        if (apiError && tErrors.has(apiError)) {
          setError(tErrors(apiError));
        } else {
          setError(apiError || t("defaultError"));
        }
      }
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 p-0 sm:w-auto sm:pl-6 sm:pr-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 bg-primary text-primary-foreground hover:scale-105 active:scale-95 flex items-center justify-center gap-2 sm:gap-3"
          aria-label={t("newTransaction")}
        >
          <Plus className="h-6 w-6" />
          <span className="text-base font-medium hidden sm:inline pr-1">{t("newTransaction")}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* TOGGLE USCITA / ENTRATA */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={type === "expense" ? "default" : "ghost"}
              className="w-full"
              onClick={() => {
                setType("expense");
                setError(""); 
              }}
            >
              {t("expense")}
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "ghost"}
              className="w-full"
              onClick={() => {
                setType("income");
                setError(""); 
              }}
            >
              {t("income")}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="amount">{t("amount")}</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                className="text-lg font-semibold"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label htmlFor="currency">{t("currency")}</Label>
              <select
                id="currency"
                name="currency"
                defaultValue="EUR"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          {/* CATEGORIA */}
          <div className="space-y-2">
            <Label htmlFor="category">{t("category")}</Label>
            <select
              id="category"
              name="category"
              required
              disabled={isLoadingCategories || filteredCategories.length === 0}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingCategories ? (
                <option value="">{t("loadingCategories")}</option>
              ) : filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {tCat.has(cat.name) ? tCat(cat.name) : cat.name}
                  </option>
                ))
              ) : (
                <option value="">{t("noCategoriesFound")}</option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <Input
              id="description"
              name="description"
              placeholder=""
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{t("date")}</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading || isLoadingCategories}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("saveButton")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}