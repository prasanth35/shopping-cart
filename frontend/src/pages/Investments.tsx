import { useState, type FormEvent } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import {
  useInvestments,
  useCreateInvestment,
  useDeleteInvestment,
  useUpdateInvestment,
  useAddInvestmentTransaction,
} from "@/hooks/useInvestments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import type { Investment } from "@/types";

export function InvestmentsPage() {
  const { data: investments, isLoading } = useInvestments();
  const createInvestment = useCreateInvestment();
  const deleteInvestment = useDeleteInvestment();
  const updateInvestment = useUpdateInvestment();
  const addTxn = useAddInvestmentTransaction();
  const [open, setOpen] = useState(false);
  const [txnTarget, setTxnTarget] = useState<Investment | null>(null);
  const [navTarget, setNavTarget] = useState<Investment | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await createInvestment.mutateAsync({
      fundName: String(form.get("fundName")),
      folioNumber: String(form.get("folioNumber") || "") || null,
      category: String(form.get("category") || "") || null,
      currentNav: Number(form.get("currentNav") || 0),
    });
    setOpen(false);
  }

  async function handleTxn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!txnTarget) return;
    const form = new FormData(e.currentTarget);
    await addTxn.mutateAsync({
      id: txnTarget.id,
      type: form.get("type") as "BUY" | "SELL" | "SIP",
      units: Number(form.get("units")),
      nav: Number(form.get("nav")),
      amount: Number(form.get("amount")),
    });
    setTxnTarget(null);
  }

  async function handleNavUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!navTarget) return;
    const form = new FormData(e.currentTarget);
    await updateInvestment.mutateAsync({ id: navTarget.id, data: { currentNav: Number(form.get("currentNav")) } });
    setNavTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Investments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Fund
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Mutual Fund</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fundName">Fund name</Label>
                <Input id="fundName" name="fundName" required placeholder="e.g. Parag Parikh Flexi Cap" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folioNumber">Folio number (optional)</Label>
                <Input id="folioNumber" name="folioNumber" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <Input id="category" name="category" placeholder="e.g. Equity" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentNav">Current NAV</Label>
                <Input id="currentNav" name="currentNav" type="number" step="0.0001" required />
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
                <CardTitle className="text-base">{inv.fundName}</CardTitle>
                {inv.category && <p className="text-xs text-muted-foreground">{inv.category}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Remove ${inv.fundName}?`)) deleteInvestment.mutate(inv.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold">{formatMoney(inv.currentValue)}</p>
              <p className={`text-xs ${inv.gainLoss >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {inv.gainLoss >= 0 ? "+" : ""}
                {formatMoney(inv.gainLoss)} ({inv.investedAmount ? ((inv.gainLoss / inv.investedAmount) * 100).toFixed(1) : "0"}%)
              </p>
              <p className="text-xs text-muted-foreground">
                {inv.units.toFixed(3)} units · Invested {formatMoney(inv.investedAmount)}
              </p>
              <p className="text-xs text-muted-foreground">NAV {Number(inv.currentNav).toFixed(2)}</p>
              <div className="flex gap-2 pt-1">
                <Dialog open={txnTarget?.id === inv.id} onOpenChange={(o) => setTxnTarget(o ? inv : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      Buy / SIP / Sell
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add transaction — {inv.fundName}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTxn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <select
                          id="type"
                          name="type"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="BUY">Buy (lump sum)</option>
                          <option value="SIP">SIP</option>
                          <option value="SELL">Sell</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="units">Units</Label>
                          <Input id="units" name="units" type="number" step="0.0001" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="nav">NAV</Label>
                          <Input id="nav" name="nav" type="number" step="0.0001" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" required />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={addTxn.isPending}>
                          Save
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={navTarget?.id === inv.id} onOpenChange={(o) => setNavTarget(o ? inv : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update NAV — {inv.fundName}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleNavUpdate} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentNav">Current NAV</Label>
                        <Input
                          id="currentNav"
                          name="currentNav"
                          type="number"
                          step="0.0001"
                          required
                          defaultValue={Number(inv.currentNav)}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={updateInvestment.isPending}>
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
