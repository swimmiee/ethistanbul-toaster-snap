import { BlockchainProviderConnector } from "@1inch/fusion-sdk";
import { ethers } from "ethers";

export class Web3ProviderConnector implements BlockchainProviderConnector {
  private provider: ethers.BrowserProvider;

  constructor(web3Provider: any) {
    this.provider = web3Provider;
  }
  
  async signTypedData(walletAddress: string, typedData: any): Promise<string> {
    const signer = await this.provider.getSigner(walletAddress);
    const signature = await signer.provider.send("eth_signTypedData_v4", [
      walletAddress,
      JSON.stringify(typedData),
    ]);
    return signature;
  }

  async ethCall(contractAddress: string, callData: string): Promise<string> {
    const result = await this.provider.call({
      to: contractAddress,
      data: callData,
    });
    return result;
  }

  async getNetwork(): Promise<any> {
    return this.provider.getNetwork();
  }
}