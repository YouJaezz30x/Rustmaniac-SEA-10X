import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { AdminClient } from "@/components/admin-client";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  if (!session) redirect("/login");

  return (
    <div className="page">
      <h1 className="page__title">Admin</h1>
      <p className="page__lead">
        CRUD for packages, staff, plugins, rules, and announcements. Mark paid orders fulfilled
        until in-game auto-grant ships.
      </p>
      <AdminClient />
    </div>
  );
}
