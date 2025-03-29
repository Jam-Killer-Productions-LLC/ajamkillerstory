// src/components/MintNFT.tsx
import React, { useState, useEffect } from "react";
import { useAddress, useContract, useContractWrite, useContractRead, useSDK } from "@thirdweb-dev/react";
import contractAbi from "../contractAbi.json";

const NFT_CONTRACT_ADDRESS = "0xfA2A3452D86A9447e361205DFf29B1DD441f1821";
const MOJO_TOKEN_CONTRACT_ADDRESS = "0xf9e7D3cd71Ee60C7A3A64Fa7Fcb81e610Ce1daA5";
const CONTRACT_OWNER_ADDRESS = "0x2af17552f27021666BcD3E5Ba65f68CB5Ec217fc";

// Create event listener for transaction events
const listenForTransactionEvents = (transactionHash: string) => {
    console.log(`Setting up listeners for transaction: ${transactionHash}`);
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
    switch(path) {
        case "A": baseScore = 8000; break;
        case "B": baseScore = 7500; break;
        case "C": baseScore = 8500; break;
        default: baseScore = 5000;
    }
    
    // Add a bonus for early adoption (this is just an example, you could use other factors)
    const currentTime = Date.now();
    const launchTime = new Date('2023-12-01').getTime(); // Example launch date
    const timeBonus = Math.max(0, Math.min(1500, Math.floor((launchTime - currentTime) / (1000 * 60 * 60 * 24) * 100)));
    
    // Calculate final score, capped at 10,000
    const finalScore = Math.min(10000, baseScore + timeBonus);
    
    console.log(`Mojo Score calculation: baseScore=${baseScore}, timeBonus=${timeBonus}, finalScore=${finalScore}`);
    
    return finalScore;
};

// Simplified uploadToIPFS function - we won't actually upload since we're using the existing base token
const uploadToIPFS = async (metadata: any): Promise<string> => {
    console.log("Would upload metadata in a real implementation:", metadata);
    // For testing, just return the original URI without modification
    return metadata.image || "ipfs://baseUriForMetadata";
};

const MintNFT: React.FC<MintNFTProps> = ({ metadataUri, narrativePath }) => {
    const address = useAddress();
    const sdk = useSDK();
    
    // Initialize contract
    const { contract, isLoading: isContractLoading } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
    
    // Setup both needed contract functions
    const { mutateAsync: mintNFT, isLoading: isMintPending } = useContractWrite(contract, "mintNFT");
    const { mutateAsync: finalizeNFT, isLoading: isFinalizePending } = useContractWrite(contract, "finalizeNFT");
    const isPending = isMintPending || isFinalizePending;
    
    const { data: mintFee, isLoading: isMintFeeLoading } = useContractRead(contract, "MINT_FEE");
    
    // Setup Mojo token contract for awarding tokens
    const { contract: mojoContract } = useContract(MOJO_TOKEN_CONTRACT_ADDRESS);
    
    const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [mojoScore, setMojoScore] = useState<number>(0);
    const [tokenAwardStatus, setTokenAwardStatus] = useState<"pending" | "success" | "error" | "idle">("idle");
    const [tokenTxHash, setTokenTxHash] = useState<string>("");
    const [isWalletReady, setIsWalletReady] = useState<boolean>(false);
    const [isOwner, setIsOwner] = useState<boolean>(false);
    const [withdrawStatus, setWithdrawStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [withdrawTxHash, setWithdrawTxHash] = useState<string>("");
    
    // Check wallet readiness
    useEffect(() => {
        const checkWallet = async () => {
            if (!address || !sdk) {
                setIsWalletReady(false);
                return;
            }
            
            try {
                const wallet = sdk.wallet;
                if (!wallet) {
                    setIsWalletReady(false);
                    return;
                }
                
                // Check if the wallet is properly connected
                try {
                    // Simple balance check to verify wallet connection
                    const balance = await wallet.balance();
                    setIsWalletReady(!!balance);
                } catch (error) {
                    console.error("Wallet connection check failed:", error);
                    setIsWalletReady(false);
                }
            } catch (error) {
                console.error("Error checking wallet readiness:", error);
                setIsWalletReady(false);
            }
        };
        
        checkWallet();
    }, [address, sdk]);

    // Check if current user is the contract owner
    useEffect(() => {
        const checkOwner = async () => {
            if (!address || !contract) return;
            try {
                // Try to read owner from contract
                const ownerAddress = await contract.call("owner");
                const isCurrentUserOwner = ownerAddress.toLowerCase() === address.toLowerCase();
                setIsOwner(isCurrentUserOwner);
                console.log(`Current user is${isCurrentUserOwner ? '' : ' not'} the contract owner`);
            } catch (error) {
                console.error("Error checking if user is owner:", error);
                // Fallback to hardcoded owner address
                setIsOwner(address.toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase());
            }
        };
        
        checkOwner();
    }, [address, contract]);

    // Initialize mojo score when narrative path is available
    useEffect(() => {
        if (narrativePath) {
            const score = calculateMojoScore(narrativePath);
            setMojoScore(score);
            console.log(`Calculated Mojo Score: ${score} for path ${narrativePath}`);
        }
    }, [narrativePath]);

    const formatMintFee = (fee: any) => {
        if (!fee) return "0";
        // Convert from wei to ETH and format to 6 decimal places
        return (Number(fee) / 1e18).toFixed(6);
    };

    // Function to award Mojo tokens - with retry logic and better error handling
    const awardMojoTokens = async () => {
        if (!address) return;
        
        // Set up retry parameters
        const maxRetries = 3;
        const retryDelay = 3000; // 3 seconds
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                setTokenAwardStatus("pending");
                console.log(`Mojo token award attempt ${attempt}/${maxRetries}...`);
                console.log("Sending request to token reward endpoint with data:", {
                    address: address,
                    mojoScore: mojoScore
                });
                
                // Add a timeout to the fetch request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await fetch("https://mojotokenrewards.producerprotocol.pro/mint", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ 
                        address: address,
                        mojoScore: mojoScore 
                    }),
                    signal: controller.signal
                }).finally(() => clearTimeout(timeoutId));
                
                console.log("Token reward endpoint response status:", response.status);
                
                // Try to parse response as JSON first
                let responseText = await response.text();
                console.log("Raw response:", responseText);
                
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                    console.log("Parsed response:", responseData);
                } catch (parseError) {
                    console.error("Failed to parse response as JSON:", responseText);
                    responseData = { error: responseText || "Unknown error" };
                }
                
                if (!response.ok) {
                    throw new Error(responseData.error || `Failed to mint tokens: ${response.status}`);
                }
                
                // If we made it here, the response is OK and parsed
                if (responseData.success) {
                    setTokenTxHash(responseData.txHash || "No transaction hash provided");
                    setTokenAwardStatus("success");
                    console.log("Mojo tokens awarded successfully!", responseData);
                    return; // Exit the retry loop on success
                } else {
                    throw new Error(responseData.error || "Failed to award tokens");
                }
                
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                console.error(`Mojo token award attempt ${attempt} failed:`, errorMessage);
                
                // Check if this is our last attempt
                if (attempt === maxRetries) {
                    console.error("All Mojo token award attempts failed");
                    setErrorMessage(`Error awarding Mojo tokens: ${errorMessage}`);
                    setTokenAwardStatus("error");
                    
                    // Show a more user-friendly message for RPC errors
                    if (errorMessage.includes("RPC") || 
                        errorMessage.includes("SERVER_ERROR") || 
                        errorMessage.includes("missing response")) {
                        setErrorMessage("Unable to connect to the blockchain network. Please try again later or contact support. Your NFT was minted successfully, but Mojo tokens couldn't be awarded at this time.");
                    }
                } else {
                    // Not the last attempt, wait before retrying
                    console.log(`Waiting ${retryDelay/1000} seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
    };

    // Function to withdraw contract balance to owner
    const handleWithdrawFunds = async () => {
        if (!address || !contract || !isOwner || !sdk) {
            setErrorMessage("Only the contract owner can withdraw funds");
            return;
        }
        
        setWithdrawStatus("pending");
        try {
            console.log("Attempting to withdraw funds to contract owner...");
            
            // Check if contract has a withdraw function
            let withdrawTx;
            try {
                // Try calling a standard withdraw function if it exists
                withdrawTx = await contract.call("withdraw");
            } catch (error) {
                console.error("No standard withdraw function found, trying custom approach:", error);
                
                // If no withdraw function, we need to try a different approach
                // Since we can't directly transfer funds from the contract without a withdraw function,
                // we should inform the owner to add this functionality to the contract
                throw new Error("The contract does not have a withdraw function. Please deploy an updated contract with withdrawal functionality or contact the developer to add this feature.");
            }
            
            console.log("Withdrawal transaction:", withdrawTx);
            if (withdrawTx && (withdrawTx.hash || withdrawTx.transactionHash)) {
                setWithdrawTxHash(withdrawTx.hash || withdrawTx.transactionHash);
                setWithdrawStatus("success");
            } else {
                throw new Error("Transaction completed but no transaction hash was returned");
            }
            
        } catch (error: any) {
            console.error("Error withdrawing funds:", error);
            setErrorMessage(`Error withdrawing funds: ${error.message || "Unknown error"}`);
            setWithdrawStatus("error");
        }
    };

    const handleMint = async () => {
        // Reset states
        setErrorMessage("");
        
        // Validation checks
        if (!address) {
            setErrorMessage("Please connect your wallet");
            return;
        }

        if (!isWalletReady) {
            setErrorMessage("Your wallet is not properly connected. Please reconnect your wallet.");
            return;
        }

        if (!allowedPaths.includes(narrativePath)) {
            setErrorMessage("Invalid narrative path");
            return;
        }

        if (!metadataUri || !metadataUri.startsWith("ipfs://")) {
            setErrorMessage("Invalid metadata URI");
            return;
        }
        
        // Check if contract is loaded
        if (isContractLoading || !contract) {
            setErrorMessage("Contract is still loading. Please wait.");
            return;
        }
        
        // Check if mint fee is loaded
        if (isMintFeeLoading || mintFee === undefined) {
            setErrorMessage("Mint fee information is still loading. Please wait.");
            return;
        }

        // Ensure we have a mojo score
        if (mojoScore === 0) {
            setMojoScore(calculateMojoScore(narrativePath));
        }

        setMintStatus("pending");
        try {
            console.log("Minting with:", {
                address,
                narrativePath,
                metadataUri,
                mintFee: mintFee?.toString() || "0",
                mojoScore,
            });

            // Instead of sending fee separately, pass it directly in the mintNFT call
            const mintTx = await mintNFT({
                args: [address, narrativePath],
                overrides: {
                    value: mintFee,
                    gasLimit: 1000000,
                },
            });

            console.log("mintNFT transaction submitted:", mintTx);

            if (!mintTx || !mintTx.receipt) {
                throw new Error(
                    "mintNFT transaction was submitted but no receipt was returned",
                );
            }

            // Finalize NFT by passing metadata URI
            const finalizeTx = await finalizeNFT({
                args: [address, metadataUri, narrativePath],
                overrides: { gasLimit: 1000000 },
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

            // Set a small delay before awarding tokens to ensure the mint transaction is fully processed
            console.log("Setting a delay before awarding Mojo tokens...");
            setTimeout(async () => {
                try {
                    // Award Mojo tokens after successful mint
                    await awardMojoTokens();
                } catch (tokenError) {
                    console.error("Error in delayed token award:", tokenError);
                    setErrorMessage(tokenError instanceof Error ? 
                        `Error awarding tokens: ${tokenError.message}` : 
                        "Unknown error awarding tokens");
                    setTokenAwardStatus("error");
                }
            }, 5000); // Increase to 5 second delay

            // We don't need to update metadata since we're using the base token's metadata
            console.log("Using base token metadata, no updates needed");
        } catch (error: any) {
            console.error("Minting error:", error);
            let errorMsg =
                error.message || "Unknown error occurred";
            if (errorMsg.includes("insufficient funds")) {
                errorMsg =
                    "Insufficient funds to cover the mint fee and gas. Please add more ETH to your wallet.";
            } else if (errorMsg.toLowerCase().includes("revert")) {
                errorMsg = `Transaction reverted by the contract. Details: ${errorMsg}`;
            }
            setErrorMessage(errorMsg);
            setMintStatus("error");
        }
    };

    const renderMintStatus = () => {
        switch (mintStatus) {
            case "pending":
                return <div className="mint-status pending">Minting your NFT... Please wait and confirm the transaction in your wallet.</div>;
            case "success":
                return (
                    <div className="mint-status success">
                        <p>🎉 NFT minted successfully!</p>
                        <p>Mojo Score: <span className="mojo-score">{mojoScore}</span></p>
                        <a 
                            href={`https://optimistic.etherscan.io/tx/${txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="tx-link"
                        >
                            View transaction on Etherscan
                        </a>
                        
                        {tokenAwardStatus === "pending" && (
                            <p className="token-award-status">Awarding {mojoScore} Mojo tokens to your wallet... (This may take a moment)</p>
                        )}
                        
                        {tokenAwardStatus === "success" && (
                            <div className="token-award-status success">
                                <p>🎁 {mojoScore} Mojo tokens awarded successfully!</p>
                                <a 
                                    href={`https://optimistic.etherscan.io/tx/${tokenTxHash}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="tx-link"
                                >
                                    View token transaction on Etherscan
                                </a>
                            </div>
                        )}
                        
                        {tokenAwardStatus === "error" && (
                            <div className="token-award-status error">
                                <p>Your NFT was minted successfully, but there was an issue awarding Mojo tokens.</p>
                                <p>You can try again later or contact support with the transaction hash above.</p>
                                {errorMessage && <p className="error-details">{errorMessage}</p>}
                            </div>
                        )}
                    </div>
                );
            case "error":
                return (
                    <div className="mint-status error">
                        <p>Minting failed. Please try again.</p>
                        {errorMessage && <p className="error-details">{errorMessage}</p>}
                    </div>
                );
            default:
                return null;
        }
    };

    // Additional contract/wallet status messages
    const renderPreMintStatus = () => {
        if (isContractLoading) {
            return <p className="mint-info">Loading contract data...</p>;
        }
        
        if (!isWalletReady && address) {
            return <p className="mint-info">Please ensure your wallet is properly connected to the Optimism network.</p>;
        }
        
        return null;
    };

    // Render owner section with withdraw button
    const renderOwnerSection = () => {
        if (!isOwner) return null;
        
        return (
            <div className="owner-section">
                <h3>Contract Owner Functions</h3>
                <button 
                    onClick={handleWithdrawFunds}
                    disabled={withdrawStatus === "pending"}
                    className="withdraw-button"
                >
                    {withdrawStatus === "pending" ? "Withdrawing..." : "Withdraw Contract Funds"}
                </button>
                
                {withdrawStatus === "success" && (
                    <div className="withdraw-status success">
                        <p>✅ Funds withdrawn successfully!</p>
                        <a 
                            href={`https://optimistic.etherscan.io/tx/${withdrawTxHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="tx-link"
                        >
                            View transaction on Etherscan
                        </a>
                    </div>
                )}
                
                {withdrawStatus === "error" && (
                    <div className="withdraw-status error">
                        <p>Failed to withdraw funds. Error: {errorMessage}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mint-nft-container">
            {renderMintStatus()}
            {renderPreMintStatus()}
            
            {mintStatus !== "success" && (
                <div className="mojo-score-preview">
                    <p>Expected Mojo Score: <span className="mojo-score">{mojoScore}</span></p>
                    <p className="mojo-description">After minting, you'll receive <span className="mojo-score">{mojoScore}</span> Mojo tokens based on your engagement!</p>
                </div>
            )}
            
            <button 
                onClick={handleMint}
                disabled={isPending || !address || mintStatus === "pending" || mintStatus === "success" || isContractLoading || !isWalletReady}
                className={`mint-button ${mintStatus === "success" ? "success" : ""}`}
            >
                {isPending || mintStatus === "pending" ? "Minting..." : 
                 mintStatus === "success" ? "Minted Successfully!" : "Mint NFT"}
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