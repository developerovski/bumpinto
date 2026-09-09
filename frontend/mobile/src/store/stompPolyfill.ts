/* @stomp/stompjs çerçeveyi TextEncoder/TextDecoder ile kodlar; Hermes'te ikisi de olmayabilir.
   Yan etkili modül: `liveChannel`ın İLK import'u olarak durur — kanal kurulmadan önce
   global'ler yerinde olmalı, yoksa ilk çerçevede patlar. */
import { TextDecoder, TextEncoder } from "text-encoding";

const g = globalThis as unknown as { TextEncoder?: unknown; TextDecoder?: unknown };

g.TextEncoder ??= TextEncoder;
g.TextDecoder ??= TextDecoder;
