import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import MapPicker from "./MapPicker";

vi.mock("../../lib/maps", () => ({
  mapsConfigured: vi.fn(() => false),
  loadMaps: vi.fn(),
  trackMapInstance: vi.fn(),
  MAP_ID: "test-map",
}));
vi.mock("../../lib/geocode", () => ({
  reverseGeocode: vi.fn(() => Promise.resolve("Eindhoven")),
}));

import { loadMaps, mapsConfigured } from "../../lib/maps";
import { reverseGeocode } from "../../lib/geocode";

// Testte kullanılan sahte harita/işaretçi şekli — MapView.test.tsx'teki desenin aynısı.
type FakeMlMapType = {
  options: { style: string; center: [number, number]; zoom: number };
  easeTo: ReturnType<typeof vi.fn>;
  jumpTo: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  fire: (type: string, ...args: unknown[]) => void;
};
type FakeMarkerType = {
  element: HTMLElement;
  lngLat: [number, number];
  addToCalls: number;
  removed: boolean;
  setLngLat: (ll: [number, number]) => FakeMarkerType;
  getLngLat: () => { lat: number; lng: number };
  fire: (type: string, ...args: unknown[]) => void;
};

const { mapInstances, markerInstances } = vi.hoisted(() => ({
  mapInstances: [] as FakeMlMapType[],
  markerInstances: [] as FakeMarkerType[],
}));

vi.mock("maplibre-gl", () => {
  class FakeMlMap {
    options: Record<string, unknown>;
    listeners: Record<string, Array<(...a: unknown[]) => void>> = {};
    easeTo = vi.fn();
    jumpTo = vi.fn();
    remove = vi.fn();
    resize = vi.fn();
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
    lngLat: [number, number] = [0, 0];
    listeners: Record<string, Array<(...a: unknown[]) => void>> = {};
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
    getLngLat() {
      return { lng: this.lngLat[0], lat: this.lngLat[1] };
    }
    addTo() {
      this.addToCalls += 1;
      return this;
    }
    remove() {
      this.removed = true;
      return this;
    }
    on(type: string, cb: (...a: unknown[]) => void) {
      (this.listeners[type] ??= []).push(cb);
      return this;
    }
    fire(type: string, ...args: unknown[]) {
      (this.listeners[type] ?? []).forEach((cb) => cb(...args));
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

describe("MapPicker", () => {
  afterEach(() => {
    resetConfig();
    mapInstances.length = 0;
    markerInstances.length = 0;
  });

  it("google: Maps yapılandırılmamışsa açıklama basar", async () => {
    useConfigStore.setState({ config: GOOGLE_CONFIG });
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByText("Harita bu ortamda yapılandırılmadı.")).toBeInTheDocument();
    expect(mapInstances).toHaveLength(0);
  });

  it("maplibre: config stiliyle harita ve sürüklenebilir pin, tıklayınca pin taşınır, onay ters geocode ile noktayı verir", async () => {
    useConfigStore.setState({ config: MAPLIBRE_CONFIG });
    const onPick = vi.fn();
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={onPick} onCancel={vi.fn()} />);
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(0));
    const instance = mapInstances[mapInstances.length - 1];
    expect(instance.options.style).toBe(MAPLIBRE_CONFIG.tiles.styleUrl);
    expect(markerInstances).toHaveLength(1);
    expect(markerInstances[0].lngLat).toEqual([4.9, 52.3]);

    act(() => instance.fire("load"));
    act(() => instance.fire("click", { lngLat: { lng: 5.47, lat: 51.44 } }));
    expect(markerInstances[0].lngLat).toEqual([5.47, 51.44]);

    fireEvent.click(await screen.findByRole("button", { name: "Burayı seç" }));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ lat: 51.44, lng: 5.47, label: "Eindhoven" }));
    expect(reverseGeocode).toHaveBeenCalledWith(51.44, 5.47);
  });

  it("maplibre: yüklenmeden hata → onay kilitli ve uyarı; yüklendikten sonraki hata haritayı düşürmez", async () => {
    useConfigStore.setState({ config: MAPLIBRE_CONFIG });
    const { unmount } = render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(0));
    const first = mapInstances[mapInstances.length - 1];
    act(() => first.fire("error"));
    expect(await screen.findByText("Harita şu an yüklenemedi.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Burayı seç" })).toBeDisabled();
    unmount();

    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(mapInstances.length).toBeGreaterThan(1));
    const second = mapInstances[mapInstances.length - 1];
    act(() => second.fire("load"));
    act(() => second.fire("error"));
    expect(screen.queryByText("Harita şu an yüklenemedi.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Burayı seç" })).toBeEnabled();
  });

  it("iptal onCancel çağırır", async () => {
    useConfigStore.setState({ config: MAPLIBRE_CONFIG });
    const onCancel = vi.fn();
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(await screen.findByRole("button", { name: "İptal" }));
    expect(onCancel).toHaveBeenCalled();
  });

  /** Harita YUKLENEMEZSE onay dugmesi etkin kalmamali — Google dalinda korunan eski davranis
      (bkz. MapPicker.google.tsx, degistirilmedi). */
  it("google: harita yüklenemezse 'Burayı seç' kilitlenir", async () => {
    useConfigStore.setState({ config: GOOGLE_CONFIG });
    vi.mocked(mapsConfigured).mockReturnValue(true);
    vi.mocked(loadMaps).mockRejectedValueOnce(new Error("no key"));
    try {
      render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
      await waitFor(() => expect(screen.getByRole("button", { name: "Burayı seç" })).toBeDisabled());
    } finally {
      vi.mocked(mapsConfigured).mockReturnValue(false);
    }
  });
});
