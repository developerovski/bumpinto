/* Shim: coğrafi aritmetiğin tamamı `@bumpinto/shared`'ta (mobil de AYNI kaynağı okur —
   M-7'de taşındı). Backend `GeoMath` ile birebir kalması iki istemci için de tek yerden
   sağlanır. */
export {
  DEFAULT_MAP_CENTER,
  approx,
  centroid,
  distanceMeters,
  roundedMidpointMeters,
  type LatLng,
} from "@bumpinto/shared";
