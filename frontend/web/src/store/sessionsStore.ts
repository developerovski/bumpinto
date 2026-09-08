import type { SessionSummaryDto } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";

type State = {
  open: SessionSummaryDto[]; past: SessionSummaryDto[];
  /** Sunucu geçmiş listesini kesti (20 satır tavanı) — not satırı bunu SÖYLER, sessizce yutmaz. */
  pastTruncated: boolean;
  loaded: boolean; error: boolean;
  load: () => Promise<void>;
  reset: () => void;
};

export const useSessionsStore = create<State>((set) => ({
  open: [], past: [], pastTruncated: false, loaded: false, error: false,
  load: async () => {
    set({ error: false });
    try {
      const r = await api.listSessions();
      set({ open: r.open ?? [], past: r.past ?? [], pastTruncated: r.pastTruncated === true, loaded: true });
    } catch {
      set({ error: true, loaded: true });
    }
  },
  reset: () => set({ open: [], past: [], pastTruncated: false, loaded: false, error: false }),
}));
