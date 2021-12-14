import { Networks } from "stellar-base";
import axios from "axios";

export function getConfig() {
  switch (process.env.STELLAR_NETWORK) {
    case "testnet":
      return {
        network: "testnet",
        networkPassphrase: Networks["TESTNET"],
        horizonUrl: "https://horizon-testnet.stellar.org",
        ipfsUrl: (cid) => `https://ipfs.io/ipfs/${cid}`,
        explorerAssetUrl: (code, issuer) =>
          `https://stellar.expert/explorer/testnet/asset/${code}-${issuer}`,
        explorerAssetHoldersUrl: (code, issuer) =>
          `https://stellar.expert/explorer/testnet/asset/${code}-${issuer}?filter=asset-holders`,
        dexAssetUrl: (code, issuer) =>
          `https://stellarterm.com/exchange/${code}-${issuer}/XLM-native/testnet`
      };
    default:
      return {
        network: "pubnet",
        networkPassphrase: Networks["PUBLIC"],
        horizonUrl: "https://horizon.stellar.org",
        ipfsUrl: (cid) => `https://ipfs.io/ipfs/${cid}`,
        explorerAssetUrl: (code, issuer) =>
          `https://stellar.expert/explorer/public/asset/${code}-${issuer}`,
        explorerAssetHoldersUrl: (code, issuer) =>
          `https://stellar.expert/explorer/public/asset/${code}-${issuer}?filter=asset-holders`,
        dexAssetUrl: (code, issuer) =>
          `https://stellarterm.com/exchange/${code}-${issuer}/XLM-native`
      };
  }
}

export async function getAccount(publicKey) {
  let account = await axios
    .get(`${getConfig().horizonUrl}/accounts/${publicKey}`)
    .then(({ data }) => data);
  return account;
}
