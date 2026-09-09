import { createBumpintoApi, createHttp } from "@bumpinto/shared";
import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL ?? "";

/**
 * Yenileme KESİCİSİZ ham axios ile atılır. Aynı örnekten çağrılsaydı yenilemenin kendi 401'i
 * kesiciye geri düşerdi; `http.ts`teki URL kapısı bunu zaten engelliyor ama ayrı bir örnek
 * kullanmak döngüyü YAPISAL olarak imkânsız kılar.
 *
 * Gövde yok: yenileme jetonu HttpOnly çerezde (`path=/api/auth`), JS onu hiç görmez.
 */
const refresh = () =>
  axios
    .post(`${baseUrl}/api/auth/refresh`, {}, {
      withCredentials: true,
      headers: { "X-Client": "web" },
    })
    .then(() => true)
    .catch(() => false);

let signedOutHandler: () => void = () => {};

/**
 * Kök (`main.tsx`) kaydeder. `authStore` buradan İTHAL EDİLMEZ: authStore zaten `api`yi ithal
 * ediyor, ters yön döngü olurdu — ve bu modülü ithal eden her testin `vi.mock("../lib/api")`
 * ikizini bozardı.
 */
export const setSignedOutHandler = (fn: () => void) => {
  signedOutHandler = fn;
};

export const api = createBumpintoApi(
  createHttp(baseUrl, { refresh, onSignedOut: () => signedOutHandler() }, {
    withCredentials: true, // HttpOnly cookie'ler her istekte taşınır
    client: "web",         // backend token'ı cookie'ye yazar, body'ye koymaz
  }),
);
