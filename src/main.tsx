// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Optimism } from "@thirdweb-dev/chains";

// ThirdWeb credentials
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
const secretKey = import.meta.env.VITE_THIRDWEB_SECRET_KEY;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={clientId}
      secretKey={secretKey}
      activeChain="optimism"
      supportedChains={[Optimism]}
    >
      <App />
    </ThirdwebProvider>
  </React.StrictMode>
);
