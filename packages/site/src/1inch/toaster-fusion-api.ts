import { FusionApiConfig } from "@1inch/fusion-sdk/api/types";
import { QuoterRequest } from "@1inch/fusion-sdk/api/quoter";
import { RelayerApi, RelayerRequest } from "@1inch/fusion-sdk/api/relayer";
import { AxiosProviderConnector } from "@1inch/fusion-sdk/connector";
import {
  ActiveOrdersRequest,
  ActiveOrdersResponse,
  OrdersApi,
  OrdersByMakerRequest,
  OrderStatusRequest,
  OrderStatusResponse,
  OrdersByMakerResponse,
} from "@1inch/fusion-sdk/api/orders";
import { QuoterCustomPresetRequest } from "@1inch/fusion-sdk/api/quoter/quoter-custom-preset.request";
import { ToasterQuote } from "./toaster-quote";
import { ToasterQuoterApi } from "./toaster-quoter-api";

export class ToasterFusionApi {
  private readonly quoterApi: ToasterQuoterApi;

  private readonly relayerApi: RelayerApi;

  private readonly ordersApi: OrdersApi;

  constructor(config: FusionApiConfig) {
    this.quoterApi = ToasterQuoterApi.new(
      {
        url: `${config.url}/quoter`,
        network: config.network,
        authKey: config.authKey,
      },
      config.httpProvider
    );

    this.relayerApi = RelayerApi.new(
      {
        url: `${config.url}/relayer`,
        network: config.network,
        authKey: config.authKey,
      },
      config.httpProvider
    );

    this.ordersApi = OrdersApi.new(
      {
        url: `${config.url}/orders`,
        network: config.network,
        authKey: config.authKey,
      },
      config.httpProvider
    );
  }

  static new(config: FusionApiConfig): ToasterFusionApi {
    return new ToasterFusionApi({
      network: config.network,
      url: config.url,
      authKey: config.authKey,
      httpProvider:
        config.httpProvider || new AxiosProviderConnector(config.authKey),
    });
  }

  getQuote(params: QuoterRequest): Promise<ToasterQuote> {
    return this.quoterApi.getQuote(params);
  }

  getQuoteWithCustomPreset(
    params: QuoterRequest,
    body: QuoterCustomPresetRequest
  ): Promise<ToasterQuote> {
    return this.quoterApi.getQuoteWithCustomPreset(params, body);
  }

  getActiveOrders(
    params: ActiveOrdersRequest = ActiveOrdersRequest.new()
  ): Promise<ActiveOrdersResponse> {
    return this.ordersApi.getActiveOrders(params);
  }

  getOrderStatus(params: OrderStatusRequest): Promise<OrderStatusResponse> {
    return this.ordersApi.getOrderStatus(params);
  }

  getOrdersByMaker(
    params: OrdersByMakerRequest
  ): Promise<OrdersByMakerResponse> {
    return this.ordersApi.getOrdersByMaker(params);
  }

  submitOrder(params: RelayerRequest): Promise<void> {
    return this.relayerApi.submit(params);
  }

  submitOrderBatch(params: RelayerRequest[]): Promise<void> {
    return this.relayerApi.submitBatch(params);
  }
}
