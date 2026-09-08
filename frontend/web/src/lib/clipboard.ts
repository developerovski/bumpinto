/* Panoya kopyalama — TEK uygulama (ShareButton ve InviteCard paylaşır). `navigator.clipboard`
   yalnız güvenli bağlamda (https / localhost) vardır; LAN üzerinden http ile açılan sayfada
   undefined gelir. O yüzden `execCommand` yedeği şart: yoksa düğme hiçbir şey yapmaz ve
   kullanıcı linke ulaşamaz. */
export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // güvensiz bağlam ya da izin reddi — aşağıdaki yola düş
  }
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}
