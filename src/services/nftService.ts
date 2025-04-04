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
  async mintNFT(
    to: string,
    path: string,
    mojoScore: number,
    value?: BigNumberish,
  ): Promise<BigNumber> {
    // Define image URLs for each path
    const pathImages = {
      A: "ipfs://QmQwVHy35zjGRqLiVCrnV23BsYfLvhTgvWTmkwFfsR4Jkn/PathA-image.jpeg", // Replace with actual Path A image hash
      B: "ipfs://QmQwVHy35zjGRqLiVCrnV23BsYfLvhTgvWTmkwFfsR4Jkn/PathB-image.jpeg", // Replace with actual Path B image hash
      C: "ipfs://QmQwVHy35zjGRqLiVCrnV23BsYfLvhTgvWTmkwFfsR4Jkn/PathC-image.jpeg"  // Replace with actual Path C image hash
    };

    const metadata = {
      name: `Jam Killer Story - Path ${path}`,
      description: `A unique NFT from the Jam Killer Story collection, following path ${path}`,
      image: pathImages[path as keyof typeof pathImages] || pathImages.A, // Fallback to Path A if path is invalid
      attributes: [
        { trait_type: "Narrative Path", value: path },
        { trait_type: "Mojo Score", value: mojoScore },
        { trait_type: "Rarity", value: mojoScore >= 9000 ? "Legendary" : mojoScore >= 8000 ? "Epic" : "Rare" }
      ]
    };

    return await this.contract.erc721.mintTo(to, {
      metadata,
      value,
    });
  }

  async finalizeNFT(
    to: string,
    finalURI: string,
    path: string,
  ): Promise<BigNumber> {
    return await this.contract.erc721.finalizeNFT(to, finalURI, path);
  }
}

// Initialize the SDK and create the service instance
const sdk = new ThirdwebSDK("optimism");
export const nftService = new NFTContractService(
  sdk,
  "0xfA2A3452D86A9447e361205DFf29B1DD441f1821"
); 