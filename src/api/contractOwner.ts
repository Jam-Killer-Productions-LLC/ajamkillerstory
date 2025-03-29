import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";

// Environment variables (would be in .env file in production)
const PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || "";
const RPC_URL = "https://optimism-mainnet.gateway.pokt.network/v1/lb/YOUR_API_KEY"; // Replace with your Optimism RPC
const NFT_CONTRACT_ADDRESS = "0xfA2A3452D86A9447e361205DFf29B1DD441f1821";
const CONTRACT_OWNER_ADDRESS = "0x2af17552f27021666BcD3E5Ba65f68CB5Ec217fc";

/**
 * Withdraw all funds from the contract to the owner address
 * This should be called from a secure API endpoint, not directly from the frontend
 */
export async function withdrawContractFunds() {
  try {
    // Safety check
    if (!PRIVATE_KEY) {
      throw new Error("Private key not configured");
    }

    // Initialize provider and signer
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verify the signer is the owner
    if (signer.address.toLowerCase() !== CONTRACT_OWNER_ADDRESS.toLowerCase()) {
      throw new Error("Provided private key does not match contract owner");
    }

    // Initialize SDK
    const sdk = ThirdwebSDK.fromSigner(signer, "optimism");
    
    // Get contract
    const contract = await sdk.getContract(NFT_CONTRACT_ADDRESS);
    
    // Check if the contract has a withdraw function
    let result;
    if (contract.functions["withdraw"]) {
      // Call the withdraw function
      result = await contract.call("withdraw");
      console.log("Withdraw successful:", result);
    } else {
      throw new Error("Contract does not have a withdraw function");
    }
    
    return { success: true, transaction: result };
  } catch (error) {
    console.error("Error withdrawing funds:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Mint an NFT with the same base image but custom attributes
 * This demonstrates how to mint programmatically as the contract owner
 */
export async function mintNFTAsOwner(toAddress: string, narrativePath: string, mojoScore: number, narrative: string) {
  try {
    // Safety check
    if (!PRIVATE_KEY) {
      throw new Error("Private key not configured");
    }

    // Initialize provider and signer
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Initialize SDK
    const sdk = ThirdwebSDK.fromSigner(signer, "optimism");
    
    // Get contract
    const contract = await sdk.getContract(NFT_CONTRACT_ADDRESS);
    
    // Consistent IPFS image URL
    const baseTokenUri = "ipfs://QmfS4CpKMBQgiJKXPoGHdQsgKYSEhDJar2vpn4zVH81fSK/0";
    
    // Call the contract's mintNFT function 
    const mintTx = await contract.call("mintNFT", [toAddress, narrativePath], {
      value: ethers.utils.parseEther("0.001") // Assuming a mint fee of 0.001 ETH
    });
    
    // Call finalizeNFT function to set the URI and finalize
    const finalizeTx = await contract.call("finalizeNFT", [toAddress, baseTokenUri, narrativePath]);
    
    console.log("NFT minted:", {
      mintTx,
      finalizeTx,
      tokenId: finalizeTx.id || "Unknown" 
    });
    
    return { 
      success: true, 
      tokenId: finalizeTx.id, 
      mintTx, 
      finalizeTx 
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
} 