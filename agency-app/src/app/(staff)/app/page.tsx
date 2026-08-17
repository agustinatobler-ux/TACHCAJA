import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: clientCount }, { count: projectCount }, { count: openTaskCount }, { count: pendingApprovalCount }] =
    await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "done"),
      supabase
        .from("attachments")
        .select("*", { count: "exact", head: true })
        .eq("is_deliverable", true)
        .eq("approval_status", "pending"),
    ]);

  const cards = [
    { label: "Clientes", value: clientCount ?? 0, href: "/app/clients" },
    { label: "Proyectos activos", value: projectCount ?? 0, href: "/app/projects" },
    { label: "Tareas abiertas", value: openTaskCount ?? 0, href: "/app/projects" },
    { label: "Entregables a aprobar", value: pendingApprovalCount ?? 0, href: "/app/projects" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-300"
          >
            <p className="text-2xl font-semibold text-neutral-900">{c.value}</p>
            <p className="text-sm text-neutral-500">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
        Este es el MVP del panel interno. El Kanban, el Gantt, el time tracking y los
        dashboards de Meta/Google Ads se van a ir agregando en las próximas fases —
        por ahora podés crear clientes, proyectos y tareas, y usar el portal de cliente.
      </div>
    </div>
  );
}
