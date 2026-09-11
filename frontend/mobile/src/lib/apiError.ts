/**
 * Backend `ApiError` gövdesi (`record ApiError(String error)`) — web `lib/apiError.ts` ile aynı.
 * Kod kimi uçta makine kodu (`open_plan_seat_request_required`), kimi uçta düz metindir
 * (`SeatRequests`: "plan full", "already requested"…); çağıran ikisine de aynı yoldan dallanır.
 */
export function apiErrorCode(e: unknown): string | null {
  const code = (e as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof code === "string" ? code : null;
}

/** HTTP durum kodu; ağ hatasında `undefined` (yanıt yok). */
export const statusOf = (e: unknown): number | undefined =>
  (e as { response?: { status?: number } })?.response?.status;
