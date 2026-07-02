import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2, Eye, EyeOff, KeyRound, CreditCard as CardIcon, StickyNote } from "lucide-react";
import {
  useVaultEntries,
  useCreateVaultEntry,
  useDeleteVaultEntry,
  useRevealVaultEntry,
} from "@/hooks/useVault";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import type { VaultEntryMeta, VaultEntryType, VaultEntryRevealed } from "@/types";

const TYPE_ICON: Record<VaultEntryType, typeof KeyRound> = {
  PASSWORD: KeyRound,
  CARD: CardIcon,
  NOTE: StickyNote,
};

export function VaultPage() {
  const { data: entries, isLoading } = useVaultEntries();
  const createEntry = useCreateVaultEntry();
  const deleteEntry = useDeleteVaultEntry();
  const reveal = useRevealVaultEntry();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<VaultEntryType>("PASSWORD");
  const [revealTarget, setRevealTarget] = useState<VaultEntryMeta | null>(null);
  const [revealed, setRevealed] = useState<VaultEntryRevealed | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title"));
    let data: Record<string, unknown>;
    if (type === "PASSWORD") {
      data = {
        site: String(form.get("site") || ""),
        username: String(form.get("username") || ""),
        password: String(form.get("password") || ""),
        notes: String(form.get("notes") || ""),
      };
    } else if (type === "CARD") {
      data = {
        cardholderName: String(form.get("cardholderName") || ""),
        cardNumber: String(form.get("cardNumber") || ""),
        expiry: String(form.get("expiry") || ""),
        cvv: String(form.get("cvv") || ""),
        bank: String(form.get("bank") || ""),
        notes: String(form.get("notes") || ""),
      };
    } else {
      data = { body: String(form.get("body") || "") };
    }
    await createEntry.mutateAsync({ type, title, data });
    setOpen(false);
  }

  function openReveal(entry: VaultEntryMeta) {
    setRevealTarget(entry);
    setRevealed(null);
    setRevealError(null);
    setShowSecret(false);
  }

  async function handleReveal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!revealTarget) return;
    setRevealError(null);
    const form = new FormData(e.currentTarget);
    try {
      const result = await reveal.mutateAsync({ id: revealTarget.id, password: String(form.get("password")) });
      setRevealed(result);
    } catch (err) {
      setRevealError(err instanceof ApiError ? err.message : "Could not reveal entry");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vault</h1>
          <p className="text-sm text-muted-foreground">
            Passwords and card details, encrypted at rest. Re-enter your login password to view a secret.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Vault Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required placeholder="e.g. Gmail, HDFC Debit Card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as VaultEntryType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PASSWORD">Password</option>
                  <option value="CARD">Card</option>
                  <option value="NOTE">Secure note</option>
                </select>
              </div>

              {type === "PASSWORD" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="site">Site / App</Label>
                    <Input id="site" name="site" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" />
                  </div>
                </>
              )}

              {type === "CARD" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder name</Label>
                    <Input id="cardholderName" name="cardholderName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card number</Label>
                    <Input id="cardNumber" name="cardNumber" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input id="expiry" name="expiry" placeholder="MM/YY" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" name="cvv" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank">Bank</Label>
                    <Input id="bank" name="bank" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" />
                  </div>
                </>
              )}

              {type === "NOTE" && (
                <div className="space-y-2">
                  <Label htmlFor="body">Note</Label>
                  <Textarea id="body" name="body" required rows={6} />
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={createEntry.isPending}>
                  Save (encrypted)
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries?.map((entry) => {
          const Icon = TYPE_ICON[entry.type];
          return (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete ${entry.title}?`)) deleteEntry.mutate(entry.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Dialog open={revealTarget?.id === entry.id} onOpenChange={(o) => (o ? openReveal(entry) : setRevealTarget(null))}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{entry.title}</DialogTitle>
                    </DialogHeader>
                    {!revealed ? (
                      <form onSubmit={handleReveal} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reveal-password">Confirm your login password</Label>
                          <Input id="reveal-password" name="password" type="password" required autoFocus />
                        </div>
                        {revealError && <p className="text-sm text-destructive">{revealError}</p>}
                        <DialogFooter>
                          <Button type="submit" disabled={reveal.isPending}>
                            Reveal
                          </Button>
                        </DialogFooter>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        {"password" in revealed.data && (
                          <>
                            <Field label="Site" value={revealed.data.site} />
                            <Field label="Username" value={revealed.data.username} />
                            <Field
                              label="Password"
                              value={showSecret ? revealed.data.password : "••••••••"}
                              action={
                                <Button variant="ghost" size="icon" onClick={() => setShowSecret((s) => !s)}>
                                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              }
                            />
                            {revealed.data.notes && <Field label="Notes" value={revealed.data.notes} />}
                          </>
                        )}
                        {"cardNumber" in revealed.data && (
                          <>
                            <Field label="Cardholder" value={revealed.data.cardholderName} />
                            <Field
                              label="Card number"
                              value={showSecret ? revealed.data.cardNumber : "•••• •••• •••• " + revealed.data.cardNumber.slice(-4)}
                              action={
                                <Button variant="ghost" size="icon" onClick={() => setShowSecret((s) => !s)}>
                                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              }
                            />
                            <Field label="Expiry" value={revealed.data.expiry} />
                            <Field label="CVV" value={showSecret ? revealed.data.cvv : "•••"} />
                            <Field label="Bank" value={revealed.data.bank} />
                            {revealed.data.notes && <Field label="Notes" value={revealed.data.notes} />}
                          </>
                        )}
                        {"body" in revealed.data && <Field label="Note" value={revealed.data.body} />}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
        {entries?.length === 0 && <p className="text-muted-foreground">Nothing stored yet.</p>}
      </div>
    </div>
  );
}

function Field({ label, value, action }: { label: string; value?: string; action?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-2">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-mono break-all">{value}</p>
      </div>
      {action}
    </div>
  );
}
