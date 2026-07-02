import { useState, type FormEvent } from "react";
import { Plus, Trash2, Pencil, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
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
};

export function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, pageSize: 25 });
  const { data, isLoading } = useTransactions(filters);
  const { data: accounts } = useAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: categories } = useCategories();
  const createTxn = useCreateTransaction();
  const updateTxn = useUpdateTransaction();
  const deleteTxn = useDeleteTransaction();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<TransactionType>("EXPENSE");
  const [expenseSource, setExpenseSource] = useState<"account" | "card">("account");
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setFormType("EXPENSE");
    setExpenseSource("account");
    setError(null);
    setOpen(true);
  }

  function openEdit(txn: Transaction) {
    setEditing(txn);
    setFormType(txn.type === "CC_PAYMENT" ? "EXPENSE" : txn.type);
    setExpenseSource(txn.creditCardId ? "card" : "account");
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

    let payload: Record<string, unknown>;
    if (formType === "INCOME") {
      payload = { type: "INCOME", amount, date, note, accountId: String(form.get("accountId")), categoryId: String(form.get("categoryId")) };
    } else if (formType === "EXPENSE") {
      payload = {
        type: "EXPENSE",
        amount,
        date,
        note,
        categoryId: String(form.get("categoryId")),
        ...(expenseSource === "account"
          ? { accountId: String(form.get("accountId")) }
          : { creditCardId: String(form.get("creditCardId")) }),
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
                      {txn.note || txn.category?.name || meta.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(txn.date)}
                      {txn.account && ` · ${txn.account.name}`}
                      {txn.creditCard && ` · ${txn.creditCard.name}`}
                      {txn.toAccount && ` → ${txn.toAccount.name}`}
                      {txn.category && ` · ${txn.category.name}`}
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
                    {txn.type === "EXPENSE" || txn.type === "CC_PAYMENT" ? "-" : txn.type === "INCOME" ? "+" : ""}
                    {formatMoney(Number(txn.amount))}
                  </span>
                  {txn.type !== "CC_PAYMENT" && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(txn)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
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
