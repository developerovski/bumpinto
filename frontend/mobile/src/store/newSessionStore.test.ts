import { useNewSessionStore as store } from "./newSessionStore";

/**
 * Store İNCE bir sarmalayıcıdır (K-M8): kuralların kendisi `@bumpinto/shared`
 * `newSession.ts`'te saf fonksiyon olarak yaşar ve orada ayrıca test edilir. Buradaki testler
 * sarmalayıcının o kuralları DOĞRU BAĞLADIĞINI doğrular — aritmetiği tekrar sınamaz.
 */
const s = () => store.getState();
beforeEach(() => store.setState(store.getInitialState()));

test("3 etkinlik sınırı: 4. seçim yok sayılır, seçili olan kapanabilir", () => {
  (["COFFEE", "FOOD", "CINEMA"] as const).forEach((a) => s().toggleActivity(a));
  s().toggleActivity("BAR");
  expect(s().activityTypes).toEqual(["COFFEE", "FOOD", "CINEMA"]);
  expect(s().isActivityLocked("BAR")).toBe(true);
  s().toggleActivity("FOOD");
  expect(s().activityTypes).toEqual(["COFFEE", "CINEMA"]);
});

test("çapalı oturumda kendi konumu zorunlu değil, çapa zorunlu", () => {
  s().toggleActivity("COFFEE");
  s().setVenueMode("ANCHOR");
  expect(s().canSubmit()).toBe(false);
  s().setAnchor({ lat: 51.44, lng: 5.47, label: "Kleine Berg" });
  expect(s().canSubmit()).toBe(true);
  expect(s().toRequest("Mehmet").originPresent).toBe(false);
});

test("orta noktalı oturumda kendi konumu zorunlu", () => {
  s().toggleActivity("COFFEE");
  expect(s().canSubmit()).toBe(false);
  s().setOrigin({ lat: 51.7, lng: 5.3, label: "'s-Hertogenbosch" });
  expect(s().canSubmit()).toBe(true);
  expect(s().toRequest("Mehmet").originPresent).toBe(true);
});

/* Moddan çıkınca çapa DA düşer (web `newSessionStore` ile aynı kural): ekranda görünmeyen bir
   çapa istekte kalırsa "orta nokta seçtim ama Eindhoven geldi" olur. */
test("MIDPOINT'e dönünce çapa temizlenir", () => {
  s().toggleActivity("COFFEE");
  s().setVenueMode("ANCHOR");
  s().setAnchor({ lat: 51.44, lng: 5.47, label: "Kleine Berg" });
  s().setVenueMode("MIDPOINT");
  expect(s().anchor).toBeNull();
  expect(s().toRequest("Mehmet").anchor).toBeUndefined();
});
