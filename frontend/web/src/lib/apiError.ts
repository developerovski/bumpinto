/** Backend'in ApiError kodu (`ApiExceptionHandler`: `record ApiError(String error)`).
    Kod, prose değil: istemci dile bağlı olmayan bir şeye dallanabilsin diye — `invalid_token`
    bu deseni zaten kuruyor. TEK yerde durur ki çağrı yerleri axios'un gövde şeklini ayrı ayrı
    bilmek zorunda kalmasın; aynı bilgiyi iki yere kopyalamak onları ayrıştırırdı. */
export function apiErrorCode(e: unknown): string | null {
  const code = (e as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof code === "string" ? code : null;
}
