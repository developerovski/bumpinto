/* Kaynak: artboard Mekanlar 1280 .hdr — katılımcı avatarları + aksiyon (Karıştır) */
import type { ReactNode } from "react";
import { Avatar } from "../atoms";

export default function AvatarRow(props: { names: string[]; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {props.names.map((name, i) => (
          <Avatar key={i} size="sm" name={name} index={i} ring />
        ))}
      </div>
      {props.children}
    </div>
  );
}
