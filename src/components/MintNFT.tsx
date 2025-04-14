import React, { useState, useEffect } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  useContractRead,
  useNetwork,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import contractAbi from "../contractAbi.json";

const NFT_CONTRACT_ADDRESS = "0x914b1339944d48236738424e2dbdbb72a212b2f5";
const OPTIMISM_CHAIN_ID = 10;

const IMAGE_URLS: { [key: string]: string } = {
  A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
  B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
  C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
};

const calculateMojoScore = (path: string): number => {
  switch (path) {
    case "A": return 8000;
    case "B": return 7500;
    case "C": return 8500;
    default: throw new Error("Invalid narrative path");
  }
};

const formatMintFee = (fee: any): string => {
  try {
    if (!fee || ethers.BigNumber.from(fee).eq(0)) return "$1.55";
    const ethValue = Number(ethers.BigNumber.from(fee).toString()) / 1e18;
    return `$${(ethValue * 2000).toFixed(2)}`;
  } catch {
    return "$1.55";
  }
};

const awardMojoTokensService = async (data: {
  address: string;
  mojoScore: number;
  narrativePath: string;
}): Promise<{ txHash: string }> => {
  const response = await fetch("https://mojotokenrewards.producerprotocol.pro/mint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to award tokens");
  return response.json();
};

const generateUniqueName = (address: string): string => {
  if (!address) return "Anonymous";
  const shortAddress = address.slice(-6);
  const nameOptions = [
    `Wanderer ${shortAddress}`,
    `Explorer ${shortAddress}`,
    `Voyager ${shortAddress}`,
    `Seeker ${shortAddress}`,
    `Traveler ${shortAddress}`,
  ];
  const nameIndex = Math.abs(
    address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % nameOptions.length;
  return `Don't Kill the Jam : Reward it with Mojo ${nameOptions[nameIndex]}`;
};

const sanitizeNarrative = (narrative: string): string => {
  if (!narrative) return "";
  const nsfwWords = ["fuck", "shit", "asshole", "bitch", "damn"];
  let cleaned = narrative;
  nsfwWords.forEach(word => {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, "gi"), "*".repeat(word.length));
  });
  return cleaned.trim().slice(0, 500);
};

const getNarrativePath = (narrative: string): string => {
  if (narrative.startsWith("Path A")) return "A";
  if (narrative.startsWith("Path B")) return "B";
  if (narrative.startsWith("Path C")) return "C";
  throw new Error("Invalid narrative path");
};

const createMetadata = (
  address: string,
  narrativePath: string,
  sanitizedNarrative: string,
  mojoScore: number
): string => {
  const metadata = {
    name: generateUniqueName(address),
    description: `NFT minted on Optimism. User narrative: ${sanitizedNarrative}`,
    image: IMAGE_URLS[narrativePath],
    attributes: [
      { trait_type: "Mojo Score", value: mojoScore },
      { trait_type: "Narrative Path", value: narrativePath },
    ],
  };
  if (!metadata.image) throw new Error("Missing image for narrative path");
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
};

interface MintNFTProps {
  metadataUri: string;
  narrativePath: string;
}

const MintNFT: React.FC<MintNFTProps> = ({ narrativePath }) => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();
  const [isOnOptimism, setIsOnOptimism] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [sanitizedPath, setSanitizedPath] = useState("");
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mojoScore, setMojoScore] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  const { contract } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
  const { mutateAsync: mintTo } = useContractWrite(contract, "mintTo");
  const { data: mintFee, isLoading: isMintFeeLoading } = useContractRead(contract, "mintFee");

  useEffect(() => {
    if (!narrativePath) return;
    try {
      const sanitized = sanitizeNarrative(narrativePath);
      setSanitizedPath(sanitized);
      const path = getNarrativePath(narrativePath);
      setMojoScore(calculateMojoScore(path));
    } catch {
      setErrorMessage("Invalid narrative path");
      setMintStatus("error");
    }
  }, [narrativePath]);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) {
        setNetworkError("No wallet detected");
        return;
      }
      try {
        const chainId = parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16);
        setIsOnOptimism(chainId === OPTIMISM_CHAIN_ID);
        if (chainId !== OPTIMISM_CHAIN_ID) setNetworkError("Switch to Optimism");
      } catch {
        setIsOnOptimism(false);
        setNetworkError("Can't verify network");
      }
    };
    if (address) checkNetwork();
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

  const handleMint = async () => {
    if (!address || !contract || !sanitizedPath || isMinting) {
      setErrorMessage(
        !address ? "Connect your wallet" :
        !contract ? "Contract not loaded" :
        !sanitizedPath ? "Narrative cannot be empty" :
        "Mint already in progress"
      );
      setMintStatus("error");
      return;
    }

    setIsMinting(true);
    setMintStatus("pending");
    setErrorMessage("");

    try {
      const path = getNarrativePath(sanitizedPath);
      const tokenURI = createMetadata(address, path, sanitizedPath, mojoScore);
      const fee = mintFee && ethers.BigNumber.from(mintFee).gt(0) ? mintFee : ethers.BigNumber.from("777000000000000");

      if (!tokenURI.startsWith("data:application/json;base64,")) {
        throw new Error("Invalid metadata format");
      }

      const tx = await mintTo({
        args: [address, tokenURI, mojoScore, sanitizedPath],
        overrides: { value: fee },
      });

      if (!tx || !tx.receipt) {
        throw new Error("Mint transaction failed");
      }

      setTxHash(tx.receipt.transactionHash);
      setMintStatus("success");

      try {
        await awardMojoTokensService({
          address,
          mojoScore,
          narrativePath: sanitizedPath,
        });
      } catch {
        setErrorMessage("Failed to award Mojo tokens");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Minting failed";
      setErrorMessage(
        message.includes("cancelled") ? "Transaction cancelled by user" :
        message.includes("rejected") ? "Transaction rejected by wallet" :
        message.includes("insufficient") ? "Not enough ETH for mint" :
        message.includes("revert") ? "Contract rejected transaction" :
        message.includes("Invalid narrative") ? "Invalid narrative path" :
        message
      );
      setMintStatus("error");
    } finally {
      setIsMinting(false);
    }
  };

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
          Mint your NFT on Optimism.
          {isMintFeeLoading ? " Loading fee..." : ` Fee: ${formatMintFee(mintFee)}`}
        </p>
      )}
    </div>
  );
};

export default MintNFT;