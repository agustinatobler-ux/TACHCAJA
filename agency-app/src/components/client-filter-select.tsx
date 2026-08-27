"use client";

import { useRouter } from "next/navigation";

export function ClientFilterSelect({
  clients,
  value,
  sort,
}: {
  clients: { id: string; name: string }[];
  value: string;
  sort: string;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={value}
      onChange={(e) => {
        const params = new URLSearchParams({ sort });
        if (e.target.value) params.set("client", e.target.value);
        router.push(`/app/ads/creatives?${params.toString()}`);
      }}
      className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
    >
      <option value="">Todos los clientes</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
