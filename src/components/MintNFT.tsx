// src/components/MintNFT.tsx
import React, { useState, useEffect, useCallback, FC } from "react";
import { useAddress, useNetwork, useContract, useContractWrite } from "@thirdweb-dev/react";
import { ethers } from "ethers";

// Configuration
const NFT_CONTRACT_ADDRESS = "0x914B1339944D48236738424e2dBDBB72A212B2F5";
const OPTIMISM_CHAIN_ID = 10;

// NFT Options
const NFT_OPTIONS = {
  A: {
    image: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
    name: "The Noise Police Neighbor",
    description: "Your uptight neighbor with a decibel meter and a vendetta against fun."
  },
  B: {
    image: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
    name: "The Mean Girlfriend",
    description: "She says your music is 'too loud' and 'embarrassing'."
  },
  C: {
    image: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
    name: "The Jerk Bar Owner",
    description: "He cut your set short for 'being too experimental'."
  }
} as const;

type NFTChoice = keyof typeof NFT_OPTIONS;

/**
 * Generate a unique NFT name based on wallet address
 */
function generateUniqueName(address: string): string {
  if (!address) return "Anonymous";
  const shortAddress = address.slice(-6);
  const nameOptions = [
    `Wanderer ${shortAddress}`,
    `Explorer ${shortAddress}`,
    `Voyager ${shortAddress}`,
    `Seeker ${shortAddress}`,
    `Traveler ${shortAddress}`,
  ];
  const sumOfChars = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const nameIndex = Math.abs(sumOfChars) % nameOptions.length;
  return `Don't Kill the Jam: ${nameOptions[nameIndex]}`;
}

/**
 * Create base64-encoded metadata URI for the NFT
 */
function createMetadataURI(metadata: any): string {
  const encodedMetadata = Buffer.from(JSON.stringify(metadata)).toString("base64");
  return `data:application/json;base64,${encodedMetadata}`;
}

const MintNFT: FC = () => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();
  const { contract } = useContract(NFT_CONTRACT_ADDRESS);
  const { mutateAsync: mintTo } = useContractWrite(contract, "mintTo(address,string,uint256,string)");

  // Local state
  const [selectedNFT, setSelectedNFT] = useState<NFTChoice | null>(null);
  const [isOnOptimism, setIsOnOptimism] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  // Check if wallet is on Optimism
  useEffect(() => {
    const checkNetwork = async () => {
      if (!(window as any).ethereum) {
        setNetworkError("No wallet detected");
        return;
      }

      try {
        const chainIdHex = await (window as any).ethereum.request({ method: "eth_chainId" });
        const chainId = parseInt(chainIdHex as string, 16);
        setIsOnOptimism(chainId === OPTIMISM_CHAIN_ID);

        if (chainId !== OPTIMISM_CHAIN_ID) {
          setNetworkError("Switch to Optimism");
        } else {
          setNetworkError("");
        }
      } catch (error) {
        console.error("Error checking network:", error);
        setIsOnOptimism(false);
        setNetworkError("Can't verify network");
      }
    };

    if (address) {
      checkNetwork();
    }
  }, [address]);

  // Handle network switching
  const handleSwitchNetwork = async () => {
    if (!switchNetwork) {
      setNetworkError("Switch to Optimism in your wallet");
      return;
    }

    try {
      await switchNetwork(OPTIMISM_CHAIN_ID);
      setIsOnOptimism(true);
      setNetworkError("");
    } catch (error) {
      console.error("Failed to switch network:", error);
      setNetworkError("Failed to switch network");
    }
  };

  // Create metadata for the NFT
  const createNFTMetadata = useCallback(() => {
    if (!address || !selectedNFT) return null;

    const metadata = {
      name: generateUniqueName(address),
      description: NFT_OPTIONS[selectedNFT].description,
      image: NFT_OPTIONS[selectedNFT].image,
      attributes: [
        { trait_type: "Jam Killer", value: NFT_OPTIONS[selectedNFT].name }
      ],
    };

    return metadata;
  }, [address, selectedNFT]);

  // Main mint function
  const handleMint = useCallback(async () => {
    if (!address || !contract || !selectedNFT || isMinting) {
      setErrorMessage(
        !address
          ? "Connect your wallet"
          : !contract
          ? "Contract not loaded"
          : !selectedNFT
          ? "Select an NFT to mint"
          : "Mint already in progress"
      );
      setMintStatus("error");
      return;
    }

    setMintStatus("pending");
    setIsMinting(true);
    setErrorMessage("");

    try {
      // Create metadata
      const metadata = createNFTMetadata();
      if (!metadata) {
        throw new Error("Failed to create metadata");
      }

      // Create the token URI
      const tokenURI = createMetadataURI(metadata);

      // Default mint fee
      const fee = ethers.utils.parseEther("0.001");

      console.log("Minting NFT with:", {
        address,
        selectedNFT,
      });

      // Execute mint transaction
      const tx = await contract.call(
        "mintTo",
        [address, tokenURI, 0, ""],
        { value: fee }
      );

      console.log("Mint transaction:", tx);
      setTxHash(tx.receipt.transactionHash);
      setMintStatus("success");
    } catch (error: any) {
      console.error("Mint error:", error);
      const msg = error.message || "Minting failed";
      setErrorMessage(
        msg.includes("cancelled")
          ? "Transaction cancelled by user"
          : msg.includes("rejected")
          ? "Transaction rejected by wallet"
          : msg.includes("insufficient")
          ? "Not enough ETH for mint"
          : msg.includes("revert")
          ? "Contract rejected transaction"
          : msg
      );
      setMintStatus("error");
    } finally {
      setIsMinting(false);
    }
  }, [address, contract, selectedNFT, isMinting, createNFTMetadata]);

  return (
    <div className="mint-nft-container">
      {mintStatus !== "idle" && (
        <div className={`mint-status ${mintStatus}`}>
          {mintStatus === "pending" && <p>Minting your NFT...</p>}
          {mintStatus === "success" && (
            <div>
              <p>NFT minted successfully! 🎉</p>
              {txHash && (
                <a
                  href={`https://optimistic.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Etherscan
                </a>
              )}
            </div>
          )}
          {mintStatus === "error" && (
            <div>
              <p>Mint failed:</p>
              <p>{errorMessage}</p>
            </div>
          )}
        </div>
      )}

      {mintStatus === "idle" && (
        <>
          {!address && <p>Connect your wallet to mint.</p>}
          {address && !isOnOptimism && (
            <div>
              <p>You must be on Optimism to mint</p>
              <button onClick={handleSwitchNetwork}>
                Switch to Optimism
              </button>
              {networkError && <p>{networkError}</p>}
            </div>
          )}
        </>
      )}

      {address && isOnOptimism && !selectedNFT && (
        <div className="nft-selection">
          <h3>Choose Your Jam Killer!</h3>
          <div className="nft-options">
            {Object.entries(NFT_OPTIONS).map(([key, option]) => (
              <div
                key={key}
                className="nft-option"
                onClick={() => setSelectedNFT(key as NFTChoice)}
              >
                <img src={option.image} alt={option.name} />
                <h4>{option.name}</h4>
                <p>{option.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedNFT && (
        <div className="selected-nft">
          <img src={NFT_OPTIONS[selectedNFT].image} alt={NFT_OPTIONS[selectedNFT].name} />
          <h4>{NFT_OPTIONS[selectedNFT].name}</h4>
          <p>{NFT_OPTIONS[selectedNFT].description}</p>
          <button
            onClick={handleMint}
            disabled={!address || !isOnOptimism || isMinting}
            className={`mint-button ${mintStatus === "success" ? "success" : ""}`}
          >
            {mintStatus === "pending"
              ? "Minting..."
              : mintStatus === "success"
              ? "Minted!"
              : "Mint NFT"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MintNFT;