"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FolderKanban, Users, UserPlus, Shield, Trash2, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableCell, TableHead, TableHeader, TableRow, TableBody
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: "superuser" | "admin" | "user";
}

const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={`pr-10 ${className || ""}`}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const tApi = useTranslations("ApiErrors");
  const tCat = useTranslations("Categories"); // <-- Aggiunto traduttore per le categorie
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const currentUserRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;

  const tabParam = searchParams.get("tab");
  let activeTab = "categories";
  if (tabParam === "password") activeTab = "password";
  if (tabParam === "users") activeTab = "users";
  
  const handleTabChange = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const [, setForceUpdate] = React.useState({});
  React.useEffect(() => {
    const handlePopState = () => setForceUpdate({});
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [categories, setCategories] = React.useState<any[]>([]);

  const [usersList, setUsersList] = React.useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [userError, setUserError] = React.useState("");
  const [userToDelete, setUserToDelete] = React.useState<UserItem | null>(null);

  const [passwordError, setPasswordError] = React.useState("");
  const [passwordSuccess, setPasswordSuccess] = React.useState("");
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Errore caricamento categorie:", err));
  }, []);

  const fetchUsers = React.useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/users?t=${new Date().getTime()}`, { 
        cache: "no-store" 
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUserError("");
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
    const firstName = (formData.get("firstName") as string).trim();
    const lastName = (formData.get("lastName") as string).trim();
    const email = formData.get("email") as string;
    const role = (formData.get("role") as string) || "user";
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setUserError(t("addUserModal.passwordMismatch"));
      setActionLoading(false);
      return;
    }

    const formattedFirstName = firstName.replace(/\s+/g, '').toLowerCase();
    const formattedLastName = lastName.replace(/\s+/g, '').toLowerCase();
    const generatedName = `${formattedFirstName}.${formattedLastName}`;

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: generatedName, email, password, role }),
      });

      if (res.ok) {
        setIsAddUserOpen(false);
        fetchUsers();
      } else {
        const errData = await res.json();
        setUserError(errData.error ? tApi(errData.error as any) : t("addUserModal.defaultError"));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      fetchUsers();
    } else {
      const errData = await res.json();
      alert(errData.error ? tApi(errData.error as any) : tApi("internalError"));
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${userToDelete._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUserToDelete(null);
        fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.error ? tApi(errData.error as any) : tApi("internalError"));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setPasswordSuccess(t("passwordModal.success"));
        form.reset();
      } else {
        const errData = await res.json();
        setPasswordError(errData.error ? tApi(errData.error as any) : t("passwordModal.defaultError"));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-col gap-6 py-6 px-4 md:px-6 min-h-[calc(100dvh-var(--header-height)-4rem)]">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col flex-1 gap-6 min-h-0">
        
        <div className="flex items-center border-b pb-3 overflow-x-auto whitespace-nowrap shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => handleTabChange("categories")} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "categories" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <FolderKanban className="h-4 w-4" />
              {t("tabs.categories")}
            </button>
            <button onClick={() => handleTabChange("password")} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "password" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <KeyRound className="h-4 w-4" />
              {t("tabs.password")}
            </button>
            <button onClick={() => handleTabChange("users")} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "users" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Users className="h-4 w-4" />
              {t("tabs.users")}
            </button>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex-1 flex flex-col min-h-0">
          
          {activeTab === "categories" && (
            <div className="flex-1 flex flex-col min-h-0 space-y-6">
              <div className="shrink-0">
                <h3 className="font-semibold text-lg">{t("categoriesManagement.title", { default: "Gestione Categorie" })}</h3>
                <p className="text-xs text-muted-foreground">{t("categoriesManagement.subtitle", { default: "Visualizza la struttura delle categorie." })}</p>
              </div>

              <div className="flex-1 min-h-0 overflow-auto border rounded-md p-6 space-y-8">
                {categories.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-muted-foreground text-sm">
                    {t("categoriesManagement.noCategories", { default: "Nessuna categoria trovata." })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {(["expense", "income"] as const).map((type) => {
                      const typeCategories = categories.filter(c => c.type === type);
                      if (typeCategories.length === 0) return null;

                      const groupedByBudget = typeCategories.reduce((acc: any, cat) => {
                        const group = cat.budgetGroup || "Altro";
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(cat);
                        return acc;
                      }, {});

                      return (
                        <div key={type} className="space-y-6">
                          <div className="border-b pb-3">
                            <h4 className="font-bold text-base tracking-wide uppercase text-foreground">
                              {type === "income" ? t("categoriesManagement.incomeType", { default: "Entrate" }) : t("categoriesManagement.expenseType", { default: "Uscite" })}
                            </h4>
                          </div>

                          <div className="space-y-6">
                            {Object.entries(groupedByBudget).map(([budgetGroup, cats]: [string, any]) => {
                              const groupKey = `budgetGroups.${budgetGroup.toLowerCase()}`;
                              const translatedGroup = t.has(groupKey as any) ? t(groupKey as any) : budgetGroup;

                              const groupedByParent = cats.reduce((acc: any, cat: any) => {
                                const parent = cat.parentCategory || "Generale";
                                if (!acc[parent]) acc[parent] = [];
                                acc[parent].push(cat);
                                return acc;
                              }, {});

                              return (
                                <div key={budgetGroup} className="space-y-4 rounded-xl border bg-muted/20 p-4 shadow-sm">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-xs font-bold tracking-wider text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-md">
                                      {translatedGroup}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {cats.length} {cats.length === 1 ? 'categoria' : 'categorie'}
                                    </span>
                                  </div>

                                  <div className="space-y-4 pt-1">
                                    {Object.entries(groupedByParent).map(([parentCat, subCats]: [string, any]) => {
                                      const representativeCat = subCats.find((c: any) => c.color);
                                      const groupColor = representativeCat?.color || "#64748b";
                                      const translatedParent = tCat.has(parentCat) ? tCat(parentCat) : parentCat;

                                      return (
                                        <div 
                                          key={parentCat} 
                                          className="rounded-lg border bg-card p-3 shadow-2xs space-y-2.5"
                                          style={{
                                            borderColor: `${groupColor}40`,
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span 
                                              className="text-xs font-bold px-2 py-0.5 rounded-md border"
                                              style={{
                                                backgroundColor: `${groupColor}15`,
                                                color: groupColor,
                                                borderColor: `${groupColor}40`,
                                              }}
                                            >
                                              {translatedParent}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                              {subCats.length} {subCats.length === 1 ? 'voce' : 'voci'}
                                            </span>
                                          </div>

                                          <div className="space-y-1.5 pl-2">
                                            {subCats.map((cat: any) => {
                                              const catColor = cat.color || groupColor;
                                              return (
                                                <div 
                                                  key={cat._id || cat.name}
                                                  className="flex items-center justify-between p-2 rounded-md bg-muted/40 transition-all hover:bg-muted/70"
                                                >
                                                  <div className="flex items-center gap-2.5">
                                                    <span 
                                                      className="h-2 w-2 rounded-full shrink-0" 
                                                      style={{ backgroundColor: catColor }}
                                                    />
                                                    <span className="text-xs font-medium text-foreground">
                                                      {tCat.has(cat.name) ? tCat(cat.name) : cat.name}
                                                    </span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-8">
              <div>
                <h3 className="font-semibold text-xl">{t("passwordModal.title")}</h3>
                <p className="text-sm text-muted-foreground mt-2">{t("passwordModal.description")}</p>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-3">
                  <Label>{t("passwordModal.currentPassword")}</Label>
                  <PasswordInput name="currentPassword" required />
                </div>
                <div className="space-y-3">
                  <Label>{t("passwordModal.newPassword")}</Label>
                  <PasswordInput name="newPassword" required />
                </div>
                {passwordError && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center border border-destructive/20">{passwordError}</div>}
                {passwordSuccess && <div className="p-3 text-sm text-emerald-600 bg-emerald-500/10 rounded-md text-center border border-emerald-500/20">{passwordSuccess}</div>}
                <div className="pt-4">
                  <Button type="submit" disabled={passwordLoading} className="w-full sm:w-auto">
                    {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t("passwordModal.submit")}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "users" && (
            <div className="flex-1 flex flex-col min-h-0 space-y-6"> 
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <h3 className="font-semibold text-lg">{t("usersManagement.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("usersManagement.subtitle")}</p>
                </div>
                {(currentUserRole === "superuser" || currentUserRole === "admin") && (
                  <Button onClick={() => { setUserError(""); setIsAddUserOpen(true); }}>
                    <UserPlus className="h-4 w-4 mr-2" /> {t("usersManagement.newUser")}
                  </Button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-auto border rounded-md">
                <div className="relative">
                  {loadingUsers && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow>
                        <TableHead>{t("usersManagement.nameCol")}</TableHead>
                        <TableHead>{t("usersManagement.emailCol")}</TableHead>
                        <TableHead>{t("usersManagement.roleCol")}</TableHead>
                        {currentUserRole === "superuser" && (
                          <TableHead className="text-right">{t("usersManagement.actionsCol")}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersList.length === 0 && !loadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={currentUserRole === "superuser" ? 4 : 3} className="h-24 text-center text-muted-foreground">
                            {t("usersManagement.noUsers")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersList.map((u) => (
                          <TableRow key={u._id} className="h-16">
                            <TableCell className="font-medium align-middle">{u.name}</TableCell>
                            <TableCell className="align-middle">{u.email}</TableCell>
                            <TableCell className="align-middle">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold 
                                ${u.role === 'superuser' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 
                                  u.role === 'admin' ? 'bg-destructive/10 text-destructive' : 
                                  'bg-secondary text-secondary-foreground'}`}>
                                {u.role === 'superuser' ? t("usersManagement.roleSuperuser", {default: "Superuser"}) :
                                u.role === 'admin' ? t("usersManagement.roleAdmin", {default: "Admin"}) :
                                t("usersManagement.roleUser", {default: "Utente"})}
                              </span>
                            </TableCell>
                            
                            {currentUserRole === "superuser" && (
                              <TableCell className="text-right align-middle space-x-1">
                                {u.role !== "superuser" && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => handleToggleAdmin(u._id, u.role)}
                                    >
                                      <Shield className="h-3.5 w-3.5 mr-1" />
                                      {u.role === "admin" ? t("usersManagement.removeAdmin") : t("usersManagement.makeAdmin")}
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setUserToDelete(u)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addUserModal.title")}</DialogTitle>
            <DialogDescription>{t("addUserModal.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("addUserModal.firstNameLabel")}</Label>
                <Input name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label>{t("addUserModal.lastNameLabel")}</Label>
                <Input name="lastName" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("addUserModal.emailLabel")}</Label>
                <Input name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>{t("addUserModal.roleLabel")}</Label>
                {currentUserRole === "superuser" ? (
                  <select 
                    name="role" 
                    required 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="user">{t("addUserModal.roleUser")}</option>
                    <option value="admin">{t("addUserModal.roleAdmin")}</option>
                  </select>
                ) : (
                  <>
                    <Input value={t("addUserModal.roleUser")} disabled />
                    <input type="hidden" name="role" value="user" />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("addUserModal.passwordLabel")}</Label>
                <PasswordInput name="password" required />
              </div>
              <div className="space-y-2">
                <Label>{t("addUserModal.confirmPasswordLabel")}</Label>
                <PasswordInput name="confirmPassword" required />
              </div>
            </div>

            {userError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
                {userError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>{t("addUserModal.cancel")}</Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t("addUserModal.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteUserModal.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteUserModal.description", { name: userToDelete?.name || "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>{t("deleteUserModal.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t("deleteUserModal.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}