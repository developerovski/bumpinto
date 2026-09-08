import { create } from "zustand";

export type ToastTone = "grass" | "flame";

export type Toast = {
  id: number;
  /** i18n anahtarı — depo `t`'ye erişemez, çeviri `ToastHost`'ta yapılır. */
  messageKey: string;
  params?: Record<string, string | number>;
  tone: ToastTone;
};

type ToastState = {
  toasts: Toast[];
  push: (messageKey: string, params?: Record<string, string | number>, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

const VISIBLE_MS = 5000;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (messageKey, params, tone = "grass") => {
    // Aynı anahtar duruyorsa tekrarlama: çift olay (STOMP + poll tazelemesi) tek bildirim eder.
    if (get().toasts.some((toast) => toast.messageKey === messageKey)) return;
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, messageKey, params, tone }] });
    setTimeout(() => get().dismiss(id), VISIBLE_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));
