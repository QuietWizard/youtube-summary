import type { Metadata } from "next";
import { Cinzel, EB_Garamond, Space_Grotesk } from "next/font/google";
import AppShell from "./app-shell";
import "./globals.css";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "YouTube Summary",
  description: "A Next.js and Tailwind CSS website.",
};

export type CategoryNavItem = {
  label: string;
  count: number;
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { categories, allCount, uncategorizedCount, userEmail } =
    await getNavData();

  return (
    <html
      lang="en"
      className={`h-full antialiased ${cinzel.variable} ${ebGaramond.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <AppShell
          categories={categories}
          allCount={allCount}
          uncategorizedCount={uncategorizedCount}
          userEmail={userEmail}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}

async function getNavData(): Promise<{
  categories: CategoryNavItem[];
  allCount: number;
  uncategorizedCount: number;
  userEmail: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { categories: [], allCount: 0, uncategorizedCount: 0, userEmail: null };
  }

  const adminSupabase = createAdminClient();

  const [{ data: categoryRows }, { data: videoRows }] = await Promise.all([
    adminSupabase.from("Categories").select("category"),
    adminSupabase
      .from("YouTube-Summary")
      .select("category, archived")
      .or("archived.is.null,archived.eq.false"),
  ]);

  const categoryNames = Array.from(
    new Set(
      (categoryRows ?? [])
        .map((row) => row.category?.trim())
        .filter(
          (category): category is string =>
            Boolean(category && category !== "None")
        )
    )
  ).sort((a, b) => a.localeCompare(b));

  const counts = new Map<string, number>();
  let uncategorizedCount = 0;

  for (const row of videoRows ?? []) {
    const category = row.category?.trim();
    if (!category || category === "None") {
      uncategorizedCount += 1;
    } else {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  const categories = categoryNames.map((label) => ({
    label,
    count: counts.get(label) ?? 0,
  }));

  return {
    categories,
    allCount: (videoRows ?? []).length,
    uncategorizedCount,
    userEmail: user.email ?? null,
  };
}
