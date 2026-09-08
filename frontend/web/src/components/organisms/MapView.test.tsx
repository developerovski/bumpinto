import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import { trackMapInstance } from "../../lib/maps";
import MapView from "./MapView";

// `load()` gerçek ağa gitmesin — hiç çözülmeyen söz, "config gelmeden" testini ebediyen bekletir
// (bu testte zaten mikro görev sonuna kadar beklenmiyor).
vi.mock("../../lib/api", () => ({ api: { getConfig: vi.fn(() => new Promise(() => {})) } }));

vi.mock("../../lib/maps", () => ({
  mapsConfigured: () => false,
  loadMaps: () => Promise.reject(new Error("no key")),
  trackMapInstance: vi.fn(),
  MAP_ID: "test-map",
}));

// Testte kullanılan sahte harita/işaretçi şekli — gerçek maplibre-gl tiplerinden BAĞIMSIZ
// (mock ile gerçek kütüphane arasındaki tip uçurumunu köprülemeye çalışmıyoruz).
type FakeMlMapType = {
  options: { style: string; center: [number, number]; zoom: number };
  easeTo: ReturnType<typeof vi.fn>;
  jumpTo: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  addSource: ReturnType<typeof vi.fn>;
  addLayer: ReturnType<typeof vi.fn>;
  getSource: ReturnType<typeof vi.fn>;
  getLayer: ReturnType<typeof vi.fn>;
  removeLayer: ReturnType<typeof vi.fn>;
  removeSource: ReturnType<typeof vi.fn>;
  cameraForBounds: ReturnType<typeof vi.fn>;
  fire: (type: string, ...args: unknown[]) => void;
};
type FakeMarkerType = {
  element: HTMLElement;
  lngLat: [number, number] | null;
  addToCalls: number;
  removed: boolean;
};

const { mapInstances, markerInstances } = vi.hoisted(() => ({
  mapInstances: [] as FakeMlMapType[],
  markerInstances: [] as FakeMarkerType[],
}));

vi.mock("maplibre-gl", () => {
  class FakeMlMap {
    options: Record<string, unknown>;
    listeners: Record<string, Array<(...a: unknown[]) => void>> = {};
    sources = new Set<string>();
    layers = new Set<string>();
    easeTo = vi.fn();
    jumpTo = vi.fn();
    remove = vi.fn();
    resize = vi.fn();
    addSource = vi.fn((id: string) => {
      this.sources.add(id);
    });
    addLayer = vi.fn((layer: { id: string }) => {
      this.layers.add(layer.id);
    });
    getLayer = vi.fn((id: string) => (this.layers.has(id) ? {} : undefined));
    removeLayer = vi.fn((id: string) => {
      this.layers.delete(id);
    });
    removeSource = vi.fn((id: string) => {
      this.sources.delete(id);
    });
    getSource = vi.fn((id: string) => (this.sources.has(id) ? { setData: vi.fn() } : undefined));
    cameraForBounds = vi.fn(() => ({ center: { lat: 51.5, lng: 5.4 }, zoom: 12 }));
    constructor(options: Record<string, unknown>) {
      this.options = options;
      mapInstances.push(this as unknown as FakeMlMapType);
    }
    on(type: string, cb: (...a: unknown[]) => void) {
      (this.listeners[type] ??= []).push(cb);
      return this;
    }
    fire(type: string, ...args: unknown[]) {
      (this.listeners[type] ?? []).forEach((cb) => cb(...args));
    }
  }

  class FakeMarker {
    element: HTMLElement;
    lngLat: [number, number] | null = null;
    addToCalls = 0;
    removed = false;
    constructor(opts: { element: HTMLElement }) {
      this.element = opts.element;
      markerInstances.push(this as unknown as FakeMarkerType);
    }
    setLngLat(ll: [number, number]) {
      this.lngLat = ll;
      return this;
    }
    addTo() {
      this.addToCalls += 1;
      return this;
    }
    remove() {
      this.removed = true;
      return this;
    }
  }

  const api = { Map: FakeMlMap, Marker: FakeMarker };
  return { default: api, Map: FakeMlMap, Marker: FakeMarker };
});

const MAPLIBRE_CONFIG: AppConfig = {
  mapEngine: "maplibre",
  tiles: { styleUrl: "https://tiles.test/style.json" },
  sources: [],
};
const GOOGLE_CONFIG: AppConfig = {
  mapEngine: "google",
  tiles: { styleUrl: "https://unused/style" },
  sources: [],
};

const participants = [
  { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.7, lng: 5.3 } },
];
const venues = [
  { id: "v1", name: "Adil Kahve", rating: 4.0, priceLevel: 2, lat: 51.44, lng: 5.47, deckOrder: 0 },
  { id: "v2", name: "Puanlı Kahve", rating: 4.8, priceLevel: 1, lat: 51.5, lng: 5.4, deckOrder: 1 },
];
const midpoint = { lat: 51.5, lng: 5.5 };

describe("MapView", () => {
  afterEach(() => {
    resetConfig();
    mapInstances.length = 0;
    markerInstances.length = 0;
    vi.mocked(trackMapInstance).mockClear();
  });

  it("config gelmeden yükleniyor notu basar, hiçbir motor kurulmaz", () => {
    render(<MapView participants={[]} venues={[]} midpoint={null} radiusKm={null} />);
    expect(screen.getByText("Harita yükleniyor…")).toBeInTheDocument();
    expect(mapInstances).toHaveLength(0);
  });

  it("google motoru: anahtar yokken yapılandırma notu basar, MapLibre paketi kurulmaz", async () => {
    useConfigStore.setState({ config: GOOGLE_CONFIG });
    render(<MapView participants={[]} venues={[]} midpoint={null} radiusKm={null} caption="Orta nokta" />);
    expect(await screen.findByText("Harita bu ortamda yapılandırılmadı.")).toBeInTheDocument();
    expect(screen.getByText("Orta nokta")).toBeInTheDocument();
    expect(mapInstances).toHaveLength(0);
  });

  it("maplibre: config stiliyle harita kurar, load sonrası pinler + çember + easeTo, örnek sayacına dokunmaz", async () => {
    useConfigStore.setState({ config: MAPLIBRE_CONFIG });
    render(<MapView participants={participants} venues={venues} midpoint={midpoint} radiusKm={4} />);
    // `findByTestId("mapview")` Suspense fallback'inde de eşleşir (o da MapFrame kullanır) —
    // gerçek motorun kurulduğunu yalnız örnek listesi kanıtlar.
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(0));
    const instance = mapInstances[mapInstances.length - 1];
    expect(instance.options.style).toBe(MAPLIBRE_CONFIG.tiles.styleUrl);
    act(() => instance.fire("load"));

    expect(markerInstances).toHaveLength(3); // 1 katılımcı + 2 mekan
    expect(instance.addSource).toHaveBeenCalled();
    expect(instance.easeTo).toHaveBeenCalled();
    expect(trackMapInstance).not.toHaveBeenCalled();
  });

  it("maplibre: seçili mekana [lng, lat] sırasıyla zoom 15 yaklaşır; pine tıklayınca onSelectVenue", async () => {
    useConfigStore.setState({ config: MAPLIBRE_CONFIG });
    const onSelectVenue = vi.fn();
    const { rerender } = render(
      <MapView participants={participants} venues={venues} midpoint={midpoint} radiusKm={4} onSelectVenue={onSelectVenue} />,
    );
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(0));
    const instance = mapInstances[mapInstances.length - 1];
    act(() => instance.fire("load"));

    // sıra: katılımcı(1), mekan v1(2), mekan v2(3) — v1'in işaretçi öğesine tıkla
    fireEvent.click(markerInstances[1].element);
    expect(onSelectVenue).toHaveBeenCalledWith("v1");

    rerender(
      <MapView
        participants={participants}
        venues={venues}
        midpoint={midpoint}
        radiusKm={4}
        onSelectVenue={onSelectVenue}
        selectedVenueId="v1"
      />,
    );
    expect(instance.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [5.47, 51.44], zoom: 15 }));
  });

  it("maplibre: unmount haritayı yıkar; stil hatasında motor uyarısı basar", async () => {
    useConfigStore.setState({ config: MAPLIBRE_CONFIG });
    const { unmount } = render(<MapView participants={[]} venues={[]} midpoint={null} radiusKm={null} />);
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(0));
    const first = mapInstances[mapInstances.length - 1];
    unmount();
    expect(first.remove).toHaveBeenCalled();

    const secondRender = render(<MapView participants={[]} venues={[]} midpoint={null} radiusKm={null} />);
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(1));
    const second = mapInstances[mapInstances.length - 1];
    act(() => second.fire("error"));
    expect(await screen.findByText("Harita şu an yüklenemedi.")).toBeInTheDocument();
    secondRender.unmount();

    // load'dan SONRAKİ hata (tek tile 404 gibi) çalışan haritayı düşürmez
    render(<MapView participants={[]} venues={[]} midpoint={null} radiusKm={null} />);
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(2));
    const third = mapInstances[mapInstances.length - 1];
    act(() => third.fire("load"));
    act(() => third.fire("error"));
    expect(screen.queryByText("Harita şu an yüklenemedi.")).not.toBeInTheDocument();
  });
});
