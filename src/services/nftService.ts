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
    // Define image URLs for each path (unchanged)
    const pathImages = {
      A: "https://bafybeiakvemnjhgbgknb4luge7kayoyslnkmgqcw7xwaoqmr5l6ujnalum.ipfs.dweb.link?filename=dktjnft1.gif",
      B: "https://bafybeiapjhb52gxhsnufm2mcrufk7d35id3lnexwftxksbcmbx5hsuzore.ipfs.dweb.link?filename=dktjnft2.gif",
      C: "https://bafybeifoew7nyl5p5xxroo3y4lhb2fg2a6gifmd7mdav7uibi4igegehjm.ipfs.dweb.link?filename=dktjnft3.gif"
    };

    // Determine rarity based on mojoScore (for example purposes)
    const rarity = mojoScore >= 9000 ? "Legendary" : mojoScore >= 8000 ? "Epic" : "Rare";

    // Build the final metadata in the requested format
    const metadata = {
      name: "My Cool NFT",
      description: "An awesome NFT from my collection",
      image: pathImages[path as keyof typeof pathImages] || pathImages.A,
      attributes: [
        { trait_type: "Rarity", value: rarity },
        { trait_type: "Power", value: mojoScore }
      ]
    };

    // ...existing code for minting...
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