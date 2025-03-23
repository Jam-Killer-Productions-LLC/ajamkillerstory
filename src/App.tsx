import React, { useState } from "react";
import "./App.css";
import { useContract, useAddress, useConnect, ThirdwebProvider, ConnectWallet } from "@thirdweb-dev/react";

interface MintNFTProps {
  metadataUri: string;
  narrativePath: string;
  contract: any;
}

const MintNFT: React.FC<MintNFTProps> = ({
  metadataUri,
  narrativePath,
  contract,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const address = useAddress();
  const { contract: nftContract } = useContract(contract);

  const handleMint = async () => {
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
    <ThirdwebProvider clientId="e24d90c806dc62cef0745af3ddd76314">
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
          <h2>Mint NFT</h2>
          {!address ? (
            <ConnectWallet 
              className="connect-button"
              theme="dark"
              btnTitle="Connect Wallet"
            />
          ) : (
            <div className="mint-section">
              <p className="wallet-address">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
              <button 
                className="mint-button"
                onClick={handleMint}
                disabled={isLoading}
              >
                {isLoading ? "Minting..." : "Mint NFT"}
              </button>
            </div>
          )}
        </main>
      </div>
    </ThirdwebProvider>
  );
};

export default MintNFT;
