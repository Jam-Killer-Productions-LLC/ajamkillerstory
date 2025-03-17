// src/components/MintNFT.tsx
import React from "react";
import { useAddress, useContract, useContractWrite } from "@thirdweb-dev/react";
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

        try {
            const tx = await mintNFT({ args: [address, metadataUri, narrativePath] });
            alert(`NFT minted successfully! Transaction hash: ${tx.receipt.transactionHash}`);
        } catch (error) {
            console.error("Minting error:", error);
            alert("Minting failed. Please try again.");
        }
    };

    return (
        <button 
            onClick={handleMint}
            disabled={isPending || !address}
            className={isPending ? "loading" : ""}
        >
            {isPending ? "Minting..." : "Mint NFT"}
        </button>
    );
};

export default MintNFT;
