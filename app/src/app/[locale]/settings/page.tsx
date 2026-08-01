"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FolderKanban, Users, UserPlus, Shield, Trash2, KeyRound, Loader2 } from "lucide-react";

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
  role: "admin" | "user";
}

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const currentUserRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;

  const activeTab = searchParams.get("tab") === "users" ? "users" : "categories";

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

  // Stati per la gestione utenti (Admin)
  const [usersList, setUsersList] = React.useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [userError, setUserError] = React.useState("");

  // Stato Modale Cambio Password
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState("");
  const [passwordSuccess, setPasswordSuccess] = React.useState("");

  // Stato Modale Conferma Eliminazione Utente
  const [userToDelete, setUserToDelete] = React.useState<UserItem | null>(null);

  // Caricamento utenti se admin
  const fetchUsers = React.useCallback(async () => {
    if (currentUserRole !== "admin") return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUserRole]);

  React.useEffect(() => {
    if (activeTab === "users" && currentUserRole === "admin") {
      fetchUsers();
    }
  }, [activeTab, currentUserRole, fetchUsers]);

  // Handler Creazione Utente
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUserError("");
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Validazione formato nome.cognome (escluso admin)
    if (name.toLowerCase() !== "admin" && !name.includes(".")) {
      setUserError(t("usersManagement.nameFormatError"));
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        setIsAddUserOpen(false);
        fetchUsers();
      } else {
        const errData = await res.json();
        setUserError(errData.error || t("addUserModal.defaultError"));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handler Cambio Ruolo Admin
  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      fetchUsers();
    }
  };

  // Handler Eliminazione Utente (con migrazione transazioni all'admin)
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
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handler Cambio Password personale
  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setActionLoading(true);

    const formData = new FormData(e.currentTarget);
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
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccess("");
        }, 1500);
      } else {
        const errData = await res.json();
        setPasswordError(errData.error || t("passwordModal.defaultError"));
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="@container/main flex flex-col gap-8 py-6 px-4 md:px-6 min-h-[calc(100dvh-var(--header-height)-4rem)]">
      
      {/* Intestazione */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Sistema di Tab */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTabChange("categories")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "categories"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <FolderKanban className="h-4 w-4" />
              {t("tabs.categories")}
            </button>

            <button
              onClick={() => handleTabChange("users")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "users"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              {t("tabs.users")}
            </button>
          </div>

          {/* Bottone cambio password personale sempre disponibile */}
          <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            {t("changePassword")}
          </Button>
        </div>

        {/* Contenuto dei Tab */}
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[300px]">
          
          {/* TAB CATEGORIE */}
          {activeTab === "categories" && (
            <div className="text-center text-muted-foreground py-16">
              <FolderKanban className="mx-auto h-10 w-10 opacity-40 mb-2" />
              <p className="text-sm">Gestione categorie in arrivo...</p>
            </div>
          )}

          {/* TAB UTENTI */}
          {activeTab === "users" && (
            <div className="space-y-6">
              
              {currentUserRole === "admin" ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{t("usersManagement.title")}</h3>
                      <p className="text-xs text-muted-foreground">{t("usersManagement.subtitle")}</p>
                    </div>
                    <Button onClick={() => { setUserError(""); setIsAddUserOpen(true); }}>
                      <UserPlus className="h-4 w-4 mr-2" /> {t("usersManagement.newUser")}
                    </Button>
                  </div>

                  <div className="rounded-md border relative overflow-x-auto">
                    {loadingUsers && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("usersManagement.nameCol")}</TableHead>
                          <TableHead>{t("usersManagement.emailCol")}</TableHead>
                          <TableHead>{t("usersManagement.roleCol")}</TableHead>
                          <TableHead className="text-right">{t("usersManagement.actionsCol")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersList.length === 0 && !loadingUsers ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                              {t("usersManagement.noUsers")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          usersList.map((u) => (
                            <TableRow key={u._id}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell>{u.email}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>
                                  {u.role}
                                </span>
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                {u._id !== currentUserId && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleToggleAdmin(u._id, u.role)}
                                    >
                                      <Shield className="h-3.5 w-3.5 mr-1" />
                                      {u.role === "admin" ? t("usersManagement.removeAdmin") : t("usersManagement.makeAdmin")}
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setUserToDelete(u)}
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
                </>
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <Users className="mx-auto h-10 w-10 opacity-40 mb-2" />
                  <p className="text-sm">{t("usersManagement.adminOnly")}</p>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* MODALE CREAZIONE UTENTE (Admin) */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addUserModal.title")}</DialogTitle>
            <DialogDescription>{t("addUserModal.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("addUserModal.nameLabel")}</Label>
              <Input name="name" required placeholder="mario.rossi" />
            </div>
            <div className="space-y-2">
              <Label>{t("addUserModal.emailLabel")}</Label>
              <Input name="email" type="email" required placeholder="mario@example.com" />
            </div>
            <div className="space-y-2">
              <Label>{t("addUserModal.passwordLabel")}</Label>
              <Input name="password" type="password" required />
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

      {/* MODALE ELIMINA UTENTE & MIGRAZIONE TRANSAZIONI */}
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

      {/* MODALE CAMBIO PASSWORD PERSONALE */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("passwordModal.title")}</DialogTitle>
            <DialogDescription>{t("passwordModal.description")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("passwordModal.currentPassword")}</Label>
              <Input name="currentPassword" type="password" required />
            </div>
            <div className="space-y-2">
              <Label>{t("passwordModal.newPassword")}</Label>
              <Input name="newPassword" type="password" required />
            </div>

            {passwordError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 text-sm text-emerald-500 bg-emerald-500/10 rounded-md text-center">
                {passwordSuccess}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>{t("passwordModal.cancel")}</Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t("passwordModal.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}