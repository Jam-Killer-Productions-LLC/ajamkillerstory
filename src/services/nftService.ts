import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { BigNumber, BigNumberish } from "ethers";

export class NFTContractService {
  private contract: any;

  constructor(sdk: ThirdwebSDK, contractAddress: string) {
    this.contract = sdk.getContract(contractAddress);
  }

  // Read Functions
  async MAX_SUPPLY(): Promise<BigNumber> {
    return await this.contract.erc721.totalSupply();
  }

  async MINT_FEE(): Promise<BigNumber> {
    return await this.contract.erc721.mintFee();
  }

  async balanceOf(owner: string): Promise<BigNumber> {
    return await this.contract.erc721.balanceOf(owner);
  }

  async hasFinalNFT(address: string): Promise<boolean> {
    return await this.contract.erc721.hasFinalNFT(address);
  }

  async owner(): Promise<string> {
    return await this.contract.erc721.owner();
  }

  // Write Functions
  
  // New mintNFT method using metadata upload
  async mintNFT(
    to: string,
    metadata: {
      name: string;
      description: string;
      image: string;
      attributes: { trait_type: string; value: any }[];
    },
    mojoScore: number,
    narrative: string,
    value: string
  ): Promise<any> {
    // First, upload metadata to get tokenURI
    const tokenURI = await uploadMetadata(metadata);
    // Call the contract's mintTo method with all required parameters
    const mintTx = await this.contract.mintTo(
      to,
      tokenURI,
      mojoScore,
      narrative,
      { value }
    );
    return mintTx;
  }

  // Example metadata preparation usage (for reference in integration)
  prepareMetadata(path: string, pathImages: Record<string, string>, rarity: string, mojoScore: number) {
    const metadata = {
      name: "My Cool NFT",
      description: "An awesome NFT from my collection",
      image: pathImages[path as keyof typeof pathImages], // using the provided image link for each path (A, B, C etc.)
      attributes: [
        { trait_type: "Rarity", value: rarity },
        { trait_type: "Power", value: mojoScore }
      ]
    };
    return metadata;
  }
}

// Initialize the SDK and create the service instance
const sdk = new ThirdwebSDK("optimism");
export const nftService = new NFTContractService(
  sdk,
  "0x914b1339944d48236738424e2dbdbb72a212b2f5"
);