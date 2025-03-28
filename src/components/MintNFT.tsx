// src/components/MintNFT.tsx
import React, { useState, useEffect } from "react";
import { useAddress, useContract, useContractWrite, useContractRead } from "@thirdweb-dev/react";
import contractAbi from "../contractAbi.json";

const NFT_CONTRACT_ADDRESS = "0xfA2A3452D86A9447e361205DFf29B1DD441f1821";
const MOJO_TOKEN_CONTRACT_ADDRESS = "0xf9e7D3cd71Ee60C7A3A64Fa7Fcb81e610Ce1daA5";

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
    const { contract } = useContract(NFT_CONTRACT_ADDRESS, contractAbi);
    const { mutateAsync: mintNFT, isLoading: isPending } = useContractWrite(contract, "mintNFT");
    const { data: mintFee } = useContractRead(contract, "MINT_FEE");
    
    // Setup Mojo token contract for awarding tokens
    const { contract: mojoContract } = useContract(MOJO_TOKEN_CONTRACT_ADDRESS);
    const { mutateAsync: mintMojoTokens } = useContractWrite(mojoContract, "mintTo");
    
    const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [mojoScore, setMojoScore] = useState<number>(0);
    const [tokenAwardStatus, setTokenAwardStatus] = useState<"pending" | "success" | "error" | "idle">("idle");
    const [tokenTxHash, setTokenTxHash] = useState<string>("");

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

    // Function to award Mojo tokens
    const awardMojoTokens = async () => {
        if (!address || !mojoContract) return;
        
        try {
            setTokenAwardStatus("pending");
            
            // Calculate token amount based on mojoScore
            // The score is out of a possible 10,000 maximum
            // Convert to tokens with 18 decimals (standard for ERC20)
            const tokenAmount = mojoScore.toString() + "000000000000000000"; // mojoScore * 10^18
            
            console.log(`Awarding ${mojoScore} Mojo tokens to ${address} based on Mojo Score`);
            
            // Call the mintTo function on the Mojo token contract using thirdweb
            const tx = await mintMojoTokens({ 
                args: [address, tokenAmount]
            });
            
            console.log("Mojo token award transaction:", tx);
            
            setTokenTxHash(tx.receipt.transactionHash);
            setTokenAwardStatus("success");
            
        } catch (error: any) {
            console.error("Error awarding Mojo tokens:", error);
            setErrorMessage(`Error awarding Mojo tokens: ${error.message}`);
            setTokenAwardStatus("error");
        }
    };

    const handleMint = async () => {
        if (!address) {
            alert("Please connect your wallet");
            return;
        }

        if (!allowedPaths.includes(narrativePath)) {
            alert("Invalid narrative path");
            return;
        }

        if (!metadataUri || !metadataUri.startsWith("ipfs://")) {
            alert("Invalid metadata URI");
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
                metadataUri: metadataUri, // Logging for debugging, but not passing to contract directly
                mintFee: mintFee?.toString() || "0",
                mojoScore
            });
            
            // The contract's mintNFT function only expects the recipient address and path
            // The metadata URI is stored in the worker but not passed directly to the contract
            // When minting, the contract simply creates a token with the specified path
            // The metadata URI will be associated with the token later or retrieved differently
            const tx = await mintNFT({
                args: [address, narrativePath], // Contract only expects 2 arguments: address and path
                overrides: {
                    value: mintFee || "0" // Include the mint fee in the transaction
                }
            });
            setTxHash(tx.receipt.transactionHash);
            setMintStatus("success");
            
            // Log success information to help debug
            console.log("Mint successful:", {
                txHash: tx.receipt.transactionHash,
                blockNumber: tx.receipt.blockNumber
            });
            
            // Add the mojo score as an attribute in our metadata
            // In a real implementation, you would update the metadata on IPFS
            console.log(`Adding Mojo Score: ${mojoScore} to metadata`);
            
            // Award Mojo tokens after successful mint
            await awardMojoTokens();
            
        } catch (error: any) {
            console.error("Minting error:", error);
            
            // Provide more helpful error messages based on common contract issues
            let errorMsg = error.message || "Unknown error occurred";
            
            if (errorMsg.includes("insufficient funds")) {
                errorMsg = "Insufficient funds to cover the mint fee and gas. Please add more ETH to your wallet.";
            } else if (errorMsg.includes("user rejected")) {
                errorMsg = "Transaction was rejected in your wallet.";
            } else if (errorMsg.toLowerCase().includes("revert")) {
                errorMsg = `Transaction reverted by the contract. Possible reasons: already minted, contract paused, or invalid parameters. Details: ${errorMsg}`;
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

    return (
        <div className="mint-nft-container">
            {renderMintStatus()}
            
            {mintStatus !== "success" && (
                <div className="mojo-score-preview">
                    <p>Expected Mojo Score: <span className="mojo-score">{mojoScore}</span></p>
                    <p className="mojo-description">After minting, you'll receive <span className="mojo-score">{mojoScore}</span> Mojo tokens based on your engagement!</p>
                </div>
            )}
            
            <button 
                onClick={handleMint}
                disabled={isPending || !address || mintStatus === "pending" || mintStatus === "success"}
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
