import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { TransactionsPage } from "@/pages/Transactions";
import { AccountsPage } from "@/pages/Accounts";
import { CreditCardsPage } from "@/pages/CreditCards";
import { CategoriesPage } from "@/pages/Categories";
import { GoalsPage } from "@/pages/Goals";
import { InvestmentsPage } from "@/pages/Investments";
import { VaultPage } from "@/pages/Vault";
import { SettingsPage } from "@/pages/Settings";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="credit-cards" element={<CreditCardsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
