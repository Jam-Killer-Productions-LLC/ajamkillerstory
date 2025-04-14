/**
 * MintNFT.tsx
 *
 * A React component for minting an NFT on the Optimism network using a Thirdweb contract.
 * This version dynamically builds the NFT metadata as a Base64‑encoded JSON string.
 * The metadata JSON includes an "image" field that is set to a plain HTTPS URL (the media URI),
 * while the entire JSON is Base64‑encoded and returned as the token URI.
 */

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

// Configuration Constants
const NFT_CONTRACT_ADDRESS: string = "0x914B1339944D48236738424e2dbdbb72a212B2F5";
const OPTIMISM_CHAIN_ID: number = 10;

// Allowed narrative paths and their associated media URLs.
const allowedPaths: string[] = ["A", "B", "C"];
const IMAGE_URLS: Record<string, string> = {
  A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
  B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
  C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
};

/**
 * Creates a Base64‑encoded JSON metadata string for the NFT.
 *
 * @param path - The narrative path selected ("A", "B", or "C").
 * @param narrative - A narrative description (for example, the sanitized narrative text).
 * @param mojoScore - The calculated mojo score.
 * @returns A token URI in the format "data:application/json;base64,<encoded JSON>".
 *
 * Note: The "image" field in the JSON is assigned a plain HTTPS media URL from IMAGE_URLS.
 * Only the entire JSON is Base64‑encoded; the media URL remains a regular URL.
 */
const createNFTMetadata = (
  path: string,
  narrative: string,
  mojoScore: number
): string => {
  // Use the plain HTTPS URL from IMAGE_URLS as the media URI.
  const image: string = IMAGE_URLS[path];
  const metadata = {
    name: `Don't Kill The Jam NFT - Path ${path}`,
    description: `Narrative: ${narrative}. Mojo Score: ${mojoScore}`,
    image, // This is the media URL as an HTTPS string.
    attributes: [
      { trait_type: "Mojo Score", value: mojoScore },
      { trait_type: "Narrative Path", value: path },
    ],
  };
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
};

/**
 * Props for MintNFT component.
 */
interface MintNFTProps {
  /** The narrative path chosen by the user ("A", "B", or "C"). */
  narrativePath: string;
}

/**
 * MintNFT Component.
 *
 * Renders a UI for minting an NFT on Optimism. The component uses the narrative path
 * to dynamically build the token URI, which is a Base64‑encoded JSON containing the metadata.
 * The media URL in the metadata is provided as a plain HTTPS URL.
 */
const MintNFT: FC<MintNFTProps> = ({ narrativePath }) => {
  const address: string | undefined = useAddress();
  const [, switchNetwork] = useNetwork();

  // Local state variables.
  const [isOnOptimism, setIsOnOptimism] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string>("");
  const [sanitizedPath, setSanitizedPath] = useState<string>("");
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mojoScore, setMojoScore] = useState<number>(0);
  const [txHash, setTxHash] = useState<string>("");
  const [isMinting, setIsMinting] = useState<boolean>(false);

  // Load the contract using the existing logic.
  const { contract } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
  console.log("MintNFT: contract instance", contract);

  // Use the original overload for "mintTo".
  const { mutateAsync: mintTo } = useContractWrite(contract, "mintTo");
  const { data: mintFee, isLoading: isMintFeeLoading } = useContractRead(contract, "mintFee");

  // Setup narrative and calculate mojo score.
  useEffect(() => {
    if (!narrativePath || !allowedPaths.includes(narrativePath)) {
      setErrorMessage("Invalid narrative path");
      setMintStatus("error");
      return;
    }
    setSanitizedPath(narrativePath);
    setMojoScore(calculateMojoScore(narrativePath));
  }, [narrativePath]);

  // Ensure the wallet is connected to Optimism.
  useEffect(() => {
    const checkNetwork = async (): Promise<void> => {
      if (!window.ethereum) {
        setNetworkError("No wallet detected");
        return;
      }
      try {
        const chainIdHex: string = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string;
        const chainId: number = parseInt(chainIdHex, 16);
        setIsOnOptimism(chainId === OPTIMISM_CHAIN_ID);
        setNetworkError(chainId !== OPTIMISM_CHAIN_ID ? "Switch to Optimism" : "");
      } catch {
        setIsOnOptimism(false);
        setNetworkError("Can't verify network");
      }
    };
    if (address) checkNetwork();
  }, [address]);

  /**
   * Handles network switching.
   */
  const handleSwitchNetwork = async (): Promise<void> => {
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

  /**
   * Initiates the minting process.
   */
  const handleMint = useCallback(async (): Promise<void> => {
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
      // Create the token URI dynamically using the narrative path, sanitized narrative, and mojo score.
      // The token URI is a Base64‑encoded JSON string. The "image" field inside that JSON is a plain HTTPS URL.
      const tokenURI: string = createNFTMetadata(narrativePath, sanitizedPath, mojoScore);

      // Use the contract's mint fee if available, otherwise fallback to 0.000777 ETH in wei.
      const fee: BigNumber =
        mintFee && BigNumber.from(mintFee).gt(0)
          ? BigNumber.from(mintFee)
          : BigNumber.from("777000000000000");

      console.log("Minting NFT with parameters:", {
        address,
        tokenURI,
        mojoScore,
        narrative: sanitizedPath,
        fee: fee.toString(),
      });

      const tx = await mintTo({
        args: [address, tokenURI, mojoScore, sanitizedPath],
        overrides: { value: fee },
      });

      if (!tx || !tx.receipt) {
        throw new Error("Mint transaction failed");
      }
      const receipt = tx.receipt;
      console.log("Mint receipt:", receipt);

      // Validate that exactly one Transfer event is emitted.
      const transferEvents = receipt.logs.filter(
        (log: any) =>
          log.topics && log.topics[0].includes("Transfer")
      );
      if (transferEvents.length !== 1) {
        console.warn("Unexpected number of Transfer events:", transferEvents.length);
        throw new Error("Multiple mint events detected");
      }
      setTxHash(receipt.transactionHash);
      setMintStatus("success");
    } catch (error: unknown) {
      console.error("Error minting NFT:", error);
      let message: string = "Minting failed";
      if (error instanceof Error) {
        message = error.message;
      }
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
    }
  }, [address, contract, sanitizedPath, isMinting, narrativePath, mojoScore, mintFee]);

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
          Mint your NFT on Optimism.{" "}
          {isMintFeeLoading ? "Loading fee..." : `Fee: ${formatMintFee(mintFee)}`}
        </p>
      )}
    </div>
  );
};

export default MintNFT;