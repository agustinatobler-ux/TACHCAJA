import Link from "next/link";
import { getCurrentProfile } from "@/lib/session";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-neutral-900">Agencia</span>
          <nav className="flex gap-4 text-sm text-neutral-600">
            <Link href="/app" className="hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/app/clients" className="hover:text-neutral-900">
              Clientes
            </Link>
            <Link href="/app/projects" className="hover:text-neutral-900">
              Proyectos
            </Link>
            <Link href="/app/ads" className="hover:text-neutral-900">
              Publicidad
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <span>{session?.profile.full_name || session?.profile.role}</span>
          <form action="/auth/signout" method="post">
            <button className="rounded-md border border-neutral-200 px-2 py-1 hover:bg-neutral-100">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
