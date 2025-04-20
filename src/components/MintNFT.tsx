// src/components/MintNFT.tsx
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
import NFT_ABI from "./contractAbi.json"; // Import the ABI

const NFT_CONTRACT_ADDRESS = "0x60b1Aed47EDA9f1E7E72b42A584bAEc7aFbd539B";
const OPTIMISM_CHAIN_ID = 10;

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
  const { contract } = useContract(NFT_CONTRACT_ADDRESS, NFT_ABI);
  const { data: mintFee } = useContractRead(contract, "mintFee");
  const { mutateAsync: mint } = useContractWrite(contract, "mint");

  const [selected, setSelected] = useState<NFTChoice | null>(null);
  const [fee, setFee] = useState<string>("0");
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [onOpt, setOnOpt] = useState(false);
  const [netErr, setNetErr] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Update fee when mintFee changes
  useEffect(() => {
    if (mintFee) {
      setFee(ethers.utils.formatEther(mintFee.toString()));
    }
  }, [mintFee]);

  // 🔄 check if we're on Optimism
  useEffect(() => {
    if (!address || !(window as any).ethereum) return;
    (window as any).ethereum
      .request({ method: "eth_chainId" })
      .then((hex: string) => {
        const id = parseInt(hex, 16);
        setOnOpt(id === OPTIMISM_CHAIN_ID);
        setNetErr(id === OPTIMISM_CHAIN_ID ? "" : "Switch to Optimism");
      })
      .catch(() => setNetErr("Can't verify network"));
  }, [address]);

  const switchNet = async () => {
    if (!switchNetwork) return setNetErr("Install a Web3 wallet");
    try {
      await switchNetwork(OPTIMISM_CHAIN_ID);
      setOnOpt(true);
      setNetErr("");
    } catch {
      setNetErr("Failed to switch");
    }
  };

  const buildMeta = useCallback(() => {
    if (!selected) return null;
    const mojo = Math.floor(Math.random() * 101);
    const narrs = ["douche", "Canoe", "Miser"];
    const narr = narrs[Math.floor(Math.random() * narrs.length)];
    return {
      name: `Don't Kill the Jam: ${NFT_OPTIONS[selected].name}`,
      description: NFT_OPTIONS[selected].description,
      image: NFT_OPTIONS[selected].image,
      attributes: [
        { trait_type: "Jam Killer", value: NFT_OPTIONS[selected].name },
        { trait_type: "Mojo Score", value: mojo.toString() },
        { trait_type: "Narrative", value: narr },
      ],
    };
  }, [selected]);

  const handleMintClick = useCallback(() => {
    if (!selected || !fee) return;

    setShowConfirmation(true);
  }, [selected, fee]);

  const handleConfirmMint = useCallback(async () => {
    if (!address) {
      setErrorMsg("Connect your wallet");
      return setStatus("error");
    }
    if (!onOpt) {
      await switchNet();
      setErrorMsg("Switch to Optimism");
      return setStatus("error");
    }
    if (!selected) {
      setErrorMsg("Select an NFT to mint");
      return setStatus("error");
    }
    if (!mintFee) {
      setErrorMsg("Mint fee not loaded");
      return setStatus("error");
    }

    setStatus("pending");
    setErrorMsg("");
    setIsMinting(true);

    try {
      const metadata = buildMeta();
      if (!metadata) throw new Error("Failed to build metadata");
      const tokenURI = createMetadataURI(metadata);

      // Keep as string instead of BigInt to avoid serialization issues
      const mojoScoreStr = metadata.attributes.find(attr => attr.trait_type === "Mojo Score")?.value || "0";
      const narrative = metadata.attributes.find(attr => attr.trait_type === "Narrative")?.value?.toString() || "";

      console.log("Minting with params:", {
        tokenURI,
        mojoScore: mojoScoreStr,
        narrative,
        mintFee: mintFee.toString()
      });

      const tx = await mint({
        args: [address, tokenURI, mojoScoreStr, narrative], // Added 'address'
        overrides: { value: mintFee }
      });

      if (!tx?.receipt?.transactionHash) {
        throw new Error("Mint failed - no transaction hash");
      }

      setTxHash(tx.receipt.transactionHash);
      setStatus("success");
      setSelected(null);
      setShowConfirmation(false);
    } catch (err: any) {
      console.error("Mint error:", err);
      let errorMessage = "Mint failed";

      if (err.message?.includes("CALL_EXCEPTION")) {
        errorMessage = "Transaction reverted. Please ensure you have enough ETH and the correct network.";
        if (err.reason) {
          errorMessage += ` Reason: ${err.reason}`;
        }
      } else if (err.message?.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setErrorMsg(errorMessage);
      setStatus("error");
    } finally {
      setIsMinting(false);
    }
  }, [onOpt, selected, buildMeta, mint, mintFee]);

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

      {status !== "idle" ? (
        <div className={`mint-status ${status}`}>
          {status === "pending" && <p>Minting…</p>}
          {status === "success" && (
            <>
              <p>Success! 🎉</p>
              <a
                href={`https://optimistic.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            </>
          )}
          {status === "error" && <p>Failed: {errorMsg}</p>}
        </div>
      ) : (
        <>
          {!address && <p>Connect your wallet</p>}

          {address && !onOpt && (
            <div>
              <p>{netErr}</p>
              <button onClick={switchNet}>Switch to Optimism</button>
            </div>
          )}

          {address && onOpt && !selected && (
            <div className="nft-options">
              <h3>Pick one (Fee: {fee} ETH)</h3>
              {Object.entries(NFT_OPTIONS).map(([key, opt]) => (
                <div
                  key={key}
                  onClick={() =>
                    setSelected(key as NFTChoice)
                  }
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
                alt="preview"
              />
              <h4>{NFT_OPTIONS[selected].name}</h4>
              <p>{NFT_OPTIONS[selected].description}</p>
              <button
                className="mint-button"
                onClick={handleMintClick}
                disabled={isMinting}
              >
                {isMinting ? "Minting…" : "Mint NFT"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MintNFT;
