// src/components/MintNFT.tsx
import React, { useState, useEffect } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  useContractRead,
  useSDK,
  useNetwork,
  useNetworkMismatch,
  useBalance,
} from "@thirdweb-dev/react";
import contractAbi from "../contractAbi.json";
import { BigNumber } from "ethers";
import { nftService } from "../services/nftService";

const NFT_CONTRACT_ADDRESS =
  "0xfA2A3452D86A9447e361205DFf29B1DD441f1821";
const MOJO_TOKEN_CONTRACT_ADDRESS =
  "0xf9e7D3cd71Ee60C7A3A64Fa7Fcb81e610Ce1daA5";
const CONTRACT_OWNER_ADDRESS =
  "0x2af17552f27021666BcD3E5Ba65f68CB5Ec217fc";

// Hardcoded token and media URIs
const TOKEN_URI = "ipfs://QmfS4CpKMBQgiJKXPoGHdQsgKYSEhDJar2vpn4zVH81fSK/0";
const MEDIA_URI = "ipfs://QmQwVHy35zjGRqLiVCrnV23BsYfLvhTgvWTmkwFfsR4Jkn/Mystic%20enchanting%20logo%20depicting%20Cannabis%20is%20Medicine%20in%20gentle%20color%20contrasts%20and%20a%20dreamlike%20atmosphere%2C%20otherworldly%20ethereal%20quality%2C%20geometric%20shapes%2C%20clean%20lines%2C%20balanced%20symmetry%2C%20visual%20clarity.jpeg";

// Constants for minting
const EXPECTED_MINT_FEE_WEI = "777000000000000"; // 0.000777 ETH in wei

// Create event listener for transaction events
const listenForTransactionEvents = (
  transactionHash: string,
) => {
  console.log(
    `Setting up listeners for transaction: ${transactionHash}`,
  );
  // This would be implemented with web3 libraries in a production app
};

interface MintNFTProps {
  metadataUri: string;
  narrativePath: string;
}

const allowedPaths = ["A", "B", "C"];

// Calculate Mojo Score based on the narrative path and other engagement factors
const calculateMojoScore = (path: string): number => {
  // Base score for each path
  let baseScore = 0;
  switch (path) {
    case "A":
      baseScore = 8000;
      break;
    case "B":
      baseScore = 7500;
      break;
    case "C":
      baseScore = 8500;
      break;
    default:
      baseScore = 5000;
  }

  // Add a bonus for early adoption (this is just an example, you could use other factors)
  const currentTime = Date.now();
  const launchTime = new Date("2023-12-01").getTime(); // Example launch date
  const timeBonus = Math.max(
    0,
    Math.min(
      1500,
      Math.floor(
        ((launchTime - currentTime) /
          (1000 * 60 * 60 * 24)) *
          100,
      ),
    ),
  );

  // Calculate final score, capped at 10,000
  const finalScore = Math.min(10000, baseScore + timeBonus);

  console.log(
    `Mojo Score calculation: baseScore=${baseScore}, timeBonus=${timeBonus}, finalScore=${finalScore}`,
  );

  return finalScore;
};

// Helper function to format mint fee
const formatMintFee = (fee: any): string => {
  if (!fee) return "0";
  try {
    return (Number(fee.toString()) / 1e18).toFixed(4);
  } catch (error) {
    console.error("Error formatting mint fee:", error);
    return "0";
  }
};

// Service function to award Mojo tokens
const awardMojoTokensService = async (data: {
  address: string;
  mojoScore: number;
  narrativePath: string;
}): Promise<{ txHash: string }> => {
  try {
    const response = await fetch('https://mojotokenrewards.producerprotocol.pro/mint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error awarding tokens:", error);
    throw error;
  }
};

// Generate a unique name based on user's wallet address
const generateUniqueName = (address: string): string => {
  if (!address) return "Anonymous";
  
  // Take the last 6 characters of the address
  const shortAddress = address.slice(-6);
  
  // Create some name variations based on the address
  const nameOptions = [
    `Wanderer ${shortAddress}`,
    `Explorer ${shortAddress}`,
    `Voyager ${shortAddress}`,
    `Seeker ${shortAddress}`,
    `Traveler ${shortAddress}`
  ];
  
  // Pick a name based on a hash of the address
  const nameIndex = Math.abs(
    address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % nameOptions.length;
  
  return nameOptions[nameIndex];
};

// Find a word in a crypto address
const findWordInAddress = (address: string): string => {
  if (!address) return "Anon";
  
  // Convert address to lowercase for easier matching
  const lowercaseAddr = address.toLowerCase();
  
  // List of possible 4-letter words that can be formed from hex characters (a-f, 0-9)
  // We'll treat numbers as their letter counterparts where sensible (0=o, 1=i, 3=e, etc.)
  const possibleWords = [
    "face", "cafe", "fade", "beef", "bead", "deed", 
    "feed", "dead", "deaf", "acme", "a1fa", "d1ce", 
    "f1fe", "ace", "bed", "cab", "dab", "fab"
  ];
  
  // Try to find any of these words in the address
  for (const word of possibleWords) {
    const pattern = word.replace(/1/g, '1').replace(/0/g, '0');
    if (lowercaseAddr.includes(pattern)) {
      return word.toUpperCase();
    }
  }
  
  // If no matching word found, use the last 4 characters
  const last4 = address.slice(-4);
  return last4;
};

// Helper function to sanitize narrative inputs
const sanitizeNarrative = (narrative: string): string => {
  // Remove potentially offensive content and limit length
  const sanitized = narrative
    .replace(/[^\w\s.,!?-]/gi, "") // Remove special characters
    .trim()
    .slice(0, 500); // Limit length
  return sanitized;
};

const MintNFT: React.FC<MintNFTProps> = ({
  metadataUri,
  narrativePath,
}) => {
  const address = useAddress();
  const sdk = useSDK();
  const [, switchNetwork] = useNetwork();
  const isMismatched = useNetworkMismatch();
  const { data: balance } = useBalance();
  const [isOnOptimism, setIsOnOptimism] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string>("");
  const [sanitizedPath, setSanitizedPath] = useState<string>("");
  const [insufficientFunds, setInsufficientFunds] = useState<boolean>(false);
  const [estimatedGas, setEstimatedGas] = useState<BigNumber | null>(null);

  // Remove the old contract initialization since we're using the service
  const [mintStatus, setMintStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mojoScore, setMojoScore] = useState<number>(0);
  const [tokenAwardStatus, setTokenAwardStatus] = useState<
    "pending" | "success" | "error" | "idle"
  >("idle");
  const [tokenTxHash, setTokenTxHash] = useState<string>("");
  const [isWalletReady, setIsWalletReady] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // Check if connected wallet is the contract owner
  useEffect(() => {
    const checkOwner = async () => {
      if (address) {
        setIsWalletReady(true);
        const owner = await nftService.owner();
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
      }
    };
    checkOwner();
  }, [address]);

  // Handle minting process
  const handleMint = async () => {
    if (!address) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    if (!narrativePath || !allowedPaths.includes(narrativePath)) {
      setErrorMessage("Invalid narrative path");
      return;
    }

    try {
      setMintStatus("pending");
      setErrorMessage("");

      // Check if user has sufficient funds
      const mintFee = await nftService.MINT_FEE();
      const gasCost = BigNumber.from(200000).mul(1000000000); // Conservative gas estimate
      const totalCost = mintFee.add(gasCost);

      if (balance?.value.lt(totalCost)) {
        setInsufficientFunds(true);
        setErrorMessage(
          `Insufficient funds. You need at least ${formatMintFee(
            totalCost
          )} ETH to mint.`
        );
        setMintStatus("error");
        return;
      }

      // Calculate Mojo score before minting
      const score = calculateMojoScore(narrativePath);
      setMojoScore(score);

      // Mint the NFT with metadata including Mojo score
      const tx = await nftService.mintNFT(address, narrativePath, score, mintFee);
      setTxHash(tx.toString());
      setMintStatus("success");

      // Award Mojo tokens after successful mint
      setTokenAwardStatus("pending");
      try {
        const tokenTx = await awardMojoTokensService({
          address,
          mojoScore: score,
          narrativePath,
        });
        setTokenTxHash(tokenTx.txHash);
        setTokenAwardStatus("success");
      } catch (error) {
        console.error("Error awarding tokens:", error);
        setTokenAwardStatus("error");
      }
    } catch (error) {
      console.error("Minting error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to mint NFT"
      );
      setMintStatus("error");
    }
  };

  // Function to render the mint status
  const renderMintStatus = () => {
    if (mintStatus === "idle") return null;

    return (
      <div className={`mint-status ${mintStatus}`}>
        {mintStatus === "pending" && (
          <p>
            Minting your NFT... Please wait and don't close
            this window.
          </p>
        )}
        {mintStatus === "success" && (
          <div>
            <p>
              Your NFT has been successfully minted! 🎉
            </p>
            {txHash && (
              <a
                href={`https://optimistic.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View transaction on Etherscan
              </a>
            )}
            {tokenAwardStatus === "pending" && (
              <div className="token-award-status">
                <p>
                  Awarding your Mojo tokens... Please wait.
                </p>
              </div>
            )}
            {tokenAwardStatus === "success" && (
              <div className="token-award-status success">
                <p>
                  {mojoScore} Mojo tokens have been awarded to
                  your wallet! 🎉
                </p>
                {tokenTxHash && (
                  <a
                    href={`https://optimistic.etherscan.io/tx/${tokenTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    View token transaction on Etherscan
                  </a>
                )}
              </div>
            )}
            {tokenAwardStatus === "error" && (
              <div className="token-award-status error">
                <p>
                  There was an issue awarding your Mojo
                  tokens. Please contact support.
                </p>
              </div>
            )}
          </div>
        )}
        {mintStatus === "error" && (
          <div>
            <p>Error minting your NFT:</p>
            <div className="error-details">
              {errorMessage}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to render pre-mint status
  const renderPreMintStatus = () => {
    if (mintStatus !== "idle") return null;

    if (!address) {
      return (
        <div className="connect-prompt">
          <p>
            Please connect your wallet to mint an NFT.
          </p>
        </div>
      );
    }

    if (!isWalletReady) {
      return (
        <div className="connect-prompt">
          <p>
            Your wallet is not properly connected. Please
            reconnect your wallet.
          </p>
        </div>
      );
    }

    if (insufficientFunds) {
      return (
        <div className="insufficient-funds-prompt">
          <p>
            You don't have enough ETH to complete this transaction.
          </p>
          <p className="balance-info">
            Required: {formatMintFee(nftService.MINT_FEE())} ETH (mint fee) + gas
          </p>
          <p className="balance-info">
            Your balance: {balance ? formatMintFee(balance.value) : "0"} ETH
          </p>
        </div>
      );
    }

    // Check if we're on Optimism
    if (!isOnOptimism) {
      return (
        <div className="network-prompt">
          <p>
            Please switch your wallet to the Optimism network to mint your NFT.
          </p>
          <p className="network-help">
            Need help? In your wallet, look for the network selector and choose "Optimism".
          </p>
          <button
            onClick={() => switchNetwork?.(10)}
            className="switch-network-btn"
            disabled={!switchNetwork}
          >
            {switchNetwork ? "Switch to Optimism" : "Switch Network in Wallet"}
          </button>
          {networkError && (
            <p className="network-error">
              {networkError}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  // Function to render owner section
  const renderOwnerSection = () => {
    if (!isOwner || !address) return null;

    return (
      <div className="owner-section">
        <h4>Contract Owner Controls</h4>
        <button
          onClick={() => {
            // Implement owner-specific functionality
          }}
          disabled={false}
          className="withdraw-button"
        >
          Withdraw Contract Balance
        </button>
      </div>
    );
  };

  return (
    <div className="mint-nft-container">
      {renderMintStatus()}
      {renderPreMintStatus()}

      {mintStatus !== "success" && (
        <div className="mojo-score-preview">
          <p>
            Expected Mojo Score:{" "}
            <span className="mojo-score">{mojoScore}</span>
          </p>
          <p className="mojo-description">
            After minting, you'll receive{" "}
            <span className="mojo-score">{mojoScore}</span>{" "}
            Mojo tokens based on your engagement!
          </p>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={
          !address ||
          mintStatus === "pending" ||
          mintStatus === "success" ||
          !isWalletReady ||
          !isOnOptimism
        }
        className={`mint-button ${mintStatus === "success" ? "success" : ""}`}
      >
        {mintStatus === "pending"
          ? "Minting..."
          : mintStatus === "success"
            ? "Minted Successfully!"
            : "Mint NFT"}
      </button>

      {mintStatus !== "success" && (
        <p className="mint-info">
          Minting will create your unique NFT on the
          Optimism blockchain.
        </p>
      )}

      {renderOwnerSection()}
    </div>
  );
};

export default MintNFT;
