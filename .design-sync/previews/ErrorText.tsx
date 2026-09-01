import { ErrorText } from "@bumpinto/web";

/** W1 · adres çözümlenemedi — form alanının altındaki `role="alert"` satırı. */
export function Geocode() {
  return <ErrorText>Bu adres bulunamadı — yakındaki bir şehri dene.</ErrorText>;
}

/** W2 · bekleme odasında konum güncelleme hatası. */
export function UpdateFailed() {
  return <ErrorText>Konum güncellenemedi — tekrar dene.</ErrorText>;
}
