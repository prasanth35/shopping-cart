import { useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import type { Account } from "@/types";

const ACCOUNT_TYPES = ["savings", "current", "cash", "wallet"];

export function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: String(form.get("name")),
      type: String(form.get("type")),
      openingBalance: Number(form.get("openingBalance") || 0),
    };
    if (editing) {
      await updateAccount.mutateAsync({ id: editing.id, data });
    } else {
      await createAccount.mutateAsync(data);
    }
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Account" : "New Account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={editing?.name} placeholder="e.g. HDFC Savings" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  name="type"
                  defaultValue={editing?.type ?? "savings"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening balance</Label>
                  <Input id="openingBalance" name="openingBalance" type="number" step="0.01" defaultValue={0} />
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createAccount.isPending || updateAccount.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account) => (
          <Card key={account.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{account.name}</CardTitle>
                <p className="text-xs uppercase text-muted-foreground">{account.type}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(account)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remove ${account.name}?`)) deleteAccount.mutate(account.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-semibold ${account.balance < 0 ? "text-destructive" : ""}`}>
                {formatMoney(account.balance)}
              </p>
            </CardContent>
          </Card>
        ))}
        {accounts?.length === 0 && (
          <p className="text-muted-foreground">No accounts yet — add your first bank account.</p>
        )}
      </div>
    </div>
  );
}
