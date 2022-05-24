import { Chain, Tx, types, Account } from "../deps.ts";

export function mint(id: number, tier: number, userAddress: string) {
  return Tx.contractCall(
    "ryder-bridge",
    "mint",
    [types.uint(id), types.uint(tier)],
    userAddress
  );
}

export function burn(id: number, userAddress: string) {
  return Tx.contractCall("ryder-bridge", "burn", [types.uint(id)], userAddress);
}
