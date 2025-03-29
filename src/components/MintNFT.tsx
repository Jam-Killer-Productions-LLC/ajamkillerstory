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

const MintNFT: React.FC<MintNFTProps> = ({ metadataUri, narrativePath }) => {
    const address = useAddress();
    const sdk = useSDK();
    
    // Initialize contract
    const { contract, isLoading: isContractLoading } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
    
    // Use finalizeNFT instead of mintNFT since we have the metadata URI from IPFS
    const { mutateAsync: finalizeNFT, isLoading: isPending } = useContractWrite(contract, "finalizeNFT");
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

    // Add a utility function to send the mint fee to the contract owner
    const sendMintFeeToOwner = async () => {
        if (!address || !mintFee || !sdk) {
            console.error("Missing required data for sending mint fee:", {
                address: !!address,
                mintFee: !!mintFee,
                sdk: !!sdk
            });
            throw new Error("Wallet not ready or mint fee not loaded");
        }
        
        if (!isWalletReady) {
            throw new Error("Wallet not ready or properly connected");
        }
        
        try {
            // Get the wallet client from SDK
            const wallet = sdk.wallet;
            if (!wallet) {
                throw new Error("Wallet not available");
            }
            
            console.log("Sending mint fee of", formatMintFee(mintFee), "ETH to", CONTRACT_OWNER_ADDRESS);
            
            // Send the transaction
            const tx = await wallet.transfer(
                CONTRACT_OWNER_ADDRESS,
                mintFee
            );
            
            console.log("Mint fee transaction submitted:", tx);
            
            console.log("Mint fee sent to contract owner:", tx);
            return tx;
        } catch (error) {
            console.error("Error sending mint fee to owner:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Check for common wallet errors and provide better messages
            if (errorMessage.includes("insufficient funds")) {
                throw new Error("Insufficient funds to cover the mint fee. Please add more ETH to your wallet.");
            } else if (errorMessage.includes("user rejected")) {
                throw new Error("Transaction was rejected in your wallet.");
            } else {
                throw error;
            }
        }
    };

    // Function to award Mojo tokens
    const awardMojoTokens = async () => {
        if (!address) return;
        
        try {
            setTokenAwardStatus("pending");
            
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
            });
            
            // Try to parse response as JSON first
            let errorData;
            let responseText;
            
            try {
                responseText = await response.text();
                errorData = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Failed to parse response as JSON:", responseText);
                errorData = { error: responseText || "Unknown error" };
            }
            
            if (!response.ok) {
                throw new Error(errorData.error || `Failed to mint tokens: ${response.status}`);
            }
            
            // If we made it here, the response is OK and parsed
            if (errorData.success) {
                setTokenTxHash(errorData.txHash);
                setTokenAwardStatus("success");
            } else {
                throw new Error(errorData.error || "Failed to award tokens");
            }
            
        } catch (error: unknown) {
            console.error("Error awarding Mojo tokens:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setErrorMessage(`Error awarding Mojo tokens: ${errorMessage}`);
            setTokenAwardStatus("error");
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

        // Start the minting process
        setMintStatus("pending");
        try {
            console.log("Minting with:", {
                address,
                narrativePath,
                metadataUri: metadataUri, 
                mintFee: mintFee?.toString() || "0",
                mojoScore
            });
            
            // Additional validation for contract state
            console.log("Contract ready status:", !!contract);
            console.log("Contract address:", NFT_CONTRACT_ADDRESS);
            
            // First, send the mint fee to the contract owner instead of the contract
            console.log("Sending mint fee to contract owner:", CONTRACT_OWNER_ADDRESS);
            
            // We'll try to handle fee transaction separately for better error handling
            let feeTx;
            try {
                feeTx = await sendMintFeeToOwner();
                console.log("Fee transaction successful:", feeTx);
            } catch (feeError) {
                console.error("Fee transaction failed:", feeError);
                const feeErrorMsg = feeError instanceof Error ? feeError.message : String(feeError);
                throw new Error(`Failed to send mint fee: ${feeErrorMsg}`);
            }
            
            // Now call the finalizeNFT function with the proper parameters
            console.log("Preparing to call finalizeNFT with args:", {
                address: address,
                metadataUri: metadataUri,
                narrativePath: narrativePath
            });
            
            // Execute the transaction with finalizeNFT 
            const tx = await finalizeNFT({ 
                args: [
                    address, 
                    String(metadataUri), // Ensure it's a string
                    String(narrativePath) // Ensure it's a string
                ]
            });
            
            console.log("finalizeNFT transaction submitted, waiting for confirmation...");
            
            // Make sure we have a transaction receipt
            if (!tx || !tx.receipt) {
                throw new Error("Transaction was submitted but no receipt was returned");
            }
            
            // Set up event listeners for the transaction
            listenForTransactionEvents(tx.receipt.transactionHash);
            
            console.log("Transaction confirmed, receipt:", tx.receipt);
            setTxHash(tx.receipt.transactionHash);
            setMintStatus("success");
            
            // Log success information to help debug
            console.log("Mint successful:", {
                txHash: tx.receipt.transactionHash,
                blockNumber: tx.receipt.blockNumber,
                feeTransaction: feeTx
            });
            
            // Add the mojo score as an attribute in our metadata
            console.log(`Adding Mojo Score: ${mojoScore} to metadata`);
            
            // Award Mojo tokens after successful mint
            await awardMojoTokens();
            
        } catch (error: any) {
            console.error("Minting error:", error);
            
            // Improve error logging with better formatting
            try {
                // Try to stringify the error object for better debugging
                const errorDetails = JSON.stringify(error, (key, value) => {
                    // Handle circular references
                    if (key === 'cause' && value === error) {
                        return '[Circular Reference]';
                    }
                    return value;
                }, 2);
                console.error("Structured error details:", errorDetails);
            } catch (stringifyError) {
                console.error("Error stringifying error object:", stringifyError);
                console.error("Raw error object:", error);
            }
            
            // Extract more detailed error information if available
            const errorCode = error.code;
            const errorData = error.data;
            console.error("Error code:", errorCode);
            console.error("Error data:", errorData);
            
            // Provide more helpful error messages based on common contract issues
            let errorMsg = error.message || "Unknown error occurred";
            
            if (errorMsg.includes("insufficient funds")) {
                errorMsg = "Insufficient funds to cover the mint fee and gas. Please add more ETH to your wallet.";
            } else if (errorMsg.includes("user rejected") || errorMsg.includes("user denied")) {
                errorMsg = "Transaction was rejected in your wallet.";
            } else if (errorMsg.toLowerCase().includes("revert")) {
                errorMsg = `Transaction reverted by the contract. Possible reasons: already minted, contract paused, or invalid parameters. Details: ${errorMsg}`;
            } else if (error.cause && error.cause.issues) {
                // Handle validation errors
                const issues = error.cause.issues;
                errorMsg = `Validation error: ${JSON.stringify(issues)}`;
            } else if (errorMsg.includes("network") || errorMsg.includes("connection")) {
                errorMsg = "Network connection issue. Please check your internet connection and try again.";
            } else if (errorMsg.includes("gas")) {
                errorMsg = "Gas estimation failed. This might be due to contract constraints or network congestion.";
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
                            <p className="token-award-status">Awarding {mojoScore} Mojo tokens to your wallet...</p>
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
                                <p>Failed to award Mojo tokens. Please contact support.</p>
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
        </div>
    );
};

export default MintNFT;