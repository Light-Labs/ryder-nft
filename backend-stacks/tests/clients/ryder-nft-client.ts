import { Chain, Tx, types, Account } from "../deps.ts";

export function mint(id: number, tier: number, userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "mint",
    [types.uint(id), types.uint(tier)],
    userAddress
  );
}

export function burn(id: number, userAddress: string) {
  return Tx.contractCall("ryder-nft", "burn", [types.uint(id)], userAddress);
}

export function transfer(
  id: number,
  senderAddress: string,
  recipientAddress: string,
  userAddress?: string
) {
  return Tx.contractCall(
    "ryder-nft",
    "transfer",
    [
      types.uint(id),
      types.principal(senderAddress),
      types.principal(recipientAddress),
    ],
    userAddress ? userAddress : senderAddress
  );
}

export function listInUstx(
  id: number,
  price: number,
  commission: string,
  userAddress: string
) {
  return Tx.contractCall(
    "ryder-nft",
    "list-in-ustx",
    [types.uint(id), types.uint(price), commission],
    userAddress
  );
}

export function unlistInUstx(id: number, userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "unlist-in-ustx",
    [types.uint(id)],
    userAddress
  );
}

export function buyInUstx(id: number, commission: string, userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "buy-in-ustx",
    [types.uint(id), commission],
    userAddress
  );
}

export function setMinter(newMinter: string, userAddress: string) {
  return Tx.contractCall("ryder-nft", "set-minter", [newMinter], userAddress);
}
