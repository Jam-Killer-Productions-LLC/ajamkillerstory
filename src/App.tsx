import React from "react";
import "./App.css";
import { useContract, useAddress, ConnectWallet } from "@thirdweb-dev/react";
import NarrativeBuilder, { NarrativeFinalizedData } from "./components/NarrativeBuilder";

interface AppProps {
  contract: any;
}

function App({ contract }: AppProps) {
  const address = useAddress();

  const handleNarrativeFinalized = (data: NarrativeFinalizedData) => {
    console.log('Narrative finalized:', data);
    // Here you can handle the finalized narrative data
    // For example, you might want to mint an NFT or update the UI
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <img 
            src="https://bafybeia4ayg7qsaryrzk7ntixd4ombsevup74vyxcyat3v5ph2xu6yx2le.ipfs.dweb.link?filename=dktjlogo.png" 
            alt="Jam Killer Logo" 
            className="logo"
          />
          <img 
            src="https://bafybeidoee5nze6v6s2kkddecqmtiahp7he4jcu3au7ju3e5z43ihpfp3a.ipfs.dweb.link?filename=dontkillthejamheadernew.png" 
            alt="Jam Killer Header" 
            className="header-image"
          />
        </div>
        <div className="header-right">
          {!address ? (
            <ConnectWallet className="connect-button" />
          ) : (
            <div className="wallet-info">
              <p className="wallet-address">{address.slice(0, 6)}...{address.slice(-4)}</p>
            </div>
          )}
        </div>
      </header>
      <main className="main-content">
        {address ? (
          <div className="narrative-section">
            <NarrativeBuilder onNarrativeFinalized={handleNarrativeFinalized} />
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
