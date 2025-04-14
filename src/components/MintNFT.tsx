import React, { useState, useEffect } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  useContractRead,
  useNetwork,
  useNetworkMismatch,
} from "@thirdweb-dev/react";
import contractAbi from "../contractAbi.json";

const NFT_CONTRACT_ADDRESS = "0x914b1339944d48236738424e2dbdbb72a212b2f5";
const CONTRACT_OWNER_ADDRESS = "0x2af17552f27021666BcD3E5Ba65f68Cb5Ec217fc";
const OPTIMISM_CHAIN_ID = 10;

const IMAGE_URLS: { [key: string]: string } = {
  A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
  B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
  C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif",
};

const allowedPaths = ["A", "B", "C"];

const calculateMojoScore = (path: string): number => {
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

  const currentTime = Date.now();
  const launchTime = new Date("2023-12-01").getTime();
  const timeBonus = Math.max(
    0,
    Math.min(
      1500,
      Math.floor(((launchTime - currentTime) / (1000 * 60 * 60 * 24)) * 100),
    ),
  );

  return Math.min(10000, baseScore + timeBonus);
};

const formatMintFee = (fee: any): string => {
  if (!fee) return "0";
  try {
    return (Number(fee.toString()) / 1e18).toFixed(4);
  } catch (error) {
    return "0";
  }
};

const awardMojoTokensService = async (data: {
  address: string;
  mojoScore: number;
  narrativePath: string;
}): Promise<{ txHash: string }> => {
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

  return await response.json();
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
    address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % nameOptions.length;
  
  return nameOptions[nameIndex];
};

const sanitizeNarrative = (narrative: string): string => {
  return narrative
    .replace(/[^\w\s.,!?-]/gi, "")
    .trim()
    .slice(0, 500);
};

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

  return JSON.stringify(metadata);
};

interface MintNFTProps {
  narrativePath: string;
}

const MintNFT: React.FC<MintNFTProps> = ({ narrativePath }) => {
  const address = useAddress();
  const [, switchNetwork] = useNetwork();
  const isMismatched = useNetworkMismatch();
  const [networkError, setNetworkError] = useState<string>("");
  const [sanitizedPath, setSanitizedPath] = useState<string>("");
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mojoScore, setMojoScore] = useState<number>(0);
  const [tokenAwardStatus, setTokenAwardStatus] = useState<"pending" | "success" | "error" | "idle">("idle");
  const [tokenTxHash, setTokenTxHash] = useState<string>("");
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [withdrawTxHash, setWithdrawTxHash] = useState<string>("");

  const { contract, isLoading: isContractLoading } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
  const { mutateAsync: callContract } = useContractWrite(contract);
  const { data: mintFee } = useContractRead(contract, "MINT_FEE");

  useEffect(() => {
    setIsOwner(address?.toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase());
  }, [address]);

  useEffect(() => {
    if (narrativePath) {
      setMojoScore(calculateMojoScore(narrativePath));
    }
  }, [narrativePath]);

  useEffect(() => {
    if (narrativePath) {
      setSanitizedPath(sanitizeNarrative(narrativePath));
    }
  }, [narrativePath]);

  useEffect(() => {
    if (isMismatched && address) {
      handleSwitchNetwork();
    }
  }, [isMismatched, address]);

  const handleSwitchNetwork = async () => {
    setNetworkError("");
    try {
      if (!switchNetwork) {
        throw new Error("Network switching not available in your wallet");
      }
      await switchNetwork(OPTIMISM_CHAIN_ID);
    } catch (error) {
      setNetworkError(error instanceof Error ? error.message : "Failed to switch networks. Please switch manually in your wallet.");
    }
  };

  const renderError = (message: string) => (
    <div className="error-details">
      <p>{message}</p>
    </div>
  );

  const renderMintStatus = () => {
    if (mintStatus === "idle") return null;

    return (
      <div className={`mint-status ${mintStatus}`}>
        {mintStatus === "pending" && (
          <p>Minting your NFT... Please wait and don't close this window.</p>
        )}
        {mintStatus === "success" && (
          <div>
            <p>Your NFT has been successfully minted! 🎉</p>
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
                <p>Awarding your Mojo tokens... Please wait.</p>
              </div>
            )}
            {tokenAwardStatus === "success" && (
              <div className="token-award-status success">
                <p>{mojoScore} Mojo tokens have been awarded to your wallet! 🎉</p>
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
                <p>There was an issue awarding your Mojo tokens. Please contact support.</p>
              </div>
            )}
          </div>
        )}
        {mintStatus === "error" && renderError(`Error minting your NFT: ${errorMessage}`)}
      </div>
    );
  };

  const renderPreMintStatus = () => {
    if (mintStatus !== "idle") return null;

    if (!address) {
      return (
        <div className="connect-prompt">
          <p>Please connect your wallet to mint an NFT.</p>
        </div>
      );
    }

    if (isMismatched) {
      return (
        <div className="network-prompt">
          <p>Please switch your wallet to the Optimism network to mint your NFT.</p>
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
          {networkError && <p className="network-error">{networkError}</p>}
        </div>
      );
    }

    return null;
  };

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
          {withdrawStatus === "pending" ? "Withdrawing..." : "Withdraw Contract Balance"}
        </button>
        {withdrawStatus === "success" && (
          <div className="withdraw-status success">
            <p>Funds have been successfully withdrawn! 🎉</p>
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
        {withdrawStatus === "error" && renderError(`Error withdrawing funds: ${errorMessage}`)}
      </div>
    );
  };

  const handleWithdraw = async () => {
    if (!isOwner || !contract) return;

    setWithdrawStatus("pending");
    setErrorMessage("");

    try {
      const withdrawTx = await callContract({ functionName: "withdraw", args: {} });
      
      if (!withdrawTx || !withdrawTx.receipt) {
        throw new Error("Withdrawal transaction submitted but no receipt was returned");
      }

      setWithdrawTxHash(withdrawTx.receipt.transactionHash);
      setWithdrawStatus("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      setWithdrawStatus("error");
    }
  };

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
      const metadataUri = createMetadata(address, narrativePath, mojoScore);

      const mintTx = await callContract({
        functionName: "mintTo",
        args: [address, metadataUri, mojoScore, sanitizedPath],
        overrides: { value: mintFee },
      });

      if (!mintTx || !mintTx.receipt) {
        throw new Error("Mint transaction failed - no receipt received");
      }

      setTxHash(mintTx.receipt.transactionHash);
      setMintStatus("success");

      setTimeout(async () => {
        try {
          await handleAwardMojoTokens();
        } catch {
          setTokenAwardStatus("error");
        }
      }, 5000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      setMintStatus("error");
    }
  };

  const handleAwardMojoTokens = async () => {
    if (!address || mojoScore <= 0 || !sanitizedPath) return;

    setTokenAwardStatus("pending");
    try {
      const result = await awardMojoTokensService({ address, mojoScore, narrativePath: sanitizedPath });
      setTokenTxHash(result.txHash || '');
      setTokenAwardStatus("success");
    } catch {
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
            Expected Mojo Score: <span className="mojo-score">{mojoScore}</span>
          </p>
          <p className="mojo-description">
            After minting, you'll receive <span className="mojo-score">{mojoScore}</span> Mojo tokens based on your engagement!
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
          isMismatched
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
          Minting will create your unique NFT on the Optimism blockchain.
          {mintFee && ` Mint fee: ${formatMintFee(mintFee)} ETH`}
        </p>
      )}

      {renderOwnerSection()}
    </div>
  );
};

export default MintNFT;