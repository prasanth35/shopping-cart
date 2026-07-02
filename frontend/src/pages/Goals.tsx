import { useState, type FormEvent } from "react";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import { useGoals, useCreateGoal, useDeleteGoal, useContributeGoal } from "@/hooks/useGoals";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Goal } from "@/types";

export function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const { data: accounts } = useAccounts();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const contribute = useContributeGoal();
  const [open, setOpen] = useState(false);
  const [contributeTarget, setContributeTarget] = useState<Goal | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const targetDate = String(form.get("targetDate") || "");
    await createGoal.mutateAsync({
      name: String(form.get("name")),
      targetAmount: Number(form.get("targetAmount")),
      targetDate: targetDate ? targetDate : null,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Goals</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Emergency Fund" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Target amount</Label>
                <Input id="targetAmount" name="targetAmount" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target date (optional)</Label>
                <Input id="targetDate" name="targetDate" type="date" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createGoal.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals?.map((goal) => (
          <Card key={goal.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <CardTitle className="text-base">{goal.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Remove ${goal.name}?`)) deleteGoal.mutate(goal.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold">{formatMoney(goal.currentAmount)}</p>
              <p className="text-xs text-muted-foreground">of {formatMoney(Number(goal.targetAmount))}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${goal.progressPct}%` }} />
              </div>
              {goal.targetDate && (
                <p className="text-xs text-muted-foreground">Target: {formatDate(goal.targetDate)}</p>
              )}
              <Dialog open={contributeTarget?.id === goal.id} onOpenChange={(o) => setContributeTarget(o ? goal : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <PiggyBank className="h-3.5 w-3.5" /> Add contribution
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Contribute to {goal.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      This moves money out of the account's spendable balance and into this goal.
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
            </CardContent>
          </Card>
        ))}
        {goals?.length === 0 && <p className="text-muted-foreground">No goals yet — set one to start saving.</p>}
      </div>
    </div>
  );
}
