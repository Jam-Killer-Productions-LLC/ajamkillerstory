// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { createThirdwebClient, getContract } from "thirdweb";
import { optimism } from "thirdweb/chains";

// ThirdWeb client ID
const clientId = "e24d90c806dc62cef0745af3ddd76314";

// Create the thirdweb client using your clientId
const client = createThirdwebClient({
  clientId: clientId,
});

// Connect to your NFT contract on Optimism
const contract = getContract({
  client,
  chain: optimism,
  address: "0xfA2A3452D86A9447e361205DFf29B1DD441f1821",
});

// Use the already created client in ThirdwebProvider
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={clientId}
      activeChain="optimism"
    >
      <App contract={contract} />
    </ThirdwebProvider>
  </React.StrictMode>
);
