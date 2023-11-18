import {
  Cost,
  PresetEnum,
  QuoterResponse,
} from '@1inch/fusion-sdk/api/quoter/types';
import { Preset } from '@1inch/fusion-sdk/api/quoter/preset';
import { AuctionSuffix } from '@1inch/fusion-sdk/auction-suffix';
import { FusionOrder } from '@1inch/fusion-sdk/fusion-order';
import { isNativeCurrency } from '@1inch/fusion-sdk/utils';
import {
  NetworkEnum,
  UNWRAPPER_CONTRACT_ADDRESS_MAP,
  WRAPPER_ADDRESS_MAP,
  ZERO_ADDRESS,
  ZERO_NUMBER,
} from '@1inch/fusion-sdk/constants';
import { QuoterRequest } from '@1inch/fusion-sdk/api/quoter/quoter.request';
import { FusionOrderParams } from '@1inch/fusion-sdk/api/quoter/quote/order-params';
import {
  FusionOrderParamsData,
  PredicateParams,
} from '@1inch/fusion-sdk/api/quoter/quote/types';
import { PredicateFactory } from '@1inch/fusion-sdk/limit-order/predicate-factory';
import { bpsToRatioFormat } from '@1inch/fusion-sdk/sdk/utils';
import { ethers } from 'ethers';
import { ToasterQuoteParams } from './toaster-quote.params';

export class ToasterQuote {
  public readonly fromTokenAmount: string;

  public readonly feeToken: string;

  public readonly presets: {
    [PresetEnum.fast]: Preset;
    [PresetEnum.slow]: Preset;
    [PresetEnum.medium]: Preset;
    [PresetEnum.custom]?: Preset;
  };

  public readonly recommendedPreset: PresetEnum;

  public readonly toTokenAmount: string;

  public readonly prices: Cost;

  public readonly volume: Cost;

  public readonly whitelist: string[];

  public readonly settlementAddress: string;

  public readonly quoteId: string | null;

  constructor(
    private readonly network: NetworkEnum,
    private readonly params: QuoterRequest,
    response: QuoterResponse,
  ) {
    this.fromTokenAmount = response.fromTokenAmount;
    this.feeToken = response.feeToken;
    this.presets = {
      [PresetEnum.fast]: new Preset(response.presets.fast),
      [PresetEnum.medium]: new Preset(response.presets.medium),
      [PresetEnum.slow]: new Preset(response.presets.slow),
      [PresetEnum.custom]: response.presets.custom
        ? new Preset(response.presets.custom)
        : undefined,
    };
    this.toTokenAmount = response.toTokenAmount;
    this.prices = response.prices;
    this.volume = response.volume;
    this.quoteId = response.quoteId;
    this.whitelist = response.whitelist;
    this.settlementAddress = response.settlementAddress;
    this.recommendedPreset = response.recommended_preset;
  }

  createToasterFusionOrder(
    paramsData: FusionOrderParamsData,
    toasterParams: ToasterQuoteParams,
  ): FusionOrder {
    const params = FusionOrderParams.new({
      preset: paramsData?.preset || this.recommendedPreset,
      receiver: paramsData?.receiver,
      permit: paramsData?.permit,
      nonce: paramsData?.nonce,
    });

    const preset = this.getPreset(params.preset);

    const salt = preset.createAuctionSalt();

    const suffix = new AuctionSuffix({
      points: preset.points,
      whitelist: this.whitelist.map((resolver) => ({
        address: resolver,
        allowance: 0,
      })),
      fee: {
        takingFeeRatio: bpsToRatioFormat(this.params.fee) || ZERO_NUMBER,
        takingFeeReceiver: paramsData?.takingFeeReceiver || ZERO_ADDRESS,
      },
    });

    const takerAsset = isNativeCurrency(this.params.toTokenAddress)
      ? WRAPPER_ADDRESS_MAP[this.network]
      : this.params.toTokenAddress;

    const takerAssetReceiver = isNativeCurrency(this.params.toTokenAddress)
      ? UNWRAPPER_CONTRACT_ADDRESS_MAP[this.network]
      : params.receiver;

    return new FusionOrder(
      {
        makerAsset: this.params.fromTokenAddress,
        takerAsset,
        makingAmount: this.fromTokenAmount,
        takingAmount: preset.auctionEndAmount,
        maker: this.params.walletAddress,
        receiver: takerAssetReceiver,
        network: this.network,
      },
      salt,
      suffix,
      {
        postInteraction: this.buildTransferToaster(toasterParams),
        // todo: change hardcoded extended deadline
        predicate: this.handlePredicate({
          deadline: salt.auctionStartTime + salt.duration + 32,
          address: this.params.walletAddress,
          nonce: params.nonce,
        }),
        permit: params.permit
          ? this.params.fromTokenAddress + params.permit.substring(2)
          : undefined,
      },
    );
  }

  getPreset(type = PresetEnum.fast): Preset {
    return this.presets[type] as Preset;
  }

  private handlePredicate(params: PredicateParams): string {
    if (params?.nonce) {
      return PredicateFactory.timestampBelowAndNonceEquals(
        params.address,
        params.nonce,
        params.deadline,
      );
    }

    return PredicateFactory.timestampBelow(params.deadline);
  }

  private buildTransferToaster({
    toasterPool,
    // pool,
    baseToken,
    baseAmount,
    // quoteAmount,
  }: ToasterQuoteParams) {
    // encode
    const encodedData = new ethers.AbiCoder().encode(
      ['address', 'uint256'],
      [baseToken, baseAmount],
      // ['address', 'address', 'uint24', 'uint256'],
      // [pool, baseToken, baseAmount, quoteAmount],
    );
    return toasterPool + encodedData.slice(2);
  }
}
