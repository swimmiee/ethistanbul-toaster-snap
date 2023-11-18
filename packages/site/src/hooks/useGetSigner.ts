import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useEffect } from "react";
import { BehaviorSubject } from "rxjs";
import { useWalletClient } from "wagmi";
import { GetWalletClientResult, switchNetwork } from "wagmi/actions";

function walletClientToSigner(walletClient: GetWalletClientResult) {
  if (!walletClient) return null;
  const { account, chain, transport } = walletClient;
  if (!chain || !account) return null;

  return new JsonRpcSigner(
    // @ts-ignore
    new BrowserProvider(transport, {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    }),
    account.address
  );
}

const onFetch = new BehaviorSubject<boolean>(false);
export function useGetSigner() {
  const { data: client, refetch, isFetched } = useWalletClient();
  useEffect(() => {
    onFetch.next(isFetched);
  }, [isFetched]);

  return async (targetChainId: number) => {
    await new Promise((resolve) => {
      onFetch.subscribe((fetched) => {
        if (fetched) resolve(true);
      });
    });

    const cli = client ?? (await refetch().then((res) => res.data));

    if (cli?.chain?.id !== targetChainId) {
      return switchNetwork({ chainId: targetChainId })
        .then(() => refetch())
        .then(({ data }) => walletClientToSigner(data!));
    } else {
      return walletClientToSigner(cli);
    }
  };
}
