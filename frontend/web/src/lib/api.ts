import { createBumpintoApi, createHttp } from "@bumpinto/shared";

export const api = createBumpintoApi(
  createHttp(import.meta.env.VITE_API_URL ?? "", {}, {
    withCredentials: true, // HttpOnly cookie'ler her istekte taşınır
    client: "web",         // backend token'ı cookie'ye yazar, body'ye koymaz
  }),
);
