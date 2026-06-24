"use client";

import { useState } from "react";
import { uploadStatement } from "@/lib/api";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      await uploadStatement(file, password || undefined);
      onSuccess();
      onClose();
      setFile(null);
      setPassword("");
    } catch (e: any) {
      setError(e.message || "Error al procesar el archivo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-xl font-semibold">Subir Extracto Bancario</h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm text-[var(--muted)]">
            Archivo PDF (Extracto Bancolombia)
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-sm file:text-white"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm text-[var(--muted)]">
            Contraseña del PDF (generalmente tu cédula)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Número de cédula"
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--card-border)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Subir"}
          </button>
        </div>
      </div>
    </div>
  );
}
