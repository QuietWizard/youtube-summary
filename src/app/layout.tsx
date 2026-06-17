import type { Metadata } from "next";
import AppShell from "./app-shell";
import "./globals.css";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "YouTube Summary",
  description: "A Next.js and Tailwind CSS website.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategories();

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <AppShell categories={categories}>{children}</AppShell>
      </body>
    </html>
  );
}

async function getCategories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("Categories")
    .select("category");

  if (error) {
    return [];
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.category?.trim())
        .filter((category): category is string => Boolean(category && category !== "None"))
    )
  ).sort((a, b) => a.localeCompare(b));
}
