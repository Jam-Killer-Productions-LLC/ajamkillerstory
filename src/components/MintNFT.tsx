// src/components/MintNFT.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  FC,
} from "react";
import {
  useAddress,
  useNetwork,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { NFTContractService } from "../services/nftContractService";
import { awardMojoTokensService } from "../services/mojoTokenService";

// Configuration
const NFT_CONTRACT_ADDRESS =
  "0x914B1339944D48236738424e2dBDBB72A212B2F5";
const OPTIMISM_CHAIN_ID = 10;

// Plain HTTPS images for each path
const IMAGE_URLS: Record<string, string> = {
  A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
  B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
  C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
};

// Allowed narrative paths
const allowedPaths = ["A", "B", "C"] as const;
type NarrativePath = (typeof allowedPaths)[number];

/**
 * Calculate mojo score based on narrative path
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
function formatMintFee(fee: string | undefined): string {
  try {
    if (!fee || ethers.BigNumber.from(fee).eq(0)) {
      return "$1.55";
    }
    const ethValue =
      Number(ethers.BigNumber.from(fee).toString()) / 1e18;
    return `$${(ethValue * 2000).toFixed(2)}`;
  } catch {
    return "$1.55";
  }
}

/**
 * Sanitize user narrative
 */
function sanitizeNarrative(narrative: string): string {
  if (!narrative) return "";
  const nsfwWords = [
    "fuck",
    "shit",
    "asshole",
    "bitch",
    "damn",
  ];
  let cleaned = narrative;
  nsfwWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(
      regex,
      "*".repeat(word.length),
    );
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
  const nameIndex =
    Math.abs(sumOfChars) % nameOptions.length;
  return `Don't Kill the Jam : Reward it with Mojo ${nameOptions[nameIndex]}`;
}

/**
 * Props for MintNFT
 */
interface MintNFTProps {
  narrativePath: NarrativePath;
  userNarrative?: string;
}

/**
 * Main MintNFT Component
 */
const MintNFT: FC<MintNFTProps> = ({
  narrativePath,
  userNarrative = "",
}) => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();

  // Local state
  const [isOnOptimism, setIsOnOptimism] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [sanitizedNarrative, setSanitizedNarrative] =
    useState("");
  const [mintStatus, setMintStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mojoScore, setMojoScore] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintFee, setMintFee] = useState<string>();
  const [isMintFeeLoading, setIsMintFeeLoading] =
    useState(true);

  // NFT Contract Service
  const [nftService, setNftService] =
    useState<NFTContractService | null>(null);

  // Initialize contract service when wallet is connected
  useEffect(() => {
    const initService = async () => {
      if (address && (window as any).ethereum) {
        try {
          const provider =
            new ethers.providers.Web3Provider(
              (window as any).ethereum,
            );
          const signer = provider.getSigner();
          const service = new NFTContractService(signer);
          setNftService(service);

          // Get mint fee
          try {
            const fee = await service.getMintFee();
            setMintFee(fee);
          } catch (error) {
            console.error(
              "Error fetching mint fee:",
              error,
            );
          } finally {
            setIsMintFeeLoading(false);
          }
        } catch (error) {
          console.error(
            "Error initializing NFT service:",
            error,
          );
        }
      }
    };

    initService();
  }, [address]);

  // Process narrative path and user narrative
  useEffect(() => {
    if (
      !narrativePath ||
      !allowedPaths.includes(narrativePath)
    ) {
      setErrorMessage("Invalid narrative path");
      setMintStatus("error");
      return;
    }

    // Set mojo score based on narrative path
    setMojoScore(calculateMojoScore(narrativePath));

    // Sanitize user narrative if provided
    const narrative =
      userNarrative ||
      `Path ${narrativePath}: Default narrative for path ${narrativePath}`;
    setSanitizedNarrative(sanitizeNarrative(narrative));
  }, [narrativePath, userNarrative]);

  // Check if wallet is on Optimism
  useEffect(() => {
    const checkNetwork = async () => {
      if (!(window as any).ethereum) {
        setNetworkError("No wallet detected");
        return;
      }

      try {
        const chainIdHex = await (
          window as any
        ).ethereum.request({
          method: "eth_chainId",
        });
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
    if (!address) return null;

    const metadata = {
      name: generateUniqueName(address),
      description: `NFT minted on Optimism. User narrative: ${sanitizedNarrative}`,
      image: IMAGE_URLS[narrativePath],
      attributes: [
        { trait_type: "Mojo Score", value: mojoScore },
        {
          trait_type: "Narrative Path",
          value: narrativePath,
        },
      ],
    };

    return metadata;
  }, [
    address,
    narrativePath,
    sanitizedNarrative,
    mojoScore,
  ]);

  // Main mint function
  const handleMint = useCallback(async () => {
    if (
      !address ||
      !nftService ||
      !sanitizedNarrative ||
      isMinting
    ) {
      setErrorMessage(
        !address
          ? "Connect your wallet"
          : !nftService
            ? "Contract service not initialized"
            : !sanitizedNarrative
              ? "Narrative cannot be empty"
              : "Mint already in progress",
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
      // Create metadata
      const metadata = createNFTMetadata();
      if (!metadata) {
        throw new Error("Failed to create metadata");
      }

      // Prepare mint parameters
      const mintParams = {
        recipientAddress: address,
        tokenURI: nftService.createMetadataURI(metadata),
        mojoScore: mojoScore,
        narrative: sanitizedNarrative,
      };

      console.log("Minting NFT with:", {
        address,
        mojoScore,
        path: narrativePath,
      });

      // Execute mint transaction
      const receipt = await nftService.mintNFT(mintParams);
      console.log("Mint receipt:", receipt);

      setTxHash(receipt.transactionHash);
      setMintStatus("success");

      // Award mojo tokens after success
      try {
        const rewardTx = await awardMojoTokensService({
          address,
          mojoScore,
          narrativePath,
        });
        console.log("Mojo tokens awarded:", rewardTx);
      } catch (rewardError: any) {
        const rMsg =
          rewardError?.message ||
          "Unknown error awarding tokens";
        console.error(
          "Error awarding tokens:",
          rewardError,
        );
        setErrorMessage(
          `Mint succeeded but rewards failed: ${rMsg}`,
        );
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
                  : msg,
      );
      setMintStatus("error");
    } finally {
      setIsMinting(false);
    }
  }, [
    address,
    nftService,
    sanitizedNarrative,
    isMinting,
    narrativePath,
    mojoScore,
    createNFTMetadata,
  ]);

  return (
    <div className="mint-nft-container">
      {mintStatus !== "idle" && (
        <div className={`mint-status ${mintStatus}`}>
          {mintStatus === "pending" && (
            <p>Minting your NFT...</p>
          )}
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

      {mintStatus !== "success" && mojoScore > 0 && (
        <div>
          <p>Mojo Score: {mojoScore}</p>
          <p>
            You'll receive {mojoScore} Mojo tokens after
            minting!
          </p>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={
          !address ||
          !isOnOptimism ||
          !sanitizedNarrative ||
          isMinting
        }
        className={`mint-button ${mintStatus === "success" ? "success" : ""}`}
      >
        {mintStatus === "pending"
          ? "Minting..."
          : mintStatus === "success"
            ? "Minted!"
            : "Mint NFT"}
      </button>

      {mintStatus !== "success" && (
        <p>
          Mint Fee:{" "}
          {isMintFeeLoading
            ? "Loading fee..."
            : formatMintFee(mintFee)}
        </p>
      )}
    </div>
  );
};

export default MintNFT;
