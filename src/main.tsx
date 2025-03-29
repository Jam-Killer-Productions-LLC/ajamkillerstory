// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { createThirdwebClient, getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// ThirdWeb client ID
const clientId = "e24d90c806dc62cef0745af3ddd76314";

// Create a custom chain definition for Optimism
const optimismChain = defineChain({
  id: 10,
  name: "Optimism",
  rpc: "https://mainnet.optimism.io",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
});

// Create the thirdweb client using your clientId
const client = createThirdwebClient({
  clientId: clientId,
});

// Connect to your NFT contract on Optimism
const contract = getContract({
  client,
  chain: optimismChain,
  address: "0xfA2A3452D86A9447e361205DFf29B1DD441f1821",
});

// Use the already created client in ThirdwebProvider
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThirdwebProvider 
      clientId={clientId}
      activeChain={10}
    >
      <App contract={contract} />
    </ThirdwebProvider>
  </React.StrictMode>
);
