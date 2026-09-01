import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Cinzel, EB_Garamond, Space_Grotesk } from "next/font/google";
import AppShell from "./app-shell";
import SplashScreen from "./splash-screen";
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
  title: "Michael's Video Articles",
  description: "AI-generated articles from your saved YouTube videos.",
  appleWebApp: {
    title: "Video Articles",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${cinzel.variable} ${ebGaramond.variable} ${spaceGrotesk.variable}`}
      style={{ backgroundColor: "#07090f" }}
      suppressHydrationWarning
    >
      {/* Inline, not just the bg-qw-bg class from globals.css: the point
          of the splash screen is to be the very first thing shown, and a
          class needs the external stylesheet to load first — on a slow
          connection or a cold PWA launch, that gap shows as a flash of
          the browser's default white background before the dark splash
          ever appears. An inline style paints correctly on first paint,
          no stylesheet required. */}
      <body className="min-h-full" style={{ backgroundColor: "#07090f" }}>
        <SplashScreen />
        {/* RootLayout itself is no longer async: it used to await the
            sidebar's nav data (a Supabase round trip) before returning
            *any* JSX, which held back the entire HTML document — the
            splash screen included — until that query resolved. That was
            the actual "blank screen before the logo" gap, not something
            the inline background-color fix above could touch, since
            there was no HTML to paint a background on yet. Suspense lets
            the shell (and the splash inside it) stream out immediately;
            the nav-dependent chrome fills in the moment the query
            finishes, invisibly, behind the still-showing splash. */}
        <Suspense fallback={null}>
          <AppShellWithNavData>{children}</AppShellWithNavData>
        </Suspense>
      </body>
    </html>
  );
}

async function AppShellWithNavData({ children }: { children: ReactNode }) {
  const { categories, allCount, uncategorizedCount, userEmail } =
    await getNavData();
  const cookieStore = await cookies();
  const initialNavCollapsed =
    cookieStore.get(NAV_COLLAPSED_COOKIE)?.value === "true";

  return (
    <AppShell
      categories={categories}
      allCount={allCount}
      uncategorizedCount={uncategorizedCount}
      userEmail={userEmail}
      initialNavCollapsed={initialNavCollapsed}
    >
      {children}
    </AppShell>
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
      .from("yts_info")
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
