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

/* M-12 T1 — "Ne zaman" bağlantısı. Kurallar shared `openPlan.ts`'te (K-M8); burada yalnız
   store'un onları DOĞRU ANDA ve DOĞRU saatle çağırdığı sınanır. */
test("Şimdi: gövde pencereyi, OPEN varsayılanını ve kendi konumdan çapayı taşır; mod değişince katılım varsayılana döner", () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-09-13T10:00:00Z"));
  try {
    s().toggleActivity("COFFEE");
    s().setOrigin({ lat: 51.44, lng: 5.47, label: "Stratum" });
    s().setPlan({ when: "DATE" });
    s().setPlan({ joinPolicy: "APPROVAL" });
    s().setPlan({ when: "NOW", durationHours: 1, whereLabel: "Café Zwart" });
    expect(s().plan.joinPolicy).toBeNull();

    const r = s().toRequest("M");
    expect(r.openPlan).toEqual({
      meetAt: "2026-09-13T10:00:00.000Z",
      openUntil: "2026-09-13T11:00:00.000Z",
      capacity: 4,
      joinPolicy: "OPEN",
      audience: "PUBLIC",
    });
    expect(r.anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
    expect(r.sessionType).toBe("GROUP");
    expect(s().canSubmit()).toBe(true);

    s().setPlan({ whereLabel: "" });
    expect(s().canSubmit()).toBe(false);
    expect(s().planError()).toBe("plan.errWhereRequired");
  } finally {
    jest.useRealTimers();
  }
});

/* SOLO'nun davet linki yok → açık plan olamaz. Değişmez SETTER'larda: gövdede GROUP'a zorlamak
   (shared) Bireysel arayüzünü ekranda bırakırdı. */
test("SOLO seçilince plan Belirsiz'e döner; plan modu seçilince tür GROUP olur", () => {
  s().setPlan({ when: "DATE", joinPolicy: "OPEN" });
  s().setSessionType("SOLO");
  expect(s().plan).toMatchObject({ when: "UNSET", joinPolicy: null });
  s().setPlan({ when: "NOW" });
  expect(s().sessionType).toBe("GROUP");
});

test("geçersiz planda toRequest gizli oturuma DÜŞMEZ — hata anahtarıyla fırlatır", () => {
  s().toggleActivity("COFFEE");
  s().setOrigin({ lat: 51.44, lng: 5.47 });
  s().setPlan({ when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" });
  expect(() => s().toRequest("M")).toThrow("plan.errMeetAtPast");
});

test("Şimdi'de ANCHOR modunda kalmış eski çapa gövdeye sızmaz", () => {
  s().toggleActivity("COFFEE");
  s().setVenueMode("ANCHOR");
  s().setAnchor({ lat: 52.37, lng: 4.9, label: "Amsterdam" });
  s().setOrigin({ lat: 51.44, lng: 5.47 });
  s().setPlan({ when: "NOW", whereLabel: "Café Zwart" });
  expect(s().toRequest("M").anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
});

test("Keşfet'ten gelen tür seçimi tek türe indirir", () => {
  (["COFFEE", "FOOD"] as const).forEach((a) => s().toggleActivity(a));
  s().selectActivity("SWIM");
  expect(s().activityTypes).toEqual(["SWIM"]);
});
