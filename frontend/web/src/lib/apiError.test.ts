import { describe, expect, it } from "vitest";
import { apiErrorCode } from "./apiError";

describe("apiErrorCode", () => {
  it("backend ApiError kodunu çıkarır", () => {
    expect(apiErrorCode({ response: { data: { error: "participants_too_far_apart" } } }))
      .toBe("participants_too_far_apart");
  });

  /** Ağ hatası / iptal: response yok. Dallanma bunu genel mesaja düşürmeli. */
  it("response yoksa null döner", () => {
    expect(apiErrorCode(new Error("network"))).toBeNull();
  });

  /** Gövde beklenen şekilde değilse uydurmaz — string olmayan her şey null. */
  it("error alanı string değilse null döner", () => {
    expect(apiErrorCode({ response: { data: { error: { code: 1 } } } })).toBeNull();
  });
});
