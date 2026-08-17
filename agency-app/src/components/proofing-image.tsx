"use client";

import { useState, useTransition } from "react";
import { addProofingNote } from "@/app/actions/attachments";

interface Annotation {
  id: string;
  x_pct: number;
  y_pct: number;
  body: string;
}

export function ProofingImage({
  attachmentId,
  projectId,
  src,
  annotations,
}: {
  attachmentId: string;
  projectId: string;
  src: string;
  annotations: Annotation[];
}) {
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPending({ x, y });
    setNote("");
  }

  function submitNote() {
    if (!pending || !note.trim()) return;
    const formData = new FormData();
    formData.set("attachment_id", attachmentId);
    formData.set("project_id", projectId);
    formData.set("body", note);
    formData.set("x_pct", String(pending.x));
    formData.set("y_pct", String(pending.y));
    startTransition(async () => {
      await addProofingNote(formData);
      setPending(null);
      setNote("");
    });
  }

  return (
    <div className="relative inline-block max-w-full cursor-crosshair" onClick={handleClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-h-96 max-w-full rounded-lg border border-neutral-200" />
      {annotations.map((a) => (
        <span
          key={a.id}
          title={a.body}
          style={{ left: `${a.x_pct}%`, top: `${a.y_pct}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
        >
          ●
        </span>
      ))}
      {pending && (
        <div
          style={{ left: `${pending.x}%`, top: `${pending.y}%` }}
          className="absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Corrección en este punto…"
            className="w-full resize-none rounded-md border border-neutral-300 p-1.5 text-xs outline-none"
            rows={2}
          />
          <div className="mt-1 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={submitNote}
              className="rounded bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-800"
            >
              Comentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
