import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAccountBalances, getCategories } from "@/lib/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { TabBar } from "@/components/layout/tabbar";
import { QuickAddProvider } from "@/components/quick-add/quick-add-context";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [categories, accounts] = await Promise.all([getCategories(), getAccountBalances()]);

  // Theme cookie → data-theme on <html> is set by a tiny inline script to avoid flash.
  const theme = cookies().get("theme")?.value ?? "auto";

  return (
    <QuickAddProvider categories={categories} accounts={accounts}>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var t=${JSON.stringify(theme)};if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}})();`,
        }}
      />
      <div className="lg:grid lg:grid-cols-[220px_1fr] min-h-dvh">
        <Sidebar email={user.email ?? ""} />
        <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-28 lg:px-8 lg:pt-7 lg:pb-16">{children}</main>
      </div>
      <TabBar />
    </QuickAddProvider>
  );
}
