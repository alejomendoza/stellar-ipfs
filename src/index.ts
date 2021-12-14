import {
  Keypair,
  Asset,
  TransactionBuilder,
  Memo,
  Operation,
  AuthImmutableFlag,
  Account,
  BASE_FEE
} from "stellar-base";
import { NFTStorage, File } from "nft.storage";
import { NFTMetadata, NFTPayload } from "./types/index";
import { getConfig, getAccount } from "./utils";

const client = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY });

export async function storeNFT(payload: NFTPayload) {
  const { image, video } = payload;
  const { data, ipnft } = await client.store({
    name: payload.name,
    description: payload.description,
    code: payload.code,
    issuer: payload.issuer,
    domain: payload.domain,
    supply: payload.supply,
    image: new File([image.data], image.fileName, {
      type: image.type
    }),
    properties: {
      video: new File([video.data], video.fileName, {
        type: video.type
      })
    }
  });

  return {
    name: data.name,
    description: data.description,
    code: data.code,
    issuer: data.issuer,
    domain: data.domain,
    supply: data.supply,
    image: data.image as string,
    video: data.properties.video as string,
    ipnft: ipnft as string
  } as NFTMetadata;
}

export async function buildNFTTransaction(
  accountPublicKey: string,
  issuerKey: Keypair,
  nftMetadata: NFTMetadata
) {
  const { code, supply, ipnft } = nftMetadata;
  const issuerPublicKey = issuerKey.publicKey();
  const asset = new Asset(code, issuerPublicKey);

  const account = await (async () => {
    try {
      return await getAccount(accountPublicKey);
    } catch {
      throw new Error(
        `Your account ${issuerPublicKey} does not exist on the Stellar ${
          getConfig().network
        } network. It must be created before it can be used to submit transactions.`
      );
    }
  })();

  const transaction = new TransactionBuilder(
    new Account(account.id, account.sequence),
    {
      fee: BASE_FEE,
      networkPassphrase: getConfig().networkPassphrase
    }
  );
  transaction.setTimeout(300);
  transaction.addMemo(Memo.text(`Create ${code} NFT ✨`));
  transaction.addOperation(
    Operation.beginSponsoringFutureReserves({
      sponsoredId: issuerPublicKey
    })
  );
  transaction.addOperation(
    Operation.createAccount({
      destination: issuerPublicKey,
      startingBalance: "0"
    })
  );

  transaction.addOperation(
    Operation.manageData({
      source: issuerPublicKey,
      name: `ipfshash`,
      value: ipnft
    })
  );

  transaction.addOperation(
    Operation.endSponsoringFutureReserves({
      source: issuerPublicKey
    })
  );
  transaction.addOperation(
    Operation.changeTrust({ asset: asset, limit: supply.toString() })
  );
  transaction.addOperation(
    Operation.payment({
      source: issuerPublicKey,
      destination: accountPublicKey,
      asset: asset,
      amount: supply.toString()
    })
  );
  transaction.addOperation(
    Operation.setOptions({
      source: issuerPublicKey,
      setFlags: AuthImmutableFlag,
      masterWeight: 0,
      lowThreshold: 0,
      medThreshold: 0,
      highThreshold: 0
    })
  );

  const transactionBuilt = transaction.build();
  transactionBuilt.sign(issuerKey);
  const xdr = transactionBuilt.toEnvelope().toXDR("base64");
  console.log(`Transaction built: ${xdr}`);

  return { code, issuer: issuerPublicKey, issuerKey, transaction, xdr };
}

export async function storeIpfsBuildTx(
  accountPublicKey: string,
  nftPayload: NFTPayload
) {
  let issuerKey = Keypair.random();
  nftPayload.issuer = issuerKey.publicKey();
  let metadata = await storeNFT(nftPayload);

  const res = await buildNFTTransaction(accountPublicKey, issuerKey, metadata);
  return { ...metadata, ...res };
}
