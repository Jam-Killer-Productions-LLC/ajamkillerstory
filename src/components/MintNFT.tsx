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

  // Initialize contract
  const { contract, isLoading: isContractLoading } =
    useContract(NFT_CONTRACT_ADDRESS, contractAbi);

  // Setup both needed contract functions
  const { mutateAsync: mintNFT, isLoading: isMintPending } =
    useContractWrite(contract, "mintNFT");
  const {
    mutateAsync: finalizeNFT,
    isLoading: isFinalizePending,
  } = useContractWrite(contract, "finalizeNFT");
  const { mutateAsync: withdraw, isLoading: isWithdrawPending } =
    useContractWrite(contract, "withdraw");
  const isPending = isMintPending || isFinalizePending || isWithdrawPending;

  const { data: mintFee, isLoading: isMintFeeLoading } =
    useContractRead(contract, "MINT_FEE");

  // Setup Mojo token contract for awarding tokens
  const { contract: mojoContract } = useContract(
    MOJO_TOKEN_CONTRACT_ADDRESS,
  );

  const [mintStatus, setMintStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMessage, setErrorMessage] =
    useState<string>("");
  const [mojoScore, setMojoScore] = useState<number>(0);
  const [tokenAwardStatus, setTokenAwardStatus] = useState<
    "pending" | "success" | "error" | "idle"
  >("idle");
  const [tokenTxHash, setTokenTxHash] =
    useState<string>("");
  const [isWalletReady, setIsWalletReady] =
    useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [withdrawStatus, setWithdrawStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [withdrawTxHash, setWithdrawTxHash] =
    useState<string>("");

  // Remove the gas estimation useEffect since we'll use a conservative estimate
  const CONSERVATIVE_GAS_ESTIMATE = BigNumber.from(200000); // Conservative gas estimate for minting

  // Check if connected wallet is the contract owner
  useEffect(() => {
    if (address) {
      setIsWalletReady(true);
      setIsOwner(
        address.toLowerCase() ===
          CONTRACT_OWNER_ADDRESS.toLowerCase(),
      );
    } else {
      setIsWalletReady(false);
      setIsOwner(false);
    }
  }, [address]);

  // Calculate Mojo score when narrative path changes
  useEffect(() => {
    if (narrativePath) {
      setMojoScore(calculateMojoScore(narrativePath));
    }
  }, [narrativePath]);

  // Sanitize narrative path when component mounts or path changes
  useEffect(() => {
    if (narrativePath) {
      const sanitized = sanitizeNarrative(narrativePath);
      setSanitizedPath(sanitized);
    }
  }, [narrativePath]);

  // Handle network switching
  const handleSwitchNetwork = async () => {
    setNetworkError("");
    try {
      if (!switchNetwork) {
        throw new Error("Network switching not available in your wallet");
      }
      
      // First try to switch network
      await switchNetwork(10);
      
      // Verify the switch was successful
      const chainId = await sdk?.wallet.getChainId();
      if (chainId !== 10) {
        throw new Error("Failed to switch to Optimism network");
      }
      
      setIsOnOptimism(true);
      console.log("Successfully switched to Optimism network");
    } catch (error) {
      console.error("Network switch error:", error);
      setNetworkError(
        error instanceof Error 
          ? error.message 
          : "Failed to switch networks. Please switch manually in your wallet."
      );
    }
  };

  // Check network
  useEffect(() => {
    const checkNetwork = async () => {
      if (!sdk) return;
      try {
        const chainId = await sdk.wallet.getChainId();
        setIsOnOptimism(chainId === 10);
        setNetworkError("");
      } catch (error) {
        console.error("Error checking network:", error);
        setIsOnOptimism(false);
        setNetworkError("Failed to check network status");
      }
    };

    if (address) {
      checkNetwork();
    }
  }, [address, sdk]);

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
            Required: {formatMintFee(mintFee?.toString() || "0")} ETH (mint fee) + gas
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
            onClick={handleSwitchNetwork}
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
          onClick={handleWithdraw}
          disabled={withdrawStatus === "pending"}
          className="withdraw-button"
        >
          {withdrawStatus === "pending"
            ? "Withdrawing..."
            : "Withdraw Contract Balance"}
        </button>
        {withdrawStatus === "success" && (
          <div className="withdraw-status success">
            <p>
              Funds have been successfully withdrawn! 🎉
            </p>
            {withdrawTxHash && (
              <a
                href={`https://optimistic.etherscan.io/tx/${withdrawTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View transaction on Etherscan
              </a>
            )}
          </div>
        )}
        {withdrawStatus === "error" && (
          <div className="withdraw-status error">
            <p>Error withdrawing funds: {errorMessage}</p>
          </div>
        )}
      </div>
    );
  };

  // Function to handle withdrawal (for contract owner)
  const handleWithdraw = async () => {
    if (!isOwner || !contract) return;

    setWithdrawStatus("pending");
    setErrorMessage("");

    try {
      console.log("Initiating withdrawal...");
      const withdrawTx = await withdraw({});
      
      if (!withdrawTx || !withdrawTx.receipt) {
        throw new Error("Withdrawal transaction submitted but no receipt was returned");
      }

      console.log("Withdrawal transaction submitted:", withdrawTx);
      setWithdrawTxHash(withdrawTx.receipt.transactionHash);
      setWithdrawStatus("success");
    } catch (error) {
      console.error("Withdrawal error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMessage(errorMsg);
      setWithdrawStatus("error");
    }
  };

  // Function to handle minting
  const handleMint = async () => {
    // Reset states
    setErrorMessage("");
    setInsufficientFunds(false);

    // Validation checks
    if (!address) {
      setErrorMessage("Please connect your wallet");
      return;
    }

    if (!isWalletReady) {
      setErrorMessage(
        "Your wallet is not properly connected. Please reconnect your wallet.",
      );
      return;
    }

    if (!allowedPaths.includes(narrativePath)) {
      setErrorMessage("Invalid narrative path");
      return;
    }

    // Check if narrative path was sanitized
    if (sanitizedPath !== narrativePath) {
      setErrorMessage("Invalid characters in narrative path");
      return;
    }

    // Check if contract is loaded
    if (isContractLoading || !contract) {
      setErrorMessage(
        "Contract is still loading. Please wait.",
      );
      return;
    }

    // Check if mint fee is loaded
    if (isMintFeeLoading || mintFee === undefined) {
      setErrorMessage(
        "Mint fee information is still loading. Please wait.",
      );
      return;
    }

    // Check if user has sufficient balance for mint fee + gas
    if (balance) {
      const mintFeeBN = BigNumber.from(mintFee);
      // Use a conservative gas estimate
      const gasCost = CONSERVATIVE_GAS_ESTIMATE.mul(1000000000); // 1 gwei as base gas price
      const totalCost = mintFeeBN.add(gasCost);

      console.log("Balance check details:", {
        balance: balance.value.toString(),
        mintFee: mintFeeBN.toString(),
        gasCost: gasCost.toString(),
        totalCost: totalCost.toString()
      });

      if (balance.value.lt(totalCost)) {
        setInsufficientFunds(true);
        setErrorMessage(
          `Insufficient funds. You need at least ${formatMintFee(totalCost.toString())} ETH (mint fee + gas) to complete this transaction.`
        );
        return;
      }
    }

    // Ensure we have a mojo score
    if (mojoScore === 0) {
      setMojoScore(calculateMojoScore(narrativePath));
    }

    setMintStatus("pending");
    let imageUrl: string;

    // Select image URL based on narrative path first
    switch (narrativePath) {
      case "A":
        imageUrl = "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif";
        break;
      case "B":
        imageUrl = "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif";
        break;
      case "C":
        imageUrl = "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif";
        break;
      default:
        throw new Error("Invalid narrative path");
    }

    try {
      // Enhanced logging of mint parameters
      console.log("Detailed Mint Parameters:", {
        address,
        addressChecksum: address.toLowerCase(),
        narrativePath: sanitizedPath,
        mintFee: mintFee?.toString(),
        expectedMintFee: EXPECTED_MINT_FEE_WEI,
        mojoScore,
        finalMetadata: {
          name: `Don't Kill the Jam : A Storied NFT ${findWordInAddress(address)}`,
          image: imageUrl,
          attributes: [
            { trait_type: "Mojo Score", value: mojoScore },
            { trait_type: "Narrative", value: sanitizedPath }
          ]
        },
        contractAddress: NFT_CONTRACT_ADDRESS,
        contractABI: contractAbi
      });

      // Make sure we're using the right chain (Optimism)
      try {
        const currentChain = await sdk?.wallet.getChainId();
        console.log("Current chain ID:", currentChain);
        if (currentChain !== 10) {
          throw new Error(
            "Please connect to the Optimism network to mint.",
          );
        }
      } catch (chainError) {
        console.error("Error checking chain ID:", chainError);
        throw new Error(
          "Failed to verify network connection. Please ensure you're connected to Optimism.",
        );
      }

      // Validate mint fee matches exactly
      if (mintFee?.toString() !== EXPECTED_MINT_FEE_WEI) {
        throw new Error(
          `Mint fee mismatch. Expected: ${EXPECTED_MINT_FEE_WEI}, Got: ${mintFee?.toString()}`
        );
      }

      // Validate narrative path format
      if (sanitizedPath.length !== 1 || !["A", "B", "C"].includes(sanitizedPath)) {
        throw new Error(
          `Invalid narrative path format. Expected single character A, B, or C. Got: ${sanitizedPath}`
        );
      }

      // Pass mint fee in the transaction with explicit value
      const mintTx = await mintNFT({
        args: [address, sanitizedPath], // Correct parameter order: to, path
        overrides: {
          value: EXPECTED_MINT_FEE_WEI,
        },
      });

      console.log("mintNFT transaction submitted:", mintTx);

      if (!mintTx || !mintTx.receipt) {
        throw new Error(
          "mintNFT transaction was submitted but no receipt was returned",
        );
      }

      // Finalize NFT with the direct IPFS URI
      const finalizeTx = await finalizeNFT({
        args: [address, imageUrl, sanitizedPath], // Correct parameter order: to, finalURI, path
      });

      console.log(
        "finalizeNFT transaction submitted:",
        finalizeTx,
      );
      if (!finalizeTx || !finalizeTx.receipt) {
        throw new Error(
          "finalizeNFT transaction was submitted but no receipt was returned",
        );
      }

      setTxHash(finalizeTx.receipt.transactionHash);
      listenForTransactionEvents(
        finalizeTx.receipt.transactionHash,
      );
      setMintStatus("success");
      
      // Award Mojo tokens after successful mint
      setTimeout(async () => {
        try {
          console.log("Initiating Mojo token award process...", {
            address,
            mojoScore,
            narrativePath: sanitizedPath
          });
          await handleAwardMojoTokens();
          console.log("Mojo token award process completed successfully");
        } catch (tokenError) {
          console.error(
            "Error in delayed token award:",
            tokenError,
            {
              address,
              mojoScore,
              narrativePath: sanitizedPath,
              error: tokenError instanceof Error ? tokenError.message : "Unknown error"
            }
          );
        }
      }, 5000);
    } catch (error) {
      console.error("Detailed Mint Error:", error);
      // Capture and log more detailed error information
      const errorDetails = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error),
      );
      console.error("Error details:", errorDetails);
      
      let errorMsg = "Unknown error occurred";
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (errorDetails) {
        errorMsg = errorDetails;
      }

      // Enhanced error message handling
      if (errorMsg.includes("insufficient funds")) {
        errorMsg = "Insufficient funds to cover the mint fee and gas. Please add more ETH to your wallet.";
      } else if (errorMsg.toLowerCase().includes("revert")) {
        errorMsg = `Transaction reverted by the contract. Details: ${errorMsg}`;
      } else if (errorMsg.includes("user rejected")) {
        errorMsg = "Transaction was rejected by the user.";
      } else if (errorMsg.includes("network")) {
        errorMsg = "Network error occurred. Please check your connection and try again.";
      }

      // Log the final error message and context
      console.error("Final error message:", errorMsg, {
        address,
        narrativePath: sanitizedPath,
        mintFee: mintFee?.toString(),
        expectedMintFee: EXPECTED_MINT_FEE_WEI,
        mojoScore,
        contractAddress: NFT_CONTRACT_ADDRESS
      });

      setErrorMessage(errorMsg);
      setMintStatus("error");
    }
  };

  // Function to handle awarding Mojo tokens using the service
  const handleAwardMojoTokens = async () => {
    if (!address || mojoScore <= 0 || !sanitizedPath) {
      console.error("Missing required data for token award");
      return;
    }

    setTokenAwardStatus("pending");
    try {
      const result = await awardMojoTokensService({
        address,
        mojoScore,
        narrativePath: sanitizedPath
      });
      
      setTokenTxHash(result.txHash || '');
      setTokenAwardStatus("success");
      console.log("Mojo tokens awarded successfully:", result);
    } catch (error) {
      console.error("Error awarding tokens:", error);
      setTokenAwardStatus("error");
    }
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
          isPending ||
          !address ||
          mintStatus === "pending" ||
          mintStatus === "success" ||
          isContractLoading ||
          !isWalletReady ||
          !isOnOptimism
        }
        className={`mint-button ${mintStatus === "success" ? "success" : ""}`}
      >
        {isPending || mintStatus === "pending"
          ? "Minting..."
          : mintStatus === "success"
            ? "Minted Successfully!"
            : "Mint NFT"}
      </button>

      {mintStatus !== "success" && (
        <p className="mint-info">
          Minting will create your unique NFT on the
          Optimism blockchain.
          {mintFee &&
            ` Mint fee: ${formatMintFee(mintFee)} ETH`}
        </p>
      )}

      {renderOwnerSection()}
    </div>
  );
};

export default MintNFT;
