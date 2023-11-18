import type {
  OnRpcRequestHandler,
  OnTransactionHandler,
} from '@metamask/snaps-types';
import { divider, heading, panel, text, image } from '@metamask/snaps-ui';
import { formatEther, formatUnits } from 'ethers';
import TC from '../../toaster.config';
import {
  ToasterZap__factory,
  ToasterPool__factory,
} from '../../site/src/typechain';

type ZapRes = [bigint, bigint, boolean, bigint] & {
  amountIn: bigint;
  amountOut: bigint;
  zeroForOne: boolean;
  sqrtPriceX96: bigint;
};
/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = ({ origin, request }) => {
  switch (request.method) {
    case 'hello':
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text('✅ **Authorized Toaster Contract**'),
            text('Invest in Uniswap V3 Toaster 🍞'),
            text('· Auto compounding'),
            text('· Auto rebalance position with price history data'),
            text('Text'),
          ]),
        },
      });
    default:
      throw new Error('Method not found.');
  }
};

export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  let content = [divider()];

  const data = transaction.data as string;

  // zapAddLiq
  if (data.slice(0, 10) === '0x634eaad1') {
    const amount0Big = BigInt('0x' + data.slice(10, 10 + 64));
    const amount1Big = BigInt('0x' + data.slice(10 + 64, 10 + 128));
    const amount0 = formatEther(amount0Big);
    const amount1 = formatUnits(amount1Big, 6);

    const toasterItf = ToasterPool__factory.createInterface();
    const state = await ethereum
      .request({
        method: 'eth_call',
        params: [
          {
            to: TC.local.TOASTER_USDC_WETH_POOL,
            data: '0xc19d93fb',
          },
        ],
      })
      .then((data: string) => toasterItf.decodeFunctionResult('state', data));

    const zapItf = ToasterZap__factory.createInterface();

    const zapRes = await ethereum
      .request({
        method: 'eth_call',
        params: [
          {
            to: TC.local.TOASTER_ZAP,
            data: zapItf.encodeFunctionData('zap', [
              TC.local.ARBI_USDC_WETH_POOL,
              state.tickLower,
              state.tickUpper,
              amount0Big,
              amount1Big,
            ]),
          },
        ],
      })
      .then(
        (data: string) =>
          zapItf.decodeFunctionResult('zap', data) as unknown as ZapRes,
      );

    let i = 0;
    const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const zapContents: any[] = [heading('How Toaster Position Manager Works')];
    if (+amount0 > 0)
      zapContents.push(text(icons[i++] + ' Grab your ' + amount0 + ' ETH'));
    if (+amount1 > 0)
      zapContents.push(text(icons[i++] + ' Grab your ' + amount1 + ' USDC'));

    zapContents.push(
      text(String(`${icons[i++]} Toaster will automatically swap`)),
    );

    let c2: string, c3: string;
    let newAmt0: number, newAmt1: number;
    if (zapRes.zeroForOne) {
      c2 = `from **${formatEther(zapRes.amountIn)} ETH**`;
      c3 = `to **${formatUnits(zapRes.amountOut, 6)} USDC**`;
      newAmt0 = +amount0 - +formatEther(zapRes.amountIn);
      newAmt1 = +amount1 + +formatUnits(zapRes.amountOut, 6);
    } else {
      c2 = `from **${formatUnits(zapRes.amountIn, 6)} USDC**`;
      c3 = `to **${formatEther(zapRes.amountOut)} ETH**`;
      newAmt0 = +amount0 + +formatEther(zapRes.amountOut);
      newAmt1 = +amount1 - +formatUnits(zapRes.amountIn, 6);
    }

    zapContents.push(
      text(c2),
      text(c3),
      divider(),
      text('Then, your balance will be'),
      text(String(`**${newAmt0} ETH** and **${newAmt1} USDC**`)),
      divider(),
      text(
        icons[i++] +
          ' Finally, Invest in Uniswap V3 ETH+USDC Pool in **OPTIMAL RATIO** 🎊🎊🎊',
      ),
    );

    zapContents.push(
      image(
        String(
          `<svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 125"
          x="0px"
          y="0px"
        >
          <path
            d="M100,73.18c-20.33,0-28.37-17.05-34.83-30.75C60.7,33,56.86,24.82,50,24.82h0c-6.85,0-10.7,8.16-15.15,17.6C28.38,56.13,20.35,73.18,0,73.18H0v2H0c19.32,0,28-14.14,34.45-27.3v26.3H65.54V47.88C72,61,80.67,75.18,100,75.18h0v-2Z"
          />
        </svg>`,
        ),
      ),
    );

    content = [...zapContents, ...content];
  }

  return {
    content: panel(content),
  };
};
