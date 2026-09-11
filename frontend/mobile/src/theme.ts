/**
 * v3 tasarım token'ları — kaynak: Design System v2 §06–§10 + mobil v3 artboard ölçüleri.
 *
 * Ekran ve bileşen dosyalarında ÇIPLAK renk/ölçü yazılmaz; her değer buradan okunur.
 * Yeni bir değer gerekiyorsa önce buraya eklenir (tek kaynak kuralı).
 */

export const colors = {
  paper: "#FFFBF6",
  card: "#FFFFFF",
  ink: "#27203B",
  ink2: "#6E6584",
  ink3: "#A79DB8",
  flame: "#FD3E6B",
  flame2: "#FF7854",
  flameDeep: "#DE2456",
  flameWash: "#FFE9EF",
  sun: "#FFC93C",
  highlight: "#FFE27A",
  grass: "#0B7A44",
  grassWash: "#DFF5E9",
  /** Yeşil yıkamalı kutuların kenarı (`.safe`, `.rq.ok`, `.loc.on`). */
  grassLine: "#BFE5CF",
  /** Fotoğrafsız kart monogramı (`.pho-mono`). */
  photoMono: "rgba(255,255,255,0.5)",
  /** Fotoğraf köşesindeki tür etiketi zemini — artboard %35'i WCAG için koyulaştırıldı (W-18). */
  photoTag: "rgba(39,32,59,0.62)",
  violet: "#6234D8",
  violetWash: "#F1EBFF",
  amber: "#A96A0B",
  amberWash: "#FFF1D6",
  amberInk: "#7E4F06",
  line: "#F1E8DE",
  line2: "#E4D9CD",
  /** DS `--line-in` — kesikli boş koltuk noktası, kilitli rozet kenarı (Keşfet POC). */
  lineIn: "#91869C",
  /** Nötr kum zemin — kilitli rozet ikonu, bekleyen yuvalar (`#F4EEE6`). */
  sand: "#F4EEE6",
  track: "#EFE7DC",
} as const;

export const fonts = {
  head: "BricolageGrotesque_800ExtraBold",
  headBold: "BricolageGrotesque_700Bold",
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_600SemiBold",
  hand: "Caveat_600SemiBold",
} as const;

export const radius = { card: 22, sheet: 28, input: 16, thumb: 12, pill: 999 } as const;

export const space = { screenX: 18, cardX: 16, rowY: 11, gap: 12 } as const;

export const size = { button: 52, buttonSm: 44, iconButton: 40, avatar: 36, thumb: 56 } as const;

export const shadow = {
  s1: {
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  s2: {
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const;

/** Fotoğrafsız kart gradyanları (GUIDE pA/pB/pC/pD) — deste sırasıyla döner. */
export const photoTints = [
  ["#FFD3DE", "#FFB8A6"],
  ["#D9E7FF", "#BFD3FF"],
  ["#DCF3E4", "#B8E3C8"],
  ["#FFE08A", "#F2A93B"],
] as const;
