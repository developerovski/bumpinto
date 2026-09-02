import { Fragment } from "react";
import type { SessionSummaryDto } from "@bumpinto/shared";
import PastSessionRow from "../molecules/PastSessionRow";

/** Artboard W1 · geçmiş buluşmalar kartı — satırlar arası ince ayraç (bkz. ParticipantList). */
export default function PastSessionList({ rows }: { rows: SessionSummaryDto[] }) {
  return (
    <div className="rounded-card border border-line bg-card py-0.5 shadow-sh1">
      {rows.map((row, i) => (
        <Fragment key={row.slug ?? i}>
          {i > 0 && <div className="mx-4 h-px bg-line" />}
          <PastSessionRow row={row} index={i} />
        </Fragment>
      ))}
    </div>
  );
}
