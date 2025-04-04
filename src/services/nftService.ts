import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { BigNumber, BigNumberish } from "ethers";

export class NFTContractService {
  private contract: any;

  constructor(sdk: ThirdwebSDK, contractAddress: string) {
    this.contract = sdk.getContract(contractAddress);
  }

  // Read Functions
  async MAX_SUPPLY(): Promise<BigNumber> {
    return await this.contract.call("MAX_SUPPLY");
  }

  async MINT_FEE(): Promise<BigNumber> {
    return await this.contract.call("MINT_FEE");
  }

  async balanceOf(owner: string): Promise<BigNumber> {
    return await this.contract.call("balanceOf", [owner]);
  }

  async hasFinalNFT(address: string): Promise<boolean> {
    return await this.contract.call("hasFinalNFT", [address]);
  }

  async owner(): Promise<string> {
    return await this.contract.call("owner");
  }

  // Write Functions
  async mintNFT(
    to: string,
    path: string,
    value?: BigNumberish,
  ): Promise<BigNumber> {
    return await this.contract.call("mintNFT", [to, path], {
      value,
    });
  }

  async finalizeNFT(
    to: string,
    finalURI: string,
    path: string,
  ): Promise<BigNumber> {
    return await this.contract.call("finalizeNFT", [to, finalURI, path]);
  }
}

// Initialize the SDK and create the service instance
const sdk = new ThirdwebSDK("optimism");
export const nftService = new NFTContractService(
  sdk,
  "0xfA2A3452D86A9447e361205DFf29B1DD441f1821"
); 