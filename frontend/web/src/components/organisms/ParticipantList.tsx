import { Fragment } from "react";
import type { ParticipantDto } from "@bumpinto/shared";
import { Progress } from "../atoms";
import ParticipantRow from "../molecules/ParticipantRow";
import { useSessionStore } from "../../store/sessionStore";

/** Artboard W2 · "Kimler var" üst başlığı + sayaç + ilerleme çubuğu + satır kartı. */
export default function ParticipantList({ participants }: { participants: ParticipantDto[] }) {
  const self = useSessionStore((s) => s.self);
  const ready = participants.filter((p) => p.hasLocation).length;
  return (
    <>
      <div className="field">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <p className="a-ov">Kimler var</p>
          <span className="muted tab">
            {ready} / {participants.length} hazır
          </span>
        </div>
        <Progress value={ready / Math.max(participants.length, 1)} />
      </div>
      <div className="a-card" style={{ padding: "2px 0" }}>
        {participants.map((p, i) => {
          // Kimlik yalnız katılım yanıtındaki participantId'den — ad eşlemesi yapılmaz.
          const isSelf = !!self?.id && self.id === p.id;
          return (
            <Fragment key={p.id ?? i}>
              {i > 0 && <div className="a-dv" style={{ margin: "0 16px" }} />}
              <ParticipantRow
                participant={p}
                index={i}
                isSelf={isSelf}
                locationLabel={isSelf ? self?.locationLabel : null}
              />
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
