// src/components/MintNFT.tsx
import React, { useState, useEffect } from "react";
import { useAddress, useContract, useContractWrite, useContractRead } from "@thirdweb-dev/react";
import contractAbi from "../contractAbi.json";

const CONTRACT_ADDRESS = "0xfA2A3452D86A9447e361205DFf29B1DD441f1821";

interface MintNFTProps {
    metadataUri: string;
    narrativePath: string;
}

const allowedPaths = ["A", "B", "C"];

const MintNFT: React.FC<MintNFTProps> = ({ metadataUri, narrativePath }) => {
    const address = useAddress();
    const { contract } = useContract(CONTRACT_ADDRESS, contractAbi);
    const { mutateAsync: mintNFT, isLoading: isPending } = useContractWrite(contract, "mintNFT");
    const { data: mintFee } = useContractRead(contract, "MINT_FEE");
    const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState<string>("");

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

        setMintStatus("pending");
        try {
            // Call mintNFT with the correct parameters and include the mint fee
            const tx = await mintNFT({
                args: [address, narrativePath],
                overrides: {
                    value: mintFee || "0" // Include the mint fee in the transaction
                }
            });
            setTxHash(tx.receipt.transactionHash);
            setMintStatus("success");
        } catch (error) {
            console.error("Minting error:", error);
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
                        <a 
                            href={`https://optimistic.etherscan.io/tx/${txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="tx-link"
                        >
                            View transaction on Etherscan
                        </a>
                    </div>
                );
            case "error":
                return <div className="mint-status error">Minting failed. Please try again.</div>;
            default:
                return null;
        }
    };

    return (
        <div className="mint-nft-container">
            {renderMintStatus()}
            
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
                    {mintFee && ` Mint fee: ${mintFee} ETH`}
                </p>
            )}
        </div>
    );
};

export default MintNFT;
