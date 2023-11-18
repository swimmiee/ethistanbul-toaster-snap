import { NetworkEnum } from '@1inch/fusion-sdk';
import { BrowserProvider, parseEther, parseUnits } from 'ethers';
import { useWalletClient } from 'wagmi';
import { Web3ProviderConnector } from 'src/1inch/Web3ProviderConnector';
import { ToasterFusionSDK } from 'src/1inch/toaster-fusion-sdk';

export const use1InchSdk = () => {
  const { data: client } = useWalletClient();

  const ARB_WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
  const ARB_USDC_e = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
  const TOASTER_USDC_WETH_POOL = '0x7f9d5575843a4B8Ef84818ec6bf02C6eda5807AE';

  const run = () => {
    if (!client) return;

    const sdk = new ToasterFusionSDK({
      url: 'https://fusion.1inch.io',
      network: NetworkEnum.ARBITRUM,
      blockchainProvider: new Web3ProviderConnector(
        // @ts-ignore
        new BrowserProvider(client.transport, {
          chainId: client.chain.id,
          name: client.chain.name,
          ensAddress: client.chain.contracts?.ensRegistry?.address,
        }),
      ),
    });

    const usdcAmount = 10n; // 0.00001 USDC
    // 절반은 스왑, 절반은 그대로

    sdk
      .placeOrder(
        {
          fromTokenAddress: ARB_USDC_e,
          toTokenAddress: ARB_WETH,
          amount: (usdcAmount / 2n).toString(),
          walletAddress: client.account.address,
          // fee is an optional field
        },
        {
          toasterPool: TOASTER_USDC_WETH_POOL,
          // USDC 주소
          baseToken: ARB_USDC_e,
          // WETH 주소
          // quoteToken: ARB_WETH,
          // Uniswap V3 pool fee
          // 투자할 USDC 양 / 2
          baseAmount: usdcAmount / 2n,
        },
      )
      .then(console.log);
  };
};
