import { useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  type TransactionFilters,
} from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useCategories } from "@/hooks/useCategories";
import { useContacts } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import type { Transaction, TransactionType } from "@/types";

const TYPE_META: Record<TransactionType, { label: string; icon: typeof ArrowDownCircle; className: string }> = {
  INCOME: { label: "Income", icon: ArrowDownCircle, className: "text-emerald-600" },
  EXPENSE: { label: "Expense", icon: ArrowUpCircle, className: "text-destructive" },
  TRANSFER: { label: "Transfer", icon: ArrowLeftRight, className: "text-blue-600" },
  CC_PAYMENT: { label: "Card Payment", icon: ArrowLeftRight, className: "text-amber-600" },
  GOAL_CONTRIBUTION: { label: "Goal Contribution", icon: Target, className: "text-violet-600" },
  INVESTMENT_CONTRIBUTION: { label: "Investment Contribution", icon: TrendingUp, className: "text-cyan-600" },
};

const OUTFLOW_TYPES = new Set<TransactionType>(["EXPENSE", "CC_PAYMENT", "GOAL_CONTRIBUTION", "INVESTMENT_CONTRIBUTION"]);
// These represent a fixed link (account/card -> goal/investment) that was set
// at creation time; only amount/date/note can be edited afterward.
const LINKED_TYPES = new Set<TransactionType>(["CC_PAYMENT", "GOAL_CONTRIBUTION", "INVESTMENT_CONTRIBUTION"]);

interface SplitRow {
  contactId: string;
  amount: string;
}

export function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, pageSize: 25 });
  const { data, isLoading } = useTransactions(filters);
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: categories } = useCategories();
  const { data: contacts } = useContacts();
  const createTxn = useCreateTransaction();
  const updateTxn = useUpdateTransaction();
  const deleteTxn = useDeleteTransaction();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<TransactionType>("EXPENSE");
  const [expenseSource, setExpenseSource] = useState<"account" | "card">("account");
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFormType("EXPENSE");
    setExpenseSource("account");
    setSplitRows([]);
    setError(null);
    setOpen(true);
  }

  function openEdit(txn: Transaction) {
    setEditing(txn);
    setFormType(txn.type === "CC_PAYMENT" ? "EXPENSE" : txn.type);
    setExpenseSource(txn.creditCardId ? "card" : "account");
    setSplitRows([]);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const date = String(form.get("date"));
    const note = String(form.get("note") || "") || undefined;
    const amount = Number(form.get("amount"));

    if (editing && LINKED_TYPES.has(editing.type)) {
      try {
        await updateTxn.mutateAsync({ id: editing.id, data: { amount, date, note } });
        setOpen(false);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save transaction");
      }
      return;
    }

    let payload: Record<string, unknown>;
    if (formType === "INCOME") {
      payload = { type: "INCOME", amount, date, note, accountId: String(form.get("accountId")), categoryId: String(form.get("categoryId")) };
    } else if (formType === "EXPENSE") {
      const splits = splitRows
        .filter((r) => r.contactId && Number(r.amount) > 0)
        .map((r) => ({ contactId: r.contactId, amount: Number(r.amount) }));
      payload = {
        type: "EXPENSE",
        amount,
        date,
        note,
        categoryId: String(form.get("categoryId")),
        ...(expenseSource === "account"
          ? { accountId: String(form.get("accountId")) }
          : { creditCardId: String(form.get("creditCardId")) }),
        ...(splits.length > 0 ? { splits } : {}),
      };
    } else {
      payload = {
        type: "TRANSFER",
        amount,
        date,
        note,
        accountId: String(form.get("fromAccountId")),
        toAccountId: String(form.get("toAccountId")),
      };
    }

    try {
      if (editing) {
        await updateTxn.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createTxn.mutateAsync(payload);
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save transaction");
    }
  }

  const expenseCategories = categories?.filter((c) => c.kind === "EXPENSE") ?? [];
  const incomeCategories = categories?.filter((c) => c.kind === "INCOME") ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Transaction" : "New Transaction"}</DialogTitle>
            </DialogHeader>
            {editing && LINKED_TYPES.has(editing.type) ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {editing.type === "CC_PAYMENT" && `Payment to ${editing.creditCard?.name ?? "card"} from ${editing.account?.name ?? "account"}.`}
                  {editing.type === "GOAL_CONTRIBUTION" && `Contribution to ${editing.goal?.name ?? "goal"} from ${editing.account?.name ?? "account"}.`}
                  {editing.type === "INVESTMENT_CONTRIBUTION" &&
                    `Contribution to ${editing.investment?.name ?? "investment"} from ${editing.account?.name ?? "account"}.`}
                  {" "}
                  Only the amount, date, and note can be changed here — delete and re-create to change the account/card link.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required defaultValue={editing.amount} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" name="date" type="date" required defaultValue={editing.date.slice(0, 10)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Input id="note" name="note" defaultValue={editing.note ?? ""} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={updateTxn.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setFormType(t)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium",
                      formType === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editing?.amount}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={editing ? editing.date.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>

              {formType === "EXPENSE" && (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExpenseSource("account")}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-sm",
                        expenseSource === "account" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                    >
                      From bank account
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseSource("card")}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-2 text-sm",
                        expenseSource === "card" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                    >
                      On credit card
                    </button>
                  </div>
                  {expenseSource === "account" ? (
                    <SelectField label="Account" name="accountId" options={accounts} defaultValue={editing?.accountId ?? undefined} />
                  ) : (
                    <SelectField label="Credit card" name="creditCardId" options={creditCards} defaultValue={editing?.creditCardId ?? undefined} />
                  )}
                  <SelectField label="Category" name="categoryId" options={expenseCategories} defaultValue={editing?.categoryId ?? undefined} />

                  {!editing && contacts && contacts.length > 0 && (
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" /> Split with (optional)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSplitRows((rows) => [...rows, { contactId: "", amount: "" }])}
                        >
                          + Add
                        </Button>
                      </div>
                      {splitRows.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <select
                            value={row.contactId}
                            onChange={(e) =>
                              setSplitRows((rows) => rows.map((r, ri) => (ri === i ? { ...r, contactId: e.target.value } : r)))
                            }
                            className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            <option value="">Select contact…</option>
                            {contacts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            className="h-9 w-28"
                            value={row.amount}
                            onChange={(e) =>
                              setSplitRows((rows) => rows.map((r, ri) => (ri === i ? { ...r, amount: e.target.value } : r)))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => setSplitRows((rows) => rows.filter((_, ri) => ri !== i))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {splitRows.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Add a friend here to mark part of this expense as owed back to you.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {formType === "INCOME" && (
                <>
                  <SelectField label="Account" name="accountId" options={accounts} defaultValue={editing?.accountId ?? undefined} />
                  <SelectField label="Category" name="categoryId" options={incomeCategories} defaultValue={editing?.categoryId ?? undefined} />
                </>
              )}

              {formType === "TRANSFER" && (
                <>
                  <SelectField label="From account" name="fromAccountId" options={accounts} defaultValue={editing?.accountId ?? undefined} />
                  <SelectField label="To account" name="toAccountId" options={accounts} defaultValue={editing?.toAccountId ?? undefined} />
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input id="note" name="note" defaultValue={editing?.note ?? ""} />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <DialogFooter>
                <Button type="submit" disabled={createTxn.isPending || updateTxn.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Input
            placeholder="Search note/payee…"
            className="w-48"
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, search: e.target.value }))}
          />
          <Input
            type="date"
            className="w-40"
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, from: e.target.value || undefined }))}
          />
          <Input
            type="date"
            className="w-40"
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, to: e.target.value || undefined }))}
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, type: e.target.value || undefined }))}
          >
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
            <option value="CC_PAYMENT">Card Payment</option>
            <option value="GOAL_CONTRIBUTION">Goal Contribution</option>
            <option value="INVESTMENT_CONTRIBUTION">Investment Contribution</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, accountId: e.target.value || undefined }))}
          >
            <option value="">All accounts</option>
            {accounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(e) => setFilters((f) => ({ ...f, page: 1, categoryId: e.target.value || undefined }))}
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="space-y-2">
        {data?.items.map((txn) => {
          const meta = TYPE_META[txn.type];
          const Icon = meta.icon;
          return (
            <Card key={txn.id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={cn("h-5 w-5 shrink-0", meta.className)} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {txn.note || txn.category?.name || txn.goal?.name || txn.investment?.name || meta.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(txn.date)}
                      {txn.account && ` · ${txn.account.name}`}
                      {txn.creditCard && ` · ${txn.creditCard.name}`}
                      {txn.toAccount && ` → ${txn.toAccount.name}`}
                      {txn.category && ` · ${txn.category.name}`}
                      {txn.goal && ` · Goal: ${txn.goal.name}`}
                      {txn.investment && ` · Investment: ${txn.investment.name}`}
                      {txn.splits.length > 0 &&
                        ` · Split: ${txn.splits.map((s) => `${s.contact.name} ${formatMoney(Number(s.amount))}${s.settledAt ? " (settled)" : ""}`).join(", ")}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {txn.category && (
                    <Badge variant="outline" className="hidden sm:inline-flex" style={{ borderColor: txn.category.color }}>
                      {txn.category.name}
                    </Badge>
                  )}
                  <span className={cn("font-semibold", meta.className)}>
                    {OUTFLOW_TYPES.has(txn.type) ? "-" : txn.type === "INCOME" ? "+" : ""}
                    {formatMoney(Number(txn.amount))}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(txn)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this transaction?")) deleteTxn.mutate(txn.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {data?.items.length === 0 && <p className="text-muted-foreground">No transactions match these filters.</p>}
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {filters.page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options?: { id: string; name: string }[];
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        required
        defaultValue={defaultValue}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="" disabled>
          Select…
        </option>
        {options?.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}
