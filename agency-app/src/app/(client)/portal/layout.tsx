import Link from "next/link";
import { getCurrentProfile } from "@/lib/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <Link href="/portal" className="font-semibold text-neutral-900">
          Portal de cliente
        </Link>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <span>{session?.profile.full_name}</span>
          <form action="/auth/signout" method="post">
            <button className="rounded-md border border-neutral-200 px-2 py-1 hover:bg-neutral-100">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
