import React, { useState, useCallback } from "react";
import {
  useAddress,
  useNetwork,
  useContract,
  useContractRead,
  useContractWrite,
  useSwitchChain,
} from "@thirdweb-dev/react";
import { Optimism } from "@thirdweb-dev/chains";
import { ethers } from "ethers";
import "./MintNFT.css";

// Contract configuration
const NFT_CONTRACT_ADDRESS = "0x60b1Aed47EDA9f1E7E72b42A584bAEc7aFbd539B";
const OPTIMISM_CHAIN_ID = 10;

// NFT options with metadata
const NFT_OPTIONS = {
  A: {
    image: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
    name: "The Noise Police Neighbor",
    description: "Your uptight neighbor with a decibel meter and a vendetta against fun.",
  },
  B: {
    image: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
    name: "The Mean Girlfriend",
    description: "She says your music is 'too loud' and 'embarrassing'.",
  },
  C: {
    image: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
    name: "The Jerk Bar Owner",
    description: "He cut your set short for 'being too experimental'.",
  },
} as const;

type NFTChoice = keyof typeof NFT_OPTIONS;

// Types
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nftDetails: {
    name: string;
    description: string;
    image: string;
    fee: string;
  } | null;
  isLoading: boolean;
}

// Helper function to create metadata URI
const createMetadataURI = (metadata: NFTMetadata): string => {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;
};

// Confirmation Modal Component
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  nftDetails,
  isLoading,
}) => {
  if (!isOpen || !nftDetails) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirm NFT Mint</h3>
        <div className="nft-preview">
          <img src={nftDetails.image} alt={nftDetails.name} className="preview-image" />
          <h4>{nftDetails.name}</h4>
          <p>{nftDetails.description}</p>
        </div>
        <div className="transaction-details">
          <h4>Transaction Details</h4>
          <p>Mint Fee: {nftDetails.fee} ETH</p>
          <p>Network: Optimism</p>
          <p>Contract: {`${NFT_CONTRACT_ADDRESS.slice(0, 6)}...${NFT_CONTRACT_ADDRESS.slice(-4)}`}</p>
        </div>
        <div className="modal-actions">
          <button 
            className="confirm-button" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Confirming..." : "Confirm & Sign"}
          </button>
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Main MintNFT Component
const MintNFT: React.FC = () => {
  // ThirdWeb hooks
  const address = useAddress();
  const { contract } = useContract(NFT_CONTRACT_ADDRESS);
  const { data: mintFee } = useContractRead(contract, "mintFee");
  const { mutateAsync: mint } = useContractWrite(contract, "mint");
  const switchChain = useSwitchChain();

  // State management
  const [selected, setSelected] = useState<NFTChoice | null>(null);
  const [fee, setFee] = useState<string>("0");
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Update fee when mintFee changes
  React.useEffect(() => {
    if (mintFee) {
      try {
        setFee(ethers.utils.formatEther(mintFee));
      } catch (error) {
        setErrorMsg("Failed to parse mint fee");
        setStatus("error");
      }
    }
  }, [mintFee]);

  // Build NFT metadata
  const buildMetadata = useCallback((): NFTMetadata | null => {
    if (!selected) return null;
    
    const mojo = Math.floor(Math.random() * 101);
    const narratives = ["Douche", "Canoe", "Miser"];
    const narrative = narratives[Math.floor(Math.random() * narratives.length)];
    
    return {
      name: `Don't Kill the Jam: ${NFT_OPTIONS[selected].name}`,
      description: NFT_OPTIONS[selected].description,
      image: NFT_OPTIONS[selected].image,
      attributes: [
        { trait_type: "Jam Killer", value: NFT_OPTIONS[selected].name },
        { trait_type: "Mojo Score", value: mojo.toString() },
        { trait_type: "Narrative", value: narrative },
      ],
    };
  }, [selected]);

  // Handle mint button click
  const handleMintClick = useCallback(() => {
    if (!selected || !fee) {
      setErrorMsg("Select an NFT and ensure fee is loaded");
      setStatus("error");
      return;
    }
    setShowConfirmation(true);
  }, [selected, fee]);

  // Handle confirmed mint action
  const handleConfirmMint = useCallback(async () => {
    if (!contract || !address || !selected || !mintFee) {
      setErrorMsg("Missing required data for minting");
      setStatus("error");
      return;
    }

    try {
      // Switch to Optimism if needed
      await switchChain(OPTIMISM_CHAIN_ID);

      setIsMinting(true);
      setStatus("pending");
      setErrorMsg("");

      const metadata = buildMetadata();
      if (!metadata) {
        throw new Error("Failed to build metadata");
      }

      const tokenURI = createMetadataURI(metadata);
      const mojoScore = metadata.attributes.find(attr => attr.trait_type === "Mojo Score")?.value || "0";
      const narrative = metadata.attributes.find(attr => attr.trait_type === "Narrative")?.value || "";

      const tx = await mint({
        args: [address, tokenURI, mojoScore, narrative],
        overrides: { value: mintFee },
      });

      if (!tx?.receipt?.transactionHash) {
        throw new Error("No transaction hash returned");
      }

      setTxHash(tx.receipt.transactionHash);
      setStatus("success");
      setSelected(null);
      setShowConfirmation(false);
    } catch (err: any) {
      console.error("Minting error:", err);
      let errorMessage = "Minting failed";
      
      if (err.code === 4001 || err.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for mint fee or gas";
      } else if (err.reason) {
        errorMessage = `Contract error: ${err.reason}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setErrorMsg(errorMessage);
      setStatus("error");
    } finally {
      setIsMinting(false);
    }
  }, [address, selected, mintFee, mint, contract, buildMetadata, switchChain]);

  return (
    <div className="mint-nft-container">
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmMint}
        nftDetails={selected ? {
          name: NFT_OPTIONS[selected].name,
          description: NFT_OPTIONS[selected].description,
          image: NFT_OPTIONS[selected].image,
          fee
        } : null}
        isLoading={isMinting}
      />

      {status !== "idle" && (
        <div className={`mint-status ${status}`}>
          {status === "pending" && <p>Minting in progress...</p>}
          {status === "success" && (
            <>
              <p>Minted successfully! 🎉</p>
              <a
                href={`https://optimistic.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View Transaction
              </a>
            </>
          )}
          {status === "error" && <p>Error: {errorMsg}</p>}
        </div>
      )}

      {status === "idle" && (
        <>
          {!selected && (
            <div className="nft-options">
              <h3>Select an NFT (Mint Fee: {fee} ETH)</h3>
              {Object.entries(NFT_OPTIONS).map(([key, opt]) => (
                <div
                  key={key}
                  onClick={() => setSelected(key as NFTChoice)}
                  className="nft-option"
                >
                  <img src={opt.image} alt={opt.name} />
                  <h4>{opt.name}</h4>
                </div>
              ))}
            </div>
          )}
          {selected && (
            <div className="selected-nft">
              <img
                src={NFT_OPTIONS[selected].image}
                alt={NFT_OPTIONS[selected].name}
              />
              <h4>{NFT_OPTIONS[selected].name}</h4>
              <p>{NFT_OPTIONS[selected].description}</p>
              <button
                className="mint-button"
                onClick={handleMintClick}
                disabled={isMinting || !mintFee}
              >
                {isMinting ? "Minting..." : "Mint NFT"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MintNFT;