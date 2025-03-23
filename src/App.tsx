import React, { useState } from "react";
import "./App.css";
import { useContract, useAddress, ConnectWallet } from "@thirdweb-dev/react";
import NarrativeBuilder from "./components/NarrativeBuilder";

interface AppProps {
  contract: any;
}

const App: React.FC<AppProps> = ({ contract }) => {
  const [metadataUri, setMetadataUri] = useState<string>("");
  const [narrativePath, setNarrativePath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const address = useAddress();
  const { contract: nftContract } = useContract(contract);

  const handleNarrativeFinalized = (data: { metadataUri: string; narrativePath: string }) => {
    setMetadataUri(data.metadataUri);
    setNarrativePath(data.narrativePath);
  };

  const handleMint = async () => {
    if (!metadataUri || !narrativePath) {
      alert("Please complete the narrative before minting");
      return;
    }

    try {
      setIsLoading(true);
      if (!nftContract) {
        throw new Error("Contract not initialized");
      }
      
      const tx = await nftContract.erc721.mint({
        metadata: {
          name: "Don't Kill the Jam NFT",
          description: "A unique NFT from Don't Kill the Jam",
          image: metadataUri,
        },
      });
      
      console.log("Minted successfully!", tx);
      alert("NFT minted successfully!");
    } catch (error) {
      console.error("Error minting NFT:", error);
      alert("Failed to mint NFT. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <img 
          src="https://bafybeihh4spo2t3ijximaydz4xnj6ymodfr5wopvso3msjvclw6pm4jnj4.ipfs.dweb.link?filename=Don'tKilltheJamheader.jpg"
          alt="Header"
          className="header-image"
        />
        <img 
          src="https://bafybeiddum77flw2fi5roohkckknerriibbfziraxvt5y723fp6r6fqvfe.ipfs.dweb.link?filename=Don't%20Kill%20the%20Jam%20Girls%20with%20Text.png"
          alt="Logo"
          className="logo"
        />
      </header>
      <main className="main-content">
        {!address ? (
          <div className="connect-section">
            <h2>Connect Your Wallet</h2>
            <ConnectWallet 
              className="connect-button"
              theme="dark"
              btnTitle="Connect Wallet"
            />
          </div>
        ) : (
          <div className="content-section">
            <div className="wallet-info">
              <p className="wallet-address">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
            </div>
            
            <div className="narrative-section">
              <h2>Create Your Story</h2>
              <NarrativeBuilder onNarrativeFinalized={handleNarrativeFinalized} />
            </div>

            {metadataUri && narrativePath && (
              <div className="mint-section">
                <h2>Mint Your NFT</h2>
                <button 
                  className="mint-button"
                  onClick={handleMint}
                  disabled={isLoading}
                >
                  {isLoading ? "Minting..." : "Mint NFT"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
