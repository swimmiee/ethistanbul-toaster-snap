import {
  JsonRpcProvider,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
} from 'ethers';
import { useEffect, useState } from 'react';
import { ERC20__factory, ToasterPool__factory } from '../../typechain';
import { useAccount } from 'wagmi';
import { useGetSigner } from '../../hooks/useGetSigner';
import TC from '../../../../toaster.config';

export const InvestLinea = () => {
  const [wethBalance, setWethBalance] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [userShare, setUserShare] = useState('0');
  const { address } = useAccount();
  const getSigner = useGetSigner();

  const fetchBal = async () => {
    const provider = new JsonRpcProvider(TC.local.node);
    ERC20__factory.connect(TC.local.ARB_WETH, provider)
      .balanceOf(address)
      .then((balance) => {
        setWethBalance(formatEther(balance));
      });
    ERC20__factory.connect(TC.local.ARB_USDC, provider)
      .balanceOf(address)
      .then((balance) => {
        setUsdcBalance(formatUnits(balance, 6));
      });
    ToasterPool__factory.connect(TC.local.TOASTER_USDC_WETH_POOL, provider).userShare(address)
    .then((share) => {
      setUserShare(share.toString());
    });
  }
  useEffect(() => {
    fetchBal();
  }, []);

  const onInvest = async () => {
    const signer = await getSigner(1337);
    const toaster = ToasterPool__factory.connect(
      TC.local.TOASTER_USDC_WETH_POOL,
      signer,
    );

    await toaster.zapLiquidity(parseEther('0.0000005'), parseUnits('0.01', 6)).then(
      tx => tx.wait()
    );
    fetchBal();
  };

  return (
    <div className="w-[480px] p-4 flex flex-col border rounded-lg bg-white">
      <p className="text-4xl font-semibold">Invest in UniswapV3 ETH+USDC</p>
      <p className="mt-4">WETH Balance: {wethBalance}</p>
      <p>USDC Balance: {usdcBalance}</p>
      <p>Liquidity Share {userShare}</p>

      <button
        onClick={onInvest}
        className="mt-4 bg-yellow-400 hover:bg-yellow-500"
      >
        Invest with MetaMask Snap
      </button>
    </div>
  );
};
