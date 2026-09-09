import { create } from "zustand";

export type ToastTone = "grass" | "flame" | "neutral";
export type Toast = {
  id: number;
  messageKey: string;
  params?: Record<string, string | number>;
  tone: ToastTone;
};

/** Şerit kendi kendine kaybolur; kullanıcı okumaya yetişsin diye 4 sn. */
export const TOAST_MS = 4000;

let seq = 0;

/**
 * Kısa geri bildirim şeridi (P10/P17 dürtme onayı, P20 kart hatası).
 *
 * Depo `t`'ye ERİŞEMEZ: i18n anahtarını ve parametrelerini tutar, çeviriyi `ToastHost` yapar.
 * Aksi hâlde her depo bir i18n örneği taşırdı ve dil değişince bekleyen şerit eski dilde
 * kalırdı.
 */
export const useToastStore = create<{
  toasts: Toast[];
  push: (messageKey: string, params?: Record<string, string | number>, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  toasts: [],
  push: (messageKey, params, tone = "neutral") => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, messageKey, params, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), TOAST_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
