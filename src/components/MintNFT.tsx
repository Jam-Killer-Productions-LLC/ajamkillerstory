// MintNFT.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  useContractRead,
  useNetwork
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import contractAbi from "../contractAbi.json";

// Configuration Constants
const NFT_CONTRACT_ADDRESS = "0x914B1339944D48236738424e2dbdbb72a212B2F5";
const OPTIMISM_CHAIN_ID = 10;

// Allowed narrative paths and their associated image URLs
const allowedPaths = ["A", "B", "C"];
const IMAGE_URLS: { [key: string]: string } = {
  A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
  B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
  C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
};

// Helper function to calculate a mojo score based on narrative path
const calculateMojoScore = (path: string): number => {
  switch (path) {
    case "A": return 8000;
    case "B": return 7500;
    case "C": return 8500;
    default: throw new Error("Invalid narrative path");
  }
};

// Helper function to format the mint fee for display
const formatMintFee = (fee: any): string => {
  try {
    if (!fee || ethers.BigNumber.from(fee).eq(0)) return "$1.55";
    const ethValue = Number(ethers.BigNumber.from(fee).toString()) / 1e18;
    return `$${(ethValue * 2000).toFixed(2)}`;
  } catch {
    return "$1.55";
  }
};

// Props for this component:
// - metadataUri: the final, verified NFT metadata URI (IPFS or base64)
// - narrativePath: the chosen narrative path that must be one of allowedPaths
interface MintNFTProps {
  metadataUri: string;
  narrativePath: string;
}

const MintNFT: React.FC<MintNFTProps> = ({ narrativePath, metadataUri }) => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();

  // Local state variables for UI and transaction status
  const [isOnOptimism, setIsOnOptimism] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [sanitizedPath, setSanitizedPath] = useState("");
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mojoScore, setMojoScore] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [lastNonce, setLastNonce] = useState<number | null>(null);

  // Load contract using your existing logic (this should load correctly)
  const { contract } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);

  // Use contract write with an explicit signature to select the payable mintTo version
  const { mutateAsync: mintTo } = useContractWrite(
    contract,
    "mintTo(address,string,uint256,string)" // Explicit payable overload signature
  );

  // Read the current mint fee from the contract (for display and overrides)
  const { data: mintFee, isLoading: isMintFeeLoading } = useContractRead(contract, "mintFee");

  // Setup sanitized narrative and calculate mojo score (assumes narrativePath is valid)
  useEffect(() => {
    if (!narrativePath || !allowedPaths.includes(narrativePath)) {
      setErrorMessage("Invalid narrative path");
      setMintStatus("error");
      return;
    }
    setSanitizedPath(narrativePath);
    setMojoScore(calculateMojoScore(narrativePath));
  }, [narrativePath]);

  // Check that the wallet is connected to the Optimism network
  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) {
        setNetworkError("No wallet detected");
        return;
      }
      try {
        const chainIdHex: string = await window.ethereum.request({ method: "eth_chainId" });
        const chainId = parseInt(chainIdHex, 16);
        setIsOnOptimism(chainId === OPTIMISM_CHAIN_ID);
        if (chainId !== OPTIMISM_CHAIN_ID) {
          setNetworkError("Switch to Optimism");
        } else {
          setNetworkError("");
        }
      } catch {
        setIsOnOptimism(false);
        setNetworkError("Can't verify network");
      }
    };
    if (address) checkNetwork();
  }, [address]);

  // Handler to prompt a network switch if necessary
  const handleSwitchNetwork = async () => {
    if (!switchNetwork) {
      setNetworkError("Switch to Optimism in your wallet");
      return;
    }
    try {
      await switchNetwork(OPTIMISM_CHAIN_ID);
      setIsOnOptimism(true);
      setNetworkError("");
    } catch {
      setNetworkError("Failed to switch network");
    }
  };

  // Main mint function following best practices for error handling and debugging
  const handleMint = useCallback(async () => {
    // Validate prerequisites before proceeding
    if (!address || !contract || !sanitizedPath || isMinting) {
      setErrorMessage(
        !address
          ? "Connect your wallet"
          : !contract
            ? "Contract not loaded"
            : !sanitizedPath
              ? "Narrative cannot be empty"
              : "Mint already in progress"
      );
      setMintStatus("error");
      return;
    }
    if (!allowedPaths.includes(narrativePath)) {
      setErrorMessage("Invalid narrative path");
      setMintStatus("error");
      return;
    }

    setIsMinting(true);
    setMintStatus("pending");
    setErrorMessage("");

    try {
      // Use the provided verified metadataUri (assumed to be correct and minted)
      const tokenURI = metadataUri;
      if (!tokenURI.startsWith("ipfs://") && !tokenURI.startsWith("data:application/json;base64,")) {
        throw new Error("Invalid metadata format");
      }

      // Use the mint fee from the contract if available, else fallback to a hard-coded value
      const fee = (mintFee && ethers.BigNumber.from(mintFee).gt(0))
        ? mintFee
        : ethers.BigNumber.from("777000000000000");

      // Use the provider to obtain the current nonce, to help guard against duplicate submissions
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const currentNonce = await signer.getTransactionCount("pending");
      if (lastNonce !== null && currentNonce === lastNonce) {
        throw new Error("Duplicate transaction detected");
      }
      setLastNonce(currentNonce);

      console.log("Minting NFT with parameters:", {
        address,
        tokenURI,
        mojoScore,
        narrative: sanitizedPath,
        fee: fee.toString(),
        nonce: currentNonce
      });

      // Call the payable mintTo function explicitly with four parameters
      const tx = await mintTo({
        args: [address, tokenURI, mojoScore, sanitizedPath],
        overrides: { value: fee, nonce: currentNonce },
      });

      if (!tx || !tx.receipt) {
        throw new Error("Mint transaction failed");
      }
      const receipt = tx.receipt;
      console.log("Mint receipt:", receipt);

      // Optionally verify that only one Transfer event occurred
      const transferEvents = receipt.logs.filter((log: any) =>
        log.topics && log.topics[0].includes("Transfer")
      );
      if (transferEvents.length !== 1) {
        console.warn("Unexpected number of Transfer events:", transferEvents.length);
        throw new Error("Multiple mint events detected");
      }

      setTxHash(receipt.transactionHash);
      setMintStatus("success");
    } catch (error: any) {
      console.error("Error minting NFT:", error);
      const message = error instanceof Error ? error.message : "Minting failed";
      setErrorMessage(
        message.includes("cancelled")
          ? "Transaction cancelled by user"
          : message.includes("rejected")
            ? "Transaction rejected by wallet"
            : message.includes("insufficient")
              ? "Not enough ETH for mint"
              : message.includes("revert")
                ? "Contract rejected transaction"
                : message.includes("Duplicate transaction")
                  ? "Transaction already in progress"
                  : message
      );
      setMintStatus("error");
    } finally {
      setIsMinting(false);
      setLastNonce(null);
    }
  }, [address, contract, sanitizedPath, isMinting, narrativePath, metadataUri, mintFee, mojoScore, lastNonce]);

  return (
    <div className="mint-nft-container">
      {mintStatus !== "idle" && (
        <div className={`mint-status ${mintStatus}`}>
          {mintStatus === "pending" && <p>Minting your NFT...</p>}
          {mintStatus === "success" && (
            <div>
              <p>NFT minted! 🎉</p>
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
          {!address && <p>Connect your wallet to mint</p>}
          {address && !isOnOptimism && (
            <div>
              <p>Switch to Optimism to mint</p>
              <button onClick={handleSwitchNetwork}>Switch to Optimism</button>
              {networkError && <p>{networkError}</p>}
            </div>
          )}
        </>
      )}

      {mintStatus !== "success" && mojoScore > 0 && (
        <div>
          <p>Mojo Score: {mojoScore}</p>
          <p>You'll get {mojoScore} Mojo tokens after minting!</p>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={!address || !isOnOptimism || !sanitizedPath || isMinting}
        className={`mint-button ${mintStatus === "success" ? "success" : ""}`}
      >
        {mintStatus === "pending" ? "Minting..." : mintStatus === "success" ? "Minted!" : "Mint NFT"}
      </button>

      {mintStatus !== "success" && (
        <p>
          Mint your NFT on Optimism. {isMintFeeLoading ? "Loading fee..." : `Fee: ${formatMintFee(mintFee)}`}
        </p>
      )}
    </div>
  );
};

export default MintNFT;