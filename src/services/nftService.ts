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
    const metadata = {
      name: `Jam Killer Story - Path ${path}`,
      description: `A unique NFT from the Jam Killer Story collection, following path ${path}`,
      image: "ipfs://QmQwVHy35zjGRqLiVCrnV23BsYfLvhTgvWTmkwFfsR4Jkn/Mystic%20enchanting%20logo%20depicting%20Cannabis%20is%20Medicine%20in%20gentle%20color%20contrasts%20and%20a%20dreamlike%20atmosphere%2C%20otherworldly%20ethereal%20quality%2C%20geometric%20shapes%2C%20clean%20lines%2C%20balanced%20symmetry%2C%20visual%20clarity.jpeg",
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