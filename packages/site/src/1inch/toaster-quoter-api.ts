import {
  AxiosProviderConnector,
  HttpProviderConnector,
} from "@1inch/fusion-sdk/connector";
import { QuoterRequest } from "@1inch/fusion-sdk/api/quoter/quoter.request";
import {
  QuoterApiConfig,
  QuoterResponse,
} from "@1inch/fusion-sdk/api/quoter/types";
import { concatQueryParams } from "@1inch/fusion-sdk/api/params";
import { QuoterCustomPresetRequest } from "@1inch/fusion-sdk/api/quoter/quoter-custom-preset.request";
import { ToasterQuote } from "./toaster-quote";

export class ToasterQuoterApi {
  constructor(
    private readonly config: QuoterApiConfig,
    private readonly httpClient: HttpProviderConnector
  ) {}

  static new(
    config: QuoterApiConfig,
    httpClient: HttpProviderConnector = new AxiosProviderConnector(
      config.authKey
    )
  ): ToasterQuoterApi {
    return new ToasterQuoterApi(config, httpClient);
  }

  async getQuote(params: QuoterRequest): Promise<ToasterQuote> {
    const err = params.validate();

    if (err) {
      throw new Error(err);
    }

    const queryParams = concatQueryParams(params.build());
    const url = `${this.config.url}/v1.0/${this.config.network}/quote/receive/${queryParams}`;

    const res = await this.httpClient.get<QuoterResponse>(url);

    return new ToasterQuote(this.config.network, params, res);
  }

  async getQuoteWithCustomPreset(
    params: QuoterRequest,
    body: QuoterCustomPresetRequest
  ): Promise<ToasterQuote> {
    const paramsErr = params.validate();
    const bodyErr = body.validate();

    if (paramsErr) {
      throw new Error(paramsErr);
    }

    if (bodyErr) {
      throw new Error(bodyErr);
    }

    const queryParams = concatQueryParams(params.build());
    const bodyParams = body.build();
    const url = `${this.config.url}/v1.0/${this.config.network}/quote/receive/${queryParams}`;

    const res = await this.httpClient.post<QuoterResponse>(url, bodyParams);

    return new ToasterQuote(this.config.network, params, res);
  }
}
