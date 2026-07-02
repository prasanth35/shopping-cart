import { useState, type FormEvent } from "react";
import { Plus, Trash2, Users, CheckCircle2 } from "lucide-react";
import { useContacts, useCreateContact, useDeleteContact, useContactSplits } from "@/hooks/useContacts";
import { useSettleSplit } from "@/hooks/useSplits";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Contact, Split } from "@/types";

export function SplitsPage() {
  const { data: contacts, isLoading } = useContacts();
  const { data: accounts } = useAccounts();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const settleSplit = useSettleSplit();

  const [open, setOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Contact | null>(null);
  const [settleTarget, setSettleTarget] = useState<Split | null>(null);

  const { data: splits } = useContactSplits(detailTarget?.id ?? null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createContact.mutateAsync({ name: String(form.get("name")) });
    setOpen(false);
  }

  async function handleSettle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settleTarget) return;
    const form = new FormData(e.currentTarget);
    await settleSplit.mutateAsync({ id: settleTarget.id, accountId: String(form.get("accountId")) });
    setSettleTarget(null);
  }

  const totalOwed = contacts?.reduce((s, c) => s + c.owedToYou, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Splits</h1>
          <p className="text-sm text-muted-foreground">
            Track money friends owe you back from expenses you paid.{" "}
            {totalOwed > 0 && <span className="font-medium text-foreground">{formatMoney(totalOwed)} owed to you overall.</span>}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Arun" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createContact.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contacts?.map((contact) => (
          <Card key={contact.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{contact.name}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Remove ${contact.name}?`)) deleteContact.mutate(contact.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className={`text-2xl font-semibold ${contact.owedToYou > 0 ? "text-emerald-600" : ""}`}>
                {formatMoney(contact.owedToYou)}
              </p>
              <p className="text-xs text-muted-foreground">owed to you</p>
              <Dialog open={detailTarget?.id === contact.id} onOpenChange={(o) => setDetailTarget(o ? contact : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    View splits
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{contact.name} — splits</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {splits?.map((split) => (
                      <div key={split.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{split.transaction?.note || "Expense"}</p>
                          <p className="text-xs text-muted-foreground">
                            {split.transaction && formatDate(split.transaction.date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-semibold">{formatMoney(Number(split.amount))}</span>
                          {split.settledAt ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Settled
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setSettleTarget(split)}>
                              Settle
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {splits?.length === 0 && <p className="text-sm text-muted-foreground">No splits with {contact.name} yet.</p>}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
        {contacts?.length === 0 && (
          <p className="text-muted-foreground">No contacts yet — add a friend to start tracking splits.</p>
        )}
      </div>

      <Dialog open={!!settleTarget} onOpenChange={(o) => !o && setSettleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle {settleTarget && formatMoney(Number(settleTarget.amount))}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This logs the reimbursement as income into the account you pick.
            </p>
          </DialogHeader>
          <form onSubmit={handleSettle} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountId">Received into</Label>
              <select
                id="accountId"
                name="accountId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={settleSplit.isPending}>
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
