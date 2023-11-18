import { QuoterRequest, RelayerRequest } from "@1inch/fusion-sdk/api";
import {
  FusionSDKConfigParams,
  Nonce,
  OrderInfo,
  OrderParams,
  PreparedOrder,
  QuoteParams,
  QuoteCustomPresetParams,
} from "@1inch/fusion-sdk/sdk/types";
import { ZERO_ADDRESS } from "@1inch/fusion-sdk/constants";
import { getLimitOrderV3Domain } from "@1inch/fusion-sdk/limit-order";
import {
  ActiveOrdersRequest,
  ActiveOrdersRequestParams,
  ActiveOrdersResponse,
  OrdersByMakerParams,
  OrdersByMakerRequest,
  OrdersByMakerResponse,
  OrderStatusRequest,
  OrderStatusResponse,
} from "@1inch/fusion-sdk/api/orders";
import { NonceManager } from "@1inch/fusion-sdk/nonce-manager/nonce-manager";
import { OrderNonce } from "@1inch/fusion-sdk/nonce-manager/types";
import { FusionOrder } from "@1inch/fusion-sdk/fusion-order";
import { encodeCancelOrder } from "@1inch/fusion-sdk/sdk/encoders";
import { QuoterCustomPresetRequest } from "@1inch/fusion-sdk/api/quoter/quoter-custom-preset.request";
import { ToasterQuote } from "./toaster-quote";
import { ToasterFusionApi } from "./toaster-fusion-api";
import { ToasterQuoteParams } from "./toaster-quote.params";

export class ToasterFusionSDK {
  public readonly api: ToasterFusionApi;

  constructor(private readonly config: FusionSDKConfigParams) {
    this.api = ToasterFusionApi.new({
      url: config.url,
      network: config.network,
      httpProvider: config.httpProvider,
      authKey: config.authKey,
    });
  }

  async getActiveOrders({
    page,
    limit,
  }: ActiveOrdersRequestParams = {}): Promise<ActiveOrdersResponse> {
    const request = ActiveOrdersRequest.new({ page, limit });

    return this.api.getActiveOrders(request);
  }

  async getOrderStatus(orderHash: string): Promise<OrderStatusResponse> {
    const request = OrderStatusRequest.new({ orderHash });

    return this.api.getOrderStatus(request);
  }

  async getOrdersByMaker({
    limit,
    page,
    address,
  }: OrdersByMakerParams): Promise<OrdersByMakerResponse> {
    const request = OrdersByMakerRequest.new({ limit, page, address });

    return this.api.getOrdersByMaker(request);
  }

  async getQuote(params: QuoteParams): Promise<ToasterQuote> {
    const request = QuoterRequest.new({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      walletAddress: ZERO_ADDRESS,
      permit: params.permit,
      enableEstimate: false,
      fee: params?.takingFeeBps,
      source: params.source,
    });

    return this.api.getQuote(request);
  }

  async getQuoteWithCustomPreset(
    params: QuoteParams,
    body: QuoteCustomPresetParams
  ): Promise<ToasterQuote> {
    const paramsRequest = QuoterRequest.new({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      walletAddress: ZERO_ADDRESS,
      permit: params.permit,
      enableEstimate: false,
      fee: params?.takingFeeBps,
      source: params.source,
    });

    const bodyRequest = QuoterCustomPresetRequest.new({
      customPreset: body.customPreset,
    });

    return this.api.getQuoteWithCustomPreset(paramsRequest, bodyRequest);
  }

  async createOrder(
    params: OrderParams,
    toasterParams: ToasterQuoteParams
  ): Promise<PreparedOrder> {
    const quote = await this.getQuoteResult(params);

    if (!quote.quoteId) {
      throw new Error("quoter has not returned quoteId");
    }

    const nonce = await this.getNonce(params.walletAddress, params.nonce);
    const order = quote.createToasterFusionOrder(
      {
        receiver: params.receiver,
        preset: params.preset,
        nonce,
        permit: params.permit,
        takingFeeReceiver: params.fee?.takingFeeReceiver,
      },
      toasterParams
    );

    const domain = getLimitOrderV3Domain(this.config.network);
    const hash = order.getOrderHash(domain);

    return { order, hash, quoteId: quote.quoteId };
  }

  public async submitOrder(
    order: FusionOrder,
    quoteId: string
  ): Promise<OrderInfo> {
    if (!this.config.blockchainProvider) {
      throw new Error("blockchainProvider has not set to config");
    }

    const orderStruct = order.build();
    const domain = getLimitOrderV3Domain(this.config.network);

    const signature = await this.config.blockchainProvider.signTypedData(
      orderStruct.maker,
      order.getTypedData(domain)
    );

    const relayerRequest = RelayerRequest.new({
      order: orderStruct,
      signature,
      quoteId,
    });

    await this.api.submitOrder(relayerRequest);

    return {
      order: orderStruct,
      signature,
      quoteId,
      orderHash: order.getOrderHash(domain),
    };
  }

  async placeOrder(
    params: OrderParams,
    toasterParams: ToasterQuoteParams
  ): Promise<OrderInfo> {
    const { order, quoteId } = await this.createOrder(params, toasterParams);

    return this.submitOrder(order, quoteId);
  }

  async buildCancelOrderCallData(orderHash: string): Promise<string> {
    const getOrderRequest = OrderStatusRequest.new({ orderHash });
    const orderData = await this.api.getOrderStatus(getOrderRequest);

    if (!orderData) {
      throw new Error(
        `Can not get order with the specified orderHash ${orderHash}`
      );
    }

    const { order } = orderData;

    return encodeCancelOrder({
      makerAsset: order.makerAsset,
      takerAsset: order.takerAsset,
      maker: order.maker,
      receiver: order.receiver,
      allowedSender: order.allowedSender,
      interactions: order.interactions,
      makingAmount: order.makingAmount,
      takingAmount: order.takingAmount,
      salt: order.salt,
      offsets: order.offsets,
    });
  }

  private async getQuoteResult(params: OrderParams): Promise<ToasterQuote> {
    const quoterRequest = QuoterRequest.new({
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      walletAddress: params.walletAddress,
      permit: params.permit,
      enableEstimate: true,
      fee: params.fee?.takingFeeBps,
      source: params.source,
    });

    if (!params.customPreset) {
      const quote = await this.api.getQuote(quoterRequest);

      return quote;
    }

    const quoterWithCustomPresetBodyRequest = QuoterCustomPresetRequest.new({
      customPreset: params.customPreset,
    });

    const quote = await this.api.getQuoteWithCustomPreset(
      quoterRequest,
      quoterWithCustomPresetBodyRequest
    );

    return quote;
  }

  private async getNonce(
    walletAddress: string,
    nonce?: OrderNonce | number | string
  ): Promise<Nonce> {
    if (!this.config.blockchainProvider) {
      throw new Error("blockchainProvider has not set to config");
    }

    // in case of auto request from node
    if (nonce === OrderNonce.Auto) {
      const nonceManager = NonceManager.new({
        provider: this.config.blockchainProvider,
      });

      return nonceManager.getNonce(walletAddress);
    }

    return nonce;
  }
}
