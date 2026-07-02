import { useState, type FormEvent } from "react";
import { Plus, Trash2, IndianRupee } from "lucide-react";
import {
  useCreditCards,
  useCreateCreditCard,
  useDeleteCreditCard,
  usePayCreditCard,
} from "@/hooks/useCreditCards";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import type { CreditCard } from "@/types";

export function CreditCardsPage() {
  const { data: cards, isLoading } = useCreditCards();
  const { data: accounts } = useAccounts();
  const createCard = useCreateCreditCard();
  const deleteCard = useDeleteCreditCard();
  const payCard = usePayCreditCard();
  const [open, setOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<CreditCard | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createCard.mutateAsync({
      name: String(form.get("name")),
      bank: String(form.get("bank")),
      creditLimit: Number(form.get("creditLimit")),
      billingCycleDay: Number(form.get("billingCycleDay")),
      dueDay: Number(form.get("dueDay")),
    });
    setOpen(false);
  }

  async function handlePay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payTarget) return;
    const form = new FormData(e.currentTarget);
    await payCard.mutateAsync({
      id: payTarget.id,
      accountId: String(form.get("accountId")),
      amount: Number(form.get("amount")),
    });
    setPayTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Credit Cards</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Credit Card</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Card name</Label>
                <Input id="name" name="name" required placeholder="e.g. HDFC Regalia" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank">Bank</Label>
                <Input id="bank" name="bank" required placeholder="e.g. HDFC Bank" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit limit</Label>
                <Input id="creditLimit" name="creditLimit" type="number" step="0.01" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingCycleDay">Billing day</Label>
                  <Input id="billingCycleDay" name="billingCycleDay" type="number" min={1} max={31} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDay">Due day</Label>
                  <Input id="dueDay" name="dueDay" type="number" min={1} max={31} required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCard.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards?.map((card) => {
          const utilisation = (card.outstanding / Number(card.creditLimit)) * 100;
          return (
            <Card key={card.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{card.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{card.bank}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remove ${card.name}?`)) deleteCard.mutate(card.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-semibold text-destructive">-{formatMoney(card.outstanding)}</p>
                <p className="text-xs text-muted-foreground">
                  Limit {formatMoney(Number(card.creditLimit))} · {utilisation.toFixed(0)}% used
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-destructive"
                    style={{ width: `${Math.min(100, utilisation)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Bill on day {card.billingCycleDay}, due day {card.dueDay}
                </p>
                <Dialog
                  open={payTarget?.id === card.id}
                  onOpenChange={(o) => setPayTarget(o ? card : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <IndianRupee className="h-3.5 w-3.5" /> Pay card
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pay {card.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePay} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountId">From account</Label>
                        <select
                          id="accountId"
                          name="accountId"
                          required
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          {accounts?.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({formatMoney(a.balance)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          name="amount"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={card.outstanding > 0 ? card.outstanding : undefined}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={payCard.isPending}>
                          Confirm payment
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
        {cards?.length === 0 && <p className="text-muted-foreground">No credit cards yet.</p>}
      </div>
    </div>
  );
}
