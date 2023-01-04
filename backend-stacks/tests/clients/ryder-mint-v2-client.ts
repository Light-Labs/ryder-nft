import { Chain, Tx, types, Account } from "../deps.ts";
import { setMinter } from "./ryder-nft-client.ts";

export function buy(amount: number, userAddress: string) {
  return Tx.contractCall(
    "ryder-mint-v2",
    "buy",
    [types.uint(amount)],
    userAddress
  );
}

export function claim(height: number, userAddress: string) {
  return Tx.contractCall("ryder-mint-v2", "claim", [types.uint(height)], userAddress);
}

export function claimTwo(height: number, userAddress: string) {
  return Tx.contractCall("ryder-mint-v2", "claim-many", [types.list([types.uint(height), types.uint(height)])], userAddress);
}

export function claimFive(height: number, userAddress: string) {
  return Tx.contractCall("ryder-mint-v2", "claim-many", [types.list([types.uint(height), types.uint(height), types.uint(height), types.uint(height), types.uint(height)])], userAddress);
}

export function claimTen(height: number, userAddress: string) {
  return Tx.contractCall("ryder-mint-v2", "claim-many", [types.list([types.uint(height), types.uint(height), types.uint(height), types.uint(height), types.uint(height), types.uint(height), types.uint(height), types.uint(height), types.uint(height), types.uint(height)])], userAddress);
}

export function setMintEnabled(enabled: boolean, userAddress: string) {
  return Tx.contractCall(
    "ryder-mint-v2",
    "set-mint-enabled",
    [types.bool(enabled)],
    userAddress
  );
}

export function mintToContract(amount: number, userAddress: string) {
  return Tx.contractCall(
    "ryder-mint-v2",
    "mint-to-contract",
    [types.buff("x".repeat(amount))],
    userAddress
  );
}

export function burnContractTokensTop(amount: number, userAddress: string) {
  return Tx.contractCall(
    "ryder-mint-v2",
    "burn-contract-tokens-top",
    [types.buff("x".repeat(amount))],
    userAddress
  );
}
