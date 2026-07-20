import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Cinzel, EB_Garamond, Space_Grotesk } from "next/font/google";
import AppShell from "./app-shell";
import "./globals.css";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCurrentUser } from "@/utils/supabase/get-current-user";
import { getCategories } from "@/utils/get-categories";
import { NAV_COLLAPSED_COOKIE } from "./nav-cookie";

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
  description: "AI-generated summaries of your saved YouTube videos.",
  appleWebApp: {
    title: "Video Summaries",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090f",
  colorScheme: "dark",
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
  const cookieStore = await cookies();
  const initialNavCollapsed =
    cookieStore.get(NAV_COLLAPSED_COOKIE)?.value === "true";

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
          initialNavCollapsed={initialNavCollapsed}
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
  const user = await getCurrentUser();

  if (!user) {
    return { categories: [], allCount: 0, uncategorizedCount: 0, userEmail: null };
  }

  const adminSupabase = createAdminClient();

  const [categoryNames, { data: videoRows }] = await Promise.all([
    getCategories(),
    adminSupabase
      .from("YouTube-Summary")
      .select("category, archived")
      .or("archived.is.null,archived.eq.false"),
  ]);

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
