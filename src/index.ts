import StellarSdk, { Keypair } from "stellar-sdk";
import { NFTStorage, File } from "nft.storage";
import { NFTMetadata, NFTPayload } from "./types/index";
import { getConfig } from "./utils";

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
    image: data.image,
    video: data.properties.video,
    ipnft: ipnft
  } as NFTMetadata;
}

export async function buildNFTTransaction(
  accountPublicKey: string,
  issuerKey: Keypair,
  nftMetadata: NFTMetadata
) {
  const { code, supply, ipnft } = nftMetadata;
  const issuerPublicKey = issuerKey.publicKey();
  const asset = new StellarSdk.Asset(code, issuerPublicKey);

  const account = await (async () => {
    try {
      return await getConfig().horizonServer.loadAccount(accountPublicKey);
    } catch {
      throw new Error(
        `Your account ${issuerPublicKey} does not exist on the Stellar ${
          getConfig().network
        } network. It must be created before it can be used to submit transactions.`
      );
    }
  })();
  const fee = await getConfig().horizonServer.fetchBaseFee();

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee,
    networkPassphrase: getConfig().networkPassphrase
  });
  transaction.setTimeout(300);
  transaction.addMemo(StellarSdk.Memo.text(`Create ${code} NFT ✨`));
  transaction.addOperation(
    StellarSdk.Operation.beginSponsoringFutureReserves({
      sponsoredId: issuerPublicKey
    })
  );
  transaction.addOperation(
    StellarSdk.Operation.createAccount({
      destination: issuerPublicKey,
      startingBalance: "0"
    })
  );

  transaction.addOperation(
    StellarSdk.Operation.manageData({
      source: issuerPublicKey,
      name: `ipfshash`,
      value: ipnft
    })
  );

  transaction.addOperation(
    StellarSdk.Operation.endSponsoringFutureReserves({
      source: issuerPublicKey
    })
  );
  transaction.addOperation(
    StellarSdk.Operation.changeTrust({ asset: asset, limit: supply })
  );
  transaction.addOperation(
    StellarSdk.Operation.payment({
      source: issuerPublicKey,
      destination: issuerPublicKey,
      asset: asset,
      amount: supply
    })
  );
  transaction.addOperation(
    StellarSdk.Operation.setOptions({
      source: issuerPublicKey,
      setFlags: StellarSdk.AuthImmutableFlag,
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

  return { code, issuer: issuerPublicKey, xdr };
}

export async function storeIpfsBuildTx(
  accountPublicKey: string,
  nftPayload: NFTPayload
) {
  let issuerKey = StellarSdk.Keypair.random();
  nftPayload.issuer = issuerKey.publicKey();
  let metadata = await storeNFT(nftPayload);

  return await buildNFTTransaction(accountPublicKey, issuerKey, metadata);
}
