import { __resetAnalytics, applyAnalyticsConsent, setProviderLoader, track } from "../analytics";

const fake = () => ({ track: jest.fn(), shutdown: jest.fn() });

beforeEach(() => __resetAnalytics());

test("rıza yokken sağlayıcı modülü YÜKLENMEZ", () => {
  const loader = jest.fn(fake);
  setProviderLoader(loader);
  applyAnalyticsConsent(false);
  track("session_created", { sessionType: "GROUP" });
  expect(loader).not.toHaveBeenCalled();
});

test("rıza gelince sağlayıcı bir kez yüklenir; allowlist dışını (PII) düşürür", () => {
  const provider = fake();
  const loader = jest.fn(() => provider);
  setProviderLoader(loader);
  applyAnalyticsConsent(true);

  track("session_created", { sessionType: "GROUP", email: "m@x.dev", slug: "x7k2m" });
  track("deck_done", {});

  expect(loader).toHaveBeenCalledTimes(1);
  expect(provider.track).toHaveBeenNthCalledWith(1, "session_created", { sessionType: "GROUP" });
  expect(provider.track).toHaveBeenNthCalledWith(2, "deck_done", {});
});

test("rıza geri alınınca YÜKLENMİŞ sağlayıcı kapatılır ve olay akmaz", () => {
  const provider = fake();
  setProviderLoader(() => provider);
  applyAnalyticsConsent(true);
  track("session_created", {}); // sağlayıcı ancak BURADA yüklenir (tembel kapı)
  expect(provider.track).toHaveBeenCalledTimes(1);

  applyAnalyticsConsent(false);
  track("session_created", {});
  expect(provider.shutdown).toHaveBeenCalledTimes(1);
  expect(provider.track).toHaveBeenCalledTimes(1); // ikinci olay GİTMEDİ
});

test("hiç yüklenmemiş sağlayıcıyı kapatmaya çalışmak sorun çıkarmaz", () => {
  const provider = fake();
  setProviderLoader(() => provider);
  applyAnalyticsConsent(true);
  applyAnalyticsConsent(false); // olay hiç gönderilmedi → yükleyici hiç çağrılmadı
  expect(provider.shutdown).not.toHaveBeenCalled();

  __resetAnalytics();
  applyAnalyticsConsent(true);
  expect(() => track("session_created", {})).not.toThrow(); // yükleyici yok → no-op
});
