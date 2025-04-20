import React, { useState, useEffect, useCallback, FC } from "react";
import {
  useAddress,
  useNetwork,
  useContract,
  useContractRead,
  useContractWrite,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { Optimism } from "@thirdweb-dev/chains";
import "./MintNFT.css";

const NFT_CONTRACT_ADDRESS = "0x60b1Aed47EDA9f1E7E72b42A584bAEc7aFbd539B";
const OPTIMISM_CHAIN_ID = 10;

// Minimal ABI for minting
const NFT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "tokenURI",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "mojo",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "narr",
        "type": "string"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const NFT_OPTIONS = {
  A: {
    image:
      "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
    name: "The Noise Police Neighbor",
    description: "Your uptight neighbor with a decibel meter and a vendetta against fun.",
  },
  B: {
    image:
      "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
    name: "The Mean Girlfriend",
    description: "She says your music is 'too loud' and 'embarrassing'.",
  },
  C: {
    image:
      "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
    name: "The Jerk Bar Owner",
    description: "He cut your set short for 'being too experimental'.",
  },
} as const;
type NFTChoice = keyof typeof NFT_OPTIONS;

function createMetadataURI(meta: any): string {
  return (
    "data:application/json;base64," +
    Buffer.from(JSON.stringify(meta)).toString("base64")
  );
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

const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  nftDetails,
  isLoading
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

const MintNFT: FC = () => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();
  const { contract, isLoading: contractLoading } = useContract(NFT_CONTRACT_ADDRESS, NFT_ABI);
  const { data: mintFee } = useContractRead(contract, "mintFee");
  const { mutateAsync: mint } = useContractWrite(contract, "mint");

  const [selected, setSelected] = useState<NFTChoice | null>(null);
  const [fee, setFee] = useState<string>("0");
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [onOptimism, setOnOptimism] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Update fee when mintFee changes
  useEffect(() => {
    if (mintFee) {
      try {
        setFee(ethers.utils.formatEther(mintFee));
      } catch {
        setErrorMsg("Failed to parse mint fee");
        setStatus("error");
      }
    }
  }, [mintFee]);

  // Check if on Optimism network
  useEffect(() => {
    if (!address || !(window as any).ethereum) {
      setNetworkError("No wallet detected");
      return;
    }
    (window as any).ethereum
      .request({ method: "eth_chainId" })
      .then((hex: string) => {
        const chainId = parseInt(hex, 16);
        setOnOptimism(chainId === OPTIMISM_CHAIN_ID);
        setNetworkError(chainId === OPTIMISM_CHAIN_ID ? "" : "Please switch to Optimism");
      })
      .catch(() => setNetworkError("Failed to verify network"));
  }, [address]);

  // Switch to Optimism network
  const switchToOptimism = async () => {
    if (!switchNetwork) {
      setNetworkError("No wallet provider detected");
      return;
    }
    try {
      await switchNetwork(OPTIMISM_CHAIN_ID);
      setOnOptimism(true);
      setNetworkError("");
    } catch (err) {
      setNetworkError("Failed to switch to Optimism");
      setStatus("error");
    }
  };

  // Build NFT metadata
  const buildMetadata = useCallback(() => {
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
    if (!contract) {
      setErrorMsg("Contract not initialized");
      setStatus("error");
      return;
    }
    if (!address) {
      setErrorMsg("Please connect your wallet");
      setStatus("error");
      return;
    }
    if (!onOptimism) {
      setErrorMsg("Please switch to Optimism network");
      setStatus("error");
      await switchToOptimism();
      return;
    }
    if (!selected) {
      setErrorMsg("No NFT selected");
      setStatus("error");
      return;
    }
    if (!mintFee) {
      setErrorMsg("Mint fee not loaded");
      setStatus("error");
      return;
    }

    setIsMinting(true);
    setStatus("pending");
    setErrorMsg("");

    try {
      const metadata = buildMetadata();
      if (!metadata) {
        throw new Error("Failed to build metadata");
      }
      const tokenURI = createMetadataURI(metadata);
      const mojoScore = BigInt(metadata.attributes.find(attr => attr.trait_type === "Mojo Score")?.value || "0");
      const narrative = metadata.attributes.find(attr => attr.trait_type === "Narrative")?.value?.toString() || "";

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
      let errorMessage = "Minting failed";
      if (err.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for mint fee";
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
  }, [address, onOptimism, selected, mintFee, mint, contract, buildMetadata]);

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

      {contractLoading && <p>Loading contract...</p>}

      {status !== "idle" && !contractLoading && (
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

      {status === "idle" && !contractLoading && (
        <>
          {!address && <p>Please connect your wallet</p>}

          {address && !onOptimism && (
            <div>
              <p>{networkError}</p>
              <button onClick={switchToOptimism}>Switch to Optimism</button>
            </div>
          )}

          {address && onOptimism && !selected && (
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