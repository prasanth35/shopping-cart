import { useState, type FormEvent } from "react";
import { Plus, Trash2, RefreshCw, PiggyBank } from "lucide-react";
import {
  useInvestments,
  useCreateInvestment,
  useDeleteInvestment,
  useContributeInvestment,
  useUpdateInvestmentValue,
} from "@/hooks/useInvestments";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import { INVESTMENT_TYPE_LABELS, type Investment, type InvestmentType } from "@/types";

const INVESTMENT_TYPES = Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[];

export function InvestmentsPage() {
  const { data: investments, isLoading } = useInvestments();
  const { data: accounts } = useAccounts();
  const createInvestment = useCreateInvestment();
  const deleteInvestment = useDeleteInvestment();
  const contribute = useContributeInvestment();
  const updateValue = useUpdateInvestmentValue();
  const [open, setOpen] = useState(false);
  const [contributeTarget, setContributeTarget] = useState<Investment | null>(null);
  const [valueTarget, setValueTarget] = useState<Investment | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createInvestment.mutateAsync({
      name: String(form.get("name")),
      type: String(form.get("type")),
      referenceNumber: String(form.get("referenceNumber") || "") || null,
    });
    setOpen(false);
  }

  async function handleContribute(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contributeTarget) return;
    const form = new FormData(e.currentTarget);
    await contribute.mutateAsync({
      id: contributeTarget.id,
      accountId: String(form.get("accountId")),
      amount: Number(form.get("amount")),
    });
    setContributeTarget(null);
  }

  async function handleValueUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valueTarget) return;
    const form = new FormData(e.currentTarget);
    await updateValue.mutateAsync({ id: valueTarget.id, currentValue: Number(form.get("currentValue")) });
    setValueTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Investments</h1>
          <p className="text-sm text-muted-foreground">SIPs, mutual funds, NPS, FDs, RDs — your general savings.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Investment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Parag Parikh Flexi Cap SIP" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  name="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {INVESTMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {INVESTMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference number (optional)</Label>
                <Input id="referenceNumber" name="referenceNumber" placeholder="Folio / PRAN / certificate number" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createInvestment.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {investments?.map((inv) => (
          <Card key={inv.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{inv.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{INVESTMENT_TYPE_LABELS[inv.type]}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Remove ${inv.name}?`)) deleteInvestment.mutate(inv.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold">{formatMoney(Number(inv.currentValue))}</p>
              <p className={`text-xs ${inv.gainLoss >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {inv.gainLoss >= 0 ? "+" : ""}
                {formatMoney(inv.gainLoss)} vs. invested
              </p>
              <p className="text-xs text-muted-foreground">Invested: {formatMoney(inv.investedAmount)}</p>
              <div className="flex gap-2 pt-1">
                <Dialog open={contributeTarget?.id === inv.id} onOpenChange={(o) => setContributeTarget(o ? inv : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <PiggyBank className="h-3.5 w-3.5" /> Contribute
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Contribute to {inv.name}</DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        This moves money out of the account's spendable balance.
                      </p>
                    </DialogHeader>
                    <form onSubmit={handleContribute} className="space-y-4">
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
                        <Input id="amount" name="amount" type="number" step="0.01" required />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={contribute.isPending}>
                          Save
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={valueTarget?.id === inv.id} onOpenChange={(o) => setValueTarget(o ? inv : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update current value — {inv.name}</DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Set what this is worth today (e.g. after checking your statement or the FD/NPS portal).
                      </p>
                    </DialogHeader>
                    <form onSubmit={handleValueUpdate} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentValue">Current value</Label>
                        <Input
                          id="currentValue"
                          name="currentValue"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={Number(inv.currentValue)}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={updateValue.isPending}>
                          Save
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {investments?.length === 0 && <p className="text-muted-foreground">No investments yet.</p>}
      </div>
    </div>
  );
}
