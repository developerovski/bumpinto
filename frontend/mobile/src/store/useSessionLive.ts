import { useEffect } from "react";
import { AppState } from "react-native";

import { useNetStore } from "./netStore";
import { useSessionStore } from "./sessionStore";

/**
 * Oturum görünümünü CANLI tutar — 3 sn'de bir `GET /api/sessions/{slug}`.
 *
 * STOMP köprüsü M-6'da gelir (`liveChannel` RN portu); o zamana kadar polling. Uygulama arka
 * plandayken ya da çevrimdışıyken İSTEK ATILMAZ: kullanıcı ekrana bakmıyorken veri/pil
 * harcamanın karşılığı yok, ve çevrimdışı her tik bir hata üretirdi.
 *
 * Öne dönüşte HEMEN bir tik atılır: kullanıcı uygulamayı açtığında 3 sn eski bir ekrana
 * bakmasın.
 */
export function useSessionLive(slug: string | undefined) {
  const loadView = useSessionStore((s) => s.loadView);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const tick = () => {
      if (!alive || AppState.currentState !== "active" || !useNetStore.getState().online) return;
      void loadView(slug);
    };
    tick();
    const id = setInterval(tick, 3000);
    const sub = AppState.addEventListener("change", (state) => state === "active" && tick());
    return () => {
      alive = false;
      clearInterval(id);
      sub.remove();
    };
  }, [slug, loadView]);
}
