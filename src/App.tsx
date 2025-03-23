import React from "react";
import "./App.css";
import { useContract, useAddress, ConnectWallet } from "@thirdweb-dev/react";
import NarrativeBuilder from "./components/NarrativeBuilder";

interface AppProps {
  contract: any;
}

function App({ contract }: AppProps) {
  const address = useAddress();

  return (
    <div className="app">
      <header>
        <h1>Jam Killer Story</h1>
        {!address ? (
          <ConnectWallet />
        ) : (
          <div className="wallet-info">
            <p>Connected: {address}</p>
          </div>
        )}
      </header>
      <main>
        {address ? (
          <div>
            <NarrativeBuilder />
          </div>
        ) : (
          <div className="connect-prompt">
            <p>Please connect your wallet to continue</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
