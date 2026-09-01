import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar, Badge } from "../atoms";

/** Artboard W2 · .srow — avatar + ad/alt satır + tek rozet.
    Rozet önceliği artboard'dan: kuran satırında "Kuran", diğerlerinde hazır/bekliyor. */
export default function ParticipantRow(props: {
  participant: ParticipantDto;
  index: number;
  isSelf?: boolean;
  /** Yalnız kendi satırında dolu — ParticipantDto konum etiketi taşımıyor. */
  locationLabel?: string | null;
}) {
  const p = props.participant;
  const subtitle = p.hasLocation ? props.locationLabel : "Konum bekleniyor…";
  return (
    <div className="row" style={{ padding: "13px 16px", gap: 12 }}>
      <Avatar
        name={p.displayName ?? "?"}
        index={props.index}
        ring={p.hasLocation}
        waiting={!p.hasLocation}
      />
      <div className="field" style={{ flex: 1, gap: 2 }}>
        <span className="label" style={{ fontWeight: 700 }}>
          {p.displayName}
          {props.isSelf && <span className="a-m2"> (sen)</span>}
        </span>
        {subtitle && <span className="muted">{subtitle}</span>}
      </div>
      {p.host ? (
        <Badge tone="neutral">Kuran</Badge>
      ) : (
        <Badge tone={p.hasLocation ? "grass" : "amber"}>
          {p.hasLocation ? "Hazır" : "Bekliyor"}
        </Badge>
      )}
    </div>
  );
}
