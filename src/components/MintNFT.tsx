// src/components/MintNFT.tsx
import React, { useState, useEffect } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  useContractRead,
  useSDK,
} from "@thirdweb-dev/react";
import contractAbi from "../contractAbi.json";

const NFT_CONTRACT_ADDRESS =
  "0xfA2A3452D86A9447e361205DFf29B1DD441f1821";
const MOJO_TOKEN_CONTRACT_ADDRESS =
  "0xf9e7D3cd71Ee60C7A3A64Fa7Fcb81e610Ce1daA5";
const CONTRACT_OWNER_ADDRESS =
  "0x2af17552f27021666BcD3E5Ba65f68CB5Ec217fc";

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

const MintNFT: React.FC<MintNFTProps> = ({
  metadataUri,
  narrativePath,
}) => {
  const address = useAddress();
  const sdk = useSDK();

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
  const isPending = isMintPending || isFinalizePending;

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

  // Rest of the existing code remains the same until handleMint function

  const handleMint = async () => {
    // Reset states
    setErrorMessage("");

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

    if (
      !metadataUri ||
      !metadataUri.startsWith("ipfs://")
    ) {
      setErrorMessage("Invalid metadata URI");
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

    // Ensure we have a mojo score
    if (mojoScore === 0) {
      setMojoScore(calculateMojoScore(narrativePath));
    }

    setMintStatus("pending");
    try {
      // Create final metadata with custom name and attributes
      const finalMetadata = {
        name: `Don't Kill the Jam : ${narrativePath}`,
        image: metadataUri,
        attributes: [
          { trait_type: "Mojo Score", value: mojoScore },
          { trait_type: "Narrative", value: narrativePath },
        ],
      };

      // Convert metadata to base64 data URI
      const metadataString = JSON.stringify(finalMetadata);
      const metadataBase64 = btoa(metadataString);
      const finalMetadataUri = `data:application/json;base64,${metadataBase64}`;

      console.log("Minting with:", {
        address,
        narrativePath,
        finalMetadataUri,
        mintFee: mintFee?.toString() || "0",
        mojoScore,
      });

      // Make sure we're using the right chain (Optimism)
      const currentChain = await sdk?.wallet.getChainId();
      console.log("Current chain ID:", currentChain);
      if (currentChain !== 10) {
        // 10 is Optimism's chain ID
        throw new Error(
          "Please connect to the Optimism network to mint.",
        );
      }

      // Pass mint fee in the transaction
      const mintTx = await mintNFT({
        args: [address, narrativePath],
        overrides: {
          value: mintFee,
        },
      });

      console.log("mintNFT transaction submitted:", mintTx);

      if (!mintTx || !mintTx.receipt) {
        throw new Error(
          "mintNFT transaction was submitted but no receipt was returned",
        );
      }

      // Finalize NFT with the generated metadata URI
      const finalizeTx = await finalizeNFT({
        args: [address, finalMetadataUri, narrativePath],
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
          await awardMojoTokens();
        } catch (tokenError) {
          console.error(
            "Error in delayed token award:",
            tokenError,
          );
        }
      }, 5000);
    } catch (error) {
      console.error("Minting error:", error);
      let errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown error occurred";
      if (errorMsg.includes("insufficient funds")) {
        errorMsg =
          "Insufficient funds to cover the mint fee and gas. Please add more ETH to your wallet.";
      } else if (
        errorMsg.toLowerCase().includes("revert")
      ) {
        errorMsg = `Transaction reverted by the contract. Details: ${errorMsg}`;
      }
      setErrorMessage(errorMsg);
      setMintStatus("error");
    }
  };

  // Rest of the code remains exactly the same as in the original file

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
          !isWalletReady
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
