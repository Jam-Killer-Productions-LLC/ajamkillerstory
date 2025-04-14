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
  "0x914b1339944d48236738424e2dbdbb72a212b2f5";
const MOJO_TOKEN_CONTRACT_ADDRESS =
  "0xf9e7D3cd71Ee60C7A3A64Fa7Fcb81e610Ce1daA5";
const CONTRACT_OWNER_ADDRESS =
  "0x2af17552f27021666BcD3E5Ba65f68CB5Ec217fc";
const OPTIMISM_CHAIN_ID = 10;

// Image URL choices based on narrative path
const IMAGE_URLS: { [key: string]: string } = {
  A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
  B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
  C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
};

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

// Helper function to sanitize narrative inputs
const sanitizeNarrative = (narrative: string): string => {
  // Remove potentially offensive content and limit length
  const sanitized = narrative
    .replace(/[^\w\s.,!?-]/gi, "") // Remove special characters
    .trim()
    .slice(0, 500); // Limit length
  return sanitized;
};

// Helper function to create metadata with the selected image URL
const createMetadata = (
  address: string,
  narrativePath: string,
  mojoScore: number
): string => {
  const metadata = {
    name: generateUniqueName(address),
    description: `NFT minted on Optimism with narrative path ${narrativePath}`,
    image: IMAGE_URLS[narrativePath],
    attributes: [
      { trait_type: "Mojo Score", value: mojoScore },
      { trait_type: "Narrative Path", value: narrativePath },
    ],
  };

  // Create a data URI with the metadata JSON (base64-encoded)
  return "data:application/json;base64," + btoa(JSON.stringify(metadata));
};

interface MintNFTProps {
  metadataUri: string;
  narrativePath: string;
}

const MintNFT: React.FC<MintNFTProps> = ({
  metadataUri, // Note: This prop is now supplemented by the generated metadata
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
  const [estimatedGas, setEstimatedGas] = useState<BigNumber | null>(null);

  // Initialize contract with proper ThirdWeb setup
  const { contract, isLoading: isContractLoading } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
  const { mutateAsync: mintTo } = useContractWrite(contract, "mintTo");
  const { mutateAsync: finalizeNFT } = useContractWrite(contract, "finalizeNFT");

  // Setup both needed contract functions
  const { mutateAsync: withdraw, isLoading: isWithdrawPending } =
    useContractWrite(contract, "withdraw");

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

  // Handle network switching - FIXED
  const handleSwitchNetwork = async () => {
    setNetworkError("");
    try {
      if (!switchNetwork) {
        throw new Error("Network switching not available in your wallet");
      }
      
      await switchNetwork(OPTIMISM_CHAIN_ID);
      // No need to manually verify - useNetwork hook will handle the update
      
    } catch (error) {
      console.error("Network switch error:", error);
      setNetworkError(
        error instanceof Error 
          ? error.message 
          : "Failed to switch networks. Please switch manually in your wallet."
      );
    }
  };

  // Check network - FIXED
  useEffect(() => {
    const checkNetwork = async () => {
      if (!sdk) return;
      try {
        const chainId = await sdk.wallet.getChainId();
        setIsOnOptimism(chainId === OPTIMISM_CHAIN_ID);
        setNetworkError("");
      } catch (error) {
        console.error("Error checking network:", error);
        setIsOnOptimism(false);
      }
    };

    if (address && sdk) {
      checkNetwork();
    }
  }, [address, sdk, isMismatched]);

  // Add auto network switch - NEW
  useEffect(() => {
    if (isMismatched && address) {
      handleSwitchNetwork();
    }
  }, [isMismatched, address]);

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

  // Function to handle minting - FIXED
  const handleMint = async () => {
    if (!address || !contract) {
      setErrorMessage("Please connect your wallet");
      return;
    }

    if (isContractLoading) {
      setErrorMessage("Contract is still loading. Please wait.");
      return;
    }

    if (!allowedPaths.includes(narrativePath)) {
      setErrorMessage("Invalid narrative path");
      return;
    }

    if (sanitizedPath !== narrativePath) {
      setErrorMessage("Invalid characters in narrative path");
      return;
    }

    setMintStatus("pending");
    setErrorMessage("");

    try {
      // Create metadata that now includes the image URL based on narrative path
      const metadataUriWithImage = createMetadata(address, narrativePath, mojoScore);

      // Call mintTo with the correct parameters (using the generated metadataUriWithImage)
      const mintTx = await mintTo({
        args: [address, metadataUriWithImage, mojoScore, sanitizedPath],
        overrides: {
          value: mintFee, // FIXED: Use mintFee instead of EXPECTED_MINT_FEE_WEI
        },
      });

      console.log("Mint transaction:", mintTx);

      if (!mintTx || !mintTx.receipt) {
        throw new Error("Mint transaction failed - no receipt received");
      }

      setTxHash(mintTx.receipt.transactionHash);
      setMintStatus("success");

      // Award Mojo tokens after successful mint
      setTimeout(async () => {
        try {
          await handleAwardMojoTokens();
        } catch (error) {
          console.error("Error awarding tokens:", error);
          setTokenAwardStatus("error");
        }
      }, 5000);

    } catch (error) {
      console.error("Mint error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
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
          !address ||
          mintStatus === "pending" ||
          mintStatus === "success" ||
          isContractLoading ||
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
          {mintFee &&
            ` Mint fee: ${formatMintFee(mintFee)} ETH`}
        </p>
      )}

      {renderOwnerSection()}
    </div>
  );
};

export default MintNFT;