# Deploy — BumpInto

Namespace `bumpinto`. Secret'ı SEN oluşturursun (değerler asla repoya girmez) — komut ve
anahtar listesi için Plan 5 Task 3 / `docs/CONFIGURATION.md` §5.

    kubectl apply -f deploy/k8s/

> Uygulama dosyasında olmayan üç ConfigMap dosyadan üretilir; `apply`'dan ÖNCE koş:
>
>     kubectl -n bumpinto create configmap osrm-prepare \
>       --from-file=prepare.sh=deploy/osrm/prepare.sh --dry-run=client -o yaml | kubectl apply -f -
>     kubectl -n bumpinto create configmap tiles-nginx \
>       --from-file=default.conf=deploy/tiles/nginx.conf --dry-run=client -o yaml | kubectl apply -f -
>     kubectl -n bumpinto create configmap tiles-style \
>       --from-file=style.json=deploy/tiles/style.json --dry-run=client -o yaml | kubectl apply -f -

---

## Açık veri servisleri (I-2)

Hepsi opsiyoneldir: `bumpinto-geo` ConfigMap'indeki ilgili anahtar boşsa backend public
Nominatim'e ve haversine tahminine düşer, `venues_open` boşsa `open` sağlayıcısı sonuç
döndürmez ve orkestratör Foursquare'de kalır. Yani sıra bozulursa ürün çöker değil, körelir.

**Önemli:** backend Deployment'ı (I-1 T3) `envFrom: - configMapRef: { name: bumpinto-geo }`
taşımak ZORUNDA — yoksa MAP/GEOCODE/OSRM env değişkenleri backend'e hiç ulaşmaz (plan5 Ek B).

### Uygulama sırası

| # | Adım | Süre | Komut |
|---|---|---|---|
| 1 | PostGIS uzantısı (bir kez, süper kullanıcı) | 1 dk | `psql "<superuser dsn>" -c 'create extension if not exists postgis'` |
| 2 | Backend V11 migration'ı (`venues_open`) | otomatik | backend açılışta Flyway |
| 3 | `geo-config.yaml` | anında | `kubectl apply -f deploy/k8s/geo-config.yaml` |
| 4 | `nominatim.yaml` | **1–3 saat** ithal (tahmini — ilk gerçek ithalde ölçülüp güncellenecek) | `kubectl apply -f deploy/k8s/nominatim.yaml` |
| 5 | `osrm-prepare` ConfigMap + `osrm.yaml` + `osrm-prepare-job.yaml` | **20–40 dk** hazırlık (tahmini) | yukarıdaki configmap komutu + `kubectl apply -f deploy/k8s/osrm.yaml -f deploy/k8s/osrm-prepare-job.yaml` |
| 6 | `osrm-refresh.yaml` | anında | `kubectl apply -f deploy/k8s/osrm-refresh.yaml` |
| 7 | `venues-open-import.yaml` + ilk manuel koşu | **~30–60 dk** (tahmini) | `kubectl -n bumpinto create job --from=cronjob/venues-open-import venues-open-manual-1` |
| 8 | (isteğe bağlı) `tiles.yaml` + PMTiles yükleme | ~15 dk | aşağıdaki "Tile yedeği" |

4 ve 5 paralel koşabilir; 7 yalnız 1–2'yi bekler.

### `osrm-prepare`'i yeniden koşma

`Job` alanları immutable; `kubectl apply` ikinci koşuda hata verir. Yeniden koşmak için:

    kubectl delete job osrm-prepare --ignore-not-found && kubectl create -f deploy/k8s/osrm-prepare-job.yaml

Not: yukarıdaki süreler plan tahminidir — bu görev küme erişimi olmadan yürütüldü (yalnız
client-side dry-run), gerçek ölçüm ve `du -sh` çıktısı ilk küme ithalinde bu tabloya işlenecek.

### Disk

| PVC | Boyut | İçerik |
|---|---|---|
| `nominatim-data` | 20Gi | Nominatim'in kendi Postgres'i (NL ≈ 15 GB) |
| `osrm-data` | 10Gi | car + bicycle + foot MLD dosyaları (≈ 6 GB) |
| `venues-open-work` | 20Gi | pbf + osm2pgsql slim tabloları (koşu sonunda düşer) |
| `tiles-data` | 5Gi | `netherlands.pmtiles` (≈ 2 GB) |

Uygulama Postgres'inde `venues_open` ≈ 2 GB. **Toplam ≈ 30 GB** (spec §17).

### Doğrulama

```bash
# Nominatim: ileri + ters
kubectl -n bumpinto run geo-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://nominatim:8080/search?q=Eindhoven&format=json&limit=1'
kubectl -n bumpinto run geo-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://nominatim:8080/reverse?lat=51.44&lon=5.47&format=json'

# OSRM: matris ucu (RoutingPort'un cagirdigi ucun aynisi)
kubectl -n bumpinto run osrm-check --rm -it --restart=Never --image=curlimages/curl:8.11.1 -- \
  curl -s 'http://osrm-car:5000/table/v1/car/5.47,51.44;5.48,51.45'
# osrm-bicycle / osrm-foot icin profil adini degistir; sureler BIRBIRINDEN FARKLI olmali

# venues_open: tur basina satir
psql "<dsn>" -c "select count(*), unnest(activity_types) from venues_open group by 2 order by 2"

# PostGIS
psql "<dsn>" -c "select postgis_full_version()"
```

`venues-open-import` log'u her koşuda tür başına Overture sayımını ve tür başına foto kapsama
yüzdesini basar — `MUSEUM|THEME_PARK|ART` üçlüsünde %40 altı, spec §5.3'teki TripAdvisor (1b)
kararının tetiğidir.

### Tile yedeği (OpenFreeMap kesintisinde)

OpenFreeMap'in SLA'sı yok (spec §16.6). Kendi PMTiles'ına geçiş:

```bash
# 1) NL kutusunu cikar (yerel makinede, ~2 GB)
pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles netherlands.pmtiles \
  --bbox=3.2,50.7,7.3,53.6

# 2) PVC'ye kopyala (yardimci pod uzerinden)
kubectl -n bumpinto apply -f deploy/k8s/tiles.yaml
kubectl -n bumpinto cp netherlands.pmtiles "$(kubectl -n bumpinto get pod -l app=tiles \
  -o jsonpath='{.items[0].metadata.name}')":/srv/tiles/netherlands.pmtiles

# 3) Ingress'te tiles.bumpinto.app -> service/tiles ekle (I-1 ingress.yaml)
# 4) Motoru cevir: TEK satir
kubectl -n bumpinto patch configmap bumpinto-geo --type merge \
  -p '{"data":{"MAP_TILES_STYLE_URL":"https://tiles.bumpinto.app/style.json"}}'
kubectl -n bumpinto rollout restart deployment/backend
```

İstemci kodu değişmez: motor `GET /api/config`'ten gelir (spec §7). Web tarafının `pmtiles://`
protokolünü kaydetmesi W-12'nin işidir. `tiles.yaml` bilerek **uygulanmadan** yazıldı — yalnız
kesinti anında devreye girer, `MAP_TILES_STYLE_URL` boşsa manifest kümede boşta durur.

### Bilinen sınırlar

- **RWO PVC:** `osrm-data`'yı hazırlık Job'ı yazar, üç Deployment salt-okur bağlar. Tek düğümlü
  kümede sorunsuz; çok düğüme geçilirse `ReadWriteMany` (NFS/Longhorn) şart.
- **Nominatim tek replica, `Recreate`:** ithal sırasında servis yok; ilk kurulumda 1–3 saat.
- **`venues-open-import` swap'i** `venues_open` yoksa bilerek patlar — önce V11.
- **GHCR imajı private ise** `venues-open-import.yaml`'daki `imagePullSecrets` yorum satırını
  açın ve önce `ghcr-pull` Secret'ı oluşturun (paket private ise).
