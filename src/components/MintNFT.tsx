// src/components/MintNFT.tsx
import React, { useState, useEffect, useCallback, FC } from "react";
import { useAddress, useNetwork, useContract, useContractWrite } from "@thirdweb-dev/react";
import { SmartContract } from "@thirdweb-dev/sdk";
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
  
  // Local state
  const [selectedNFT, setSelectedNFT] = useState<NFTChoice | null>(null);
  const [isOnOptimism, setIsOnOptimism] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [currentMintFee, setCurrentMintFee] = useState<string>("0");

  // Get current mint fee
  useEffect(() => {
    const getMintFee = async () => {
      if (contract) {
        try {
          const fee = await contract.call("mintFee");
          setCurrentMintFee(ethers.utils.formatEther(fee));
        } catch (error) {
          console.error("Error getting mint fee:", error);
        }
      }
    };
    getMintFee();
  }, [contract]);

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
    if (!selectedNFT) return null;

    const metadata = {
      name: NFT_OPTIONS[selectedNFT].name,
      description: NFT_OPTIONS[selectedNFT].description,
      image: NFT_OPTIONS[selectedNFT].image,
      attributes: [
        { trait_type: "Jam Killer", value: NFT_OPTIONS[selectedNFT].name }
      ],
    };

    return metadata;
  }, [selectedNFT]);

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

      // Generate random mojo score (0-100)
      const mojoScore = Math.floor(Math.random() * 101);

      // Select random narrative word
      const narrativeWords = ["douche", "Canoe", "Miser"];
      const narrative = narrativeWords[Math.floor(Math.random() * narrativeWords.length)];

      console.log("Minting NFT with:", {
        address,
        selectedNFT,
        mojoScore,
        narrative,
        tokenURI,
        mintFee: currentMintFee
      });

      // Call the contract directly
      const tx = await contract.call(
        "mintTo",
        [
          address, // to
          tokenURI, // _tokenURI
          mojoScore, // _mojoScore
          narrative // _narrative
        ],
        {
          value: ethers.utils.parseEther(currentMintFee), // Use current mint fee
          gasLimit: 300000
        }
      );

      // Add additional validation
      if (!tx || !tx.receipt) {
        throw new Error("Transaction failed - no receipt received");
      }

      console.log("Mint transaction:", {
        hash: tx.receipt.transactionHash,
        status: tx.receipt.status,
        gasUsed: tx.receipt.gasUsed,
        blockNumber: tx.receipt.blockNumber
      });

      if (tx.receipt.status === 0) {
        throw new Error("Transaction reverted");
      }

      if (tx.receipt.transactionHash) {
        setTxHash(tx.receipt.transactionHash);
        setMintStatus("success");
        // Reset selected NFT after successful mint
        setSelectedNFT(null);
      } else {
        throw new Error("No transaction hash found");
      }
    } catch (error: any) {
      console.error("Mint error:", error);
      const msg = error.message || "Minting failed";
      setErrorMessage(
        msg.includes("cancelled")
          ? "Transaction cancelled by user"
          : msg.includes("rejected")
          ? "Transaction rejected by wallet"
          : msg.includes("insufficient")
          ? `Not enough ETH for mint (fee: ${currentMintFee} ETH)`
          : msg.includes("revert")
          ? "Contract rejected transaction"
          : msg.includes("gas")
          ? "Transaction failed due to gas issues"
          : msg.includes("multiple")
          ? "Transaction attempted to mint multiple NFTs"
          : msg
      );
      setMintStatus("error");
    } finally {
      setIsMinting(false);
    }
  }, [address, contract, selectedNFT, isMinting, createNFTMetadata, currentMintFee]);

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
          <p>Mint Fee: {currentMintFee} ETH</p>
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
          <p>Mint Fee: {currentMintFee} ETH</p>
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