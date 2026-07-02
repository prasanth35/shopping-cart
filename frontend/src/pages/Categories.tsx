import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";

// Fixed-order categorical palette (validated for CVD-safe adjacency — see dataviz skill)
const SWATCHES = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"];

export function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(SWATCHES[0]);

  const expenseCategories = categories?.filter((c) => c.kind === "EXPENSE") ?? [];
  const incomeCategories = categories?.filter((c) => c.kind === "INCOME") ?? [];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await createCategory.mutateAsync({
        name: String(form.get("name")),
        kind: form.get("kind") === "INCOME" ? "INCOME" : "EXPENSE",
        color,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create category");
    }
  }

  function renderList(items: typeof expenseCategories) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((cat) => (
          <Badge key={cat.id} variant="outline" className="gap-2 py-1.5 pl-2 pr-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
            <button
              className="ml-1 rounded-full p-0.5 hover:bg-muted"
              onClick={() => deleteCategory.mutate(cat.id)}
              aria-label={`Delete ${cat.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Groceries" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kind">Kind</Label>
                <select
                  id="kind"
                  name="kind"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {SWATCHES.map((swatch) => (
                    <button
                      type="button"
                      key={swatch}
                      onClick={() => setColor(swatch)}
                      className="h-7 w-7 rounded-full ring-offset-2"
                      style={{ backgroundColor: swatch, outline: color === swatch ? "2px solid black" : "none" }}
                      aria-label={swatch}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={createCategory.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense categories</CardTitle>
        </CardHeader>
        <CardContent>{renderList(expenseCategories)}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income categories</CardTitle>
        </CardHeader>
        <CardContent>{renderList(incomeCategories)}</CardContent>
      </Card>
    </div>
  );
}
