// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Optimism } from "@thirdweb-dev/chains";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId="e24d90c806dc62cef0745af3ddd76314"
      activeChain="optimism"
      supportedChains={[Optimism]}
    >
      <App />
    </ThirdwebProvider>
  </React.StrictMode>
);
