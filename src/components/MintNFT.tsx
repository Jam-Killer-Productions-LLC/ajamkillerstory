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

    // Function to withdraw contract balance to owner
    const handleWithdrawFunds = async () => {
        if (!address || !contract || !isOwner || !sdk) {
            setErrorMessage("Only the contract owner can withdraw funds");
            return;
        }
        
        setWithdrawStatus("pending");
        try {
            console.log("Attempting to withdraw funds to contract owner...");
            
            // Create a custom function call to withdraw funds
            const withdrawTx = await contract.call("withdraw");
            
            console.log("Withdrawal transaction:", withdrawTx);
            if (withdrawTx) {
                const hash = typeof withdrawTx === 'object' && withdrawTx !== null && 'receipt' in withdrawTx && withdrawTx.receipt
                    ? withdrawTx.receipt.transactionHash
                    : typeof withdrawTx === 'string'
                    ? withdrawTx
                    : '';
                        
                setWithdrawTxHash(hash);
                setWithdrawStatus("success");
            } else {
                throw new Error("Transaction completed but no transaction hash was returned");
            }
            
        } catch (error) {
            console.error("Error withdrawing funds:", error);
            setErrorMessage(`Error withdrawing funds: ${error instanceof Error ? error.message : "Unknown error"}`);
            setWithdrawStatus("error");
        }
    };

    // Function to award Mojo tokens
    const awardMojoTokens = async () => {
        if (!address) return;
        
        setTokenAwardStatus("pending");
        try {
            console.log("Awarding Mojo tokens to wallet:", address);
            console.log("Mojo score:", mojoScore);
            
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
            
            if (!response.ok) {
                throw new Error(`Failed to mint tokens: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Token mint response:", data);
            
            if (data.success) {
                setTokenTxHash(data.txHash || "");
                setTokenAwardStatus("success");
            } else {
                throw new Error(data.error || "Failed to award tokens");
            }
        } catch (error) {
            console.error("Error awarding tokens:", error);
            setErrorMessage(`Error awarding tokens: ${error instanceof Error ? error.message : "Unknown error"}`);
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

        setMintStatus("pending");
        try {
            console.log("Minting with:", {
                address,
                narrativePath,
                metadataUri,
                mintFee: mintFee?.toString() || "0",
                mojoScore,
            });

            // Make sure we're using the right chain (Optimism)
            const currentChain = await sdk?.wallet.getChainId();
            console.log("Current chain ID:", currentChain);
            if (currentChain !== 10) { // 10 is Optimism's chain ID
                throw new Error("Please connect to the Optimism network to mint.");
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

            // Finalize NFT with metadata
            const finalizeTx = await finalizeNFT({
                args: [address, metadataUri, narrativePath],
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
                    console.error("Error in delayed token award:", tokenError);
                }
            }, 5000);
            
        } catch (error) {
            console.error("Minting error:", error);
            let errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
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