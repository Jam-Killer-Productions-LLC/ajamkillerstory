// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Optimism } from "@thirdweb-dev/chains";

// ThirdWeb credentials
const clientId = "e24d90c806dc62cef0745af3ddd76314";
const secretKey = "4bbviBUxwjnNm09i_eWEOdysB0wIxEkKdO84s2BzMtqGWbYOWFtu6q6fb1oUICv5cKps6esnbkyRHTceh_0cYg";

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
