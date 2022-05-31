import { Chain, Tx, types, Account } from "../deps.ts";

export function claim(userAddress: string) {
  return Tx.contractCall("ryder-mint", "claim", [], userAddress);
}

export function mintMany(tiers: number[], userAddress: string) {
  return Tx.contractCall(
    "ryder-mint",
    "mint-many",
    [types.list(tiers.map((t) => types.uint(t)))],
    userAddress
  );
}

export function flipMintActive(userAddress: string) {
  return Tx.contractCall("ryder-mint", "flip-mint-active", [], userAddress);
}

export function dickson4973Permut(
  chain: Chain,
  index: number,
  userAddress: string
) {
  return chain.callReadOnlyFn(
    "ryder-mint",
    "dickson-4973-permut",
    [types.uint(index)],
    userAddress
  ).result;
}
