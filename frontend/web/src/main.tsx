import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { setSignedOutHandler } from "./lib/api";
import "./i18n";
import { useAuthStore } from "./store/authStore";
import { useConfigStore } from "./store/configStore";
import "./styles/app.css";

// Kesici oturumu bitirdiğinde mağaza anon'a düşer; yönlendirme rota koruyucularından gelir.
setSignedOutHandler(() => useAuthStore.getState().signedOut());

void useAuthStore.getState().load();
void useConfigStore.getState().load();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
