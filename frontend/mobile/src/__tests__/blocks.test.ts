import { voicePeers } from "../lib/blocks";

const p = (id: string, blocked?: boolean) => ({ id, displayName: id, blocked }) as never;

test("engelli kişi ve kişinin kendisi sesli sohbet eşleşmesinden düşer", () => {
  expect(voicePeers([p("me"), p("a"), p("b", true)], "me").map((x) => x.id)).toEqual(["a"]);
});

test("engel bilgisi yoksa (alan opsiyonel) kimse düşmez", () => {
  expect(voicePeers([p("me"), p("a"), p("b")], "me").map((x) => x.id)).toEqual(["a", "b"]);
});
