import React, { useState, useEffect, useCallback, FC } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  useContractRead,
  useNetwork,
} from "@thirdweb-dev/react";
import { ethers, BigNumber } from "ethers";
import contractAbi from "../contractAbi.json";

// Adjust the path if your mojo token awarding logic is elsewhere
import { awardMojoTokensService } from "../services/mojotokenservice";

/**
 * Configuration
 */
const NFT_CONTRACT_ADDRESS = "0x914B1339944D48236738424e2dbdbb72A212B2F5";
const OPTIMISM_CHAIN_ID = 10;

// Plain HTTPS images for each path
const IMAGE_URLS: Record<string, string> = {
  A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
  B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
  C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
};

// Allowed narrative paths
const allowedPaths = ["A", "B", "C"] as const;

/**
 * Calculate mojo score. 
 * Same logic as your older snippet
 */
function calculateMojoScore(path: string): number {
  switch (path) {
    case "A":
      return 8000;
    case "B":
      return 7500;
    case "C":
      return 8500;
    default:
      throw new Error("Invalid narrative path");
  }
}

/**
 * Format mint fee to rough USD or fallback
 */
function formatMintFee(fee: any): string {
  try {
    if (!fee || ethers.BigNumber.from(fee).eq(0)) {
      return "$1.55";
    }
    const ethValue = Number(ethers.BigNumber.from(fee).toString()) / 1e18;
    return `$${(ethValue * 2000).toFixed(2)}`;
  } catch {
    return "$1.55";
  }
}

/**
 * Sanitize user narrative. 
 * From your older snippet
 */
function sanitizeNarrative(narrative: string): string {
  if (!narrative) return "";
  const nsfwWords = ["fuck", "shit", "asshole", "bitch", "damn"];
  let cleaned = narrative;
  nsfwWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(regex, "*".repeat(word.length));
  });
  return cleaned.trim().slice(0, 500);
}

/**
 * Generate a unique NFT name
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
  const sumOfChars = address
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const nameIndex = Math.abs(sumOfChars) % nameOptions.length;
  return `Don't Kill the Jam : Reward it with Mojo ${nameOptions[nameIndex]}`;
}

/**
 * Build the final base64-encoded metadata
 */
function createMetadata(
  address: string,
  narrativePath: string,
  sanitizedNarrative: string,
  mojoScore: number
): string {
  if (!allowedPaths.includes(narrativePath)) {
    throw new Error("Invalid narrative path");
  }
  const imageUrl = IMAGE_URLS[narrativePath];
  if (!imageUrl) {
    throw new Error("Missing image for narrative path");
  }
  const metadata = {
    name: generateUniqueName(address),
    description: `NFT minted on Optimism. User narrative: ${sanitizedNarrative}`,
    image: imageUrl,
    attributes: [
      { trait_type: "Mojo Score", value: mojoScore },
      { trait_type: "Narrative Path", value: narrativePath },
    ],
  };
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
}

/**
 * Props for MintNFT
 */
interface MintNFTProps {
  narrativePath: string; // A, B, or C
}

/**
 * Main MintNFT Component
 */
const MintNFT: FC<MintNFTProps> = ({ narrativePath }) => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();

  // Local state
  const [isOnOptimism, setIsOnOptimism] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [sanitizedPath, setSanitizedPath] = useState("");
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mojoScore, setMojoScore] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  // For preventing duplicates
  const [lastNonce, setLastNonce] = useState<number | null>(null);

  // Contract read & write
  const { contract } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
  const { mutateAsync: mintTo } = useContractWrite(contract, "mintTo");
  const { data: mintFee, isLoading: isMintFeeLoading } = useContractRead(
    contract,
    "mintFee"
  );

  // On mount or if narrativePath changes
  useEffect(() => {
    if (!narrativePath || !allowedPaths.includes(narrativePath)) {
      setErrorMessage("Invalid narrative path");
      setMintStatus("error");
      return;
    }
    const sanitized = sanitizeNarrative(narrativePath);
    setSanitizedPath(sanitized);
    setMojoScore(calculateMojoScore(narrativePath));
  }, [narrativePath]);

  // Check if wallet is on Optimism
  useEffect(() => {
    const checkNetwork = async () => {
      if (!(window as any).ethereum) {
        setNetworkError("No wallet detected");
        return;
      }
      try {
        const chainIdHex = await (window as any).ethereum.request({
          method: "eth_chainId",
        });
        const chainId = parseInt(chainIdHex as string, 16);
        setIsOnOptimism(chainId === OPTIMISM_CHAIN_ID);
        if (chainId !== OPTIMISM_CHAIN_ID) {
          setNetworkError("Switch to Optimism");
        }
      } catch {
        setIsOnOptimism(false);
        setNetworkError("Can't verify network");
      }
    };
    if (address) {
      checkNetwork();
    }
  }, [address]);

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

  // Main mint function
  const handleMint = useCallback(async () => {
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

    setMintStatus("pending");
    setIsMinting(true);
    setErrorMessage("");

    try {
      // Check nonce to avoid duplicates
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      const currentNonce = await signer.getTransactionCount("pending");

      if (lastNonce !== null && currentNonce === lastNonce) {
        throw new Error("Transaction already in progress");
      }
      setLastNonce(currentNonce);

      // Build base64 token URI
      const tokenURI = createMetadata(address, narrativePath, sanitizedPath, mojoScore);

      // fallback fee
      let fee = BigNumber.from("777000000000000"); 
      if (mintFee && BigNumber.from(mintFee).gt(0)) {
        fee = BigNumber.from(mintFee);
      }

      console.log("Minting NFT with:", {
        address,
        tokenURI,
        mojoScore,
        path: sanitizedPath,
        nonce: currentNonce,
        fee: fee.toString(),
      });

      const tx = await mintTo({
        args: [address, tokenURI, mojoScore, sanitizedPath],
        overrides: { value: fee, nonce: currentNonce },
      });

      if (!tx || !tx.receipt) {
        throw new Error("Mint transaction failed");
      }

      const receipt = tx.receipt;
      console.log("Mint receipt:", receipt);

      // If logs > 1, might be duplicates
      if (receipt.logs.length > 1) {
        console.warn("Multiple NFTs minted:", receipt.logs);
        throw new Error("Unexpected multiple mints detected");
      }

      setTxHash(receipt.transactionHash);
      setMintStatus("success");

      // Award mojo tokens after success
      try {
        const rewardTx = await awardMojoTokensService({
          address,
          mojoScore,
          narrativePath: sanitizedPath,
        });
        console.log("Mojo tokens awarded:", rewardTx);
      } catch (rewardError: any) {
        const rMsg = rewardError?.message || "Unknown error awarding tokens";
        setErrorMessage(`Mint succeeded but rewards failed: ${rMsg}`);
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
          ? "Not enough ETH for mint"
          : msg.includes("revert")
          ? "Contract rejected transaction"
          : msg.includes("Invalid narrative")
          ? "Invalid narrative path"
          : msg.includes("multiple mints")
          ? "Multiple mints detected, aborted"
          : msg
      );
      setMintStatus("error");
    } finally {
      // Reset nonce so user can mint again after finishing
      setLastNonce(null);
      setIsMinting(false);
    }
  }, [
    address,
    contract,
    sanitizedPath,
    isMinting,
    narrativePath,
    mojoScore,
    mintFee,
    lastNonce,
  ]);

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
              <button onClick={handleSwitchNetwork}>Switch to Optimism</button>
              {networkError && <p>{networkError}</p>}
            </div>
          )}
        </>
      )}

      {mintStatus !== "success" && mojoScore > 0 && (
        <div>
          <p>Mojo Score: {mojoScore}</p>
          <p>You’ll receive {mojoScore} Mojo tokens after minting!</p>
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
          Mint Fee:{" "}
          {isMintFeeLoading ? "Loading fee..." : formatMintFee(mintFee)}
        </p>
      )}
    </div>
  );
};

export default MintNFT;