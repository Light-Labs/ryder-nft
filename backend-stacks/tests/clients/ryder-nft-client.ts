import { Chain, Tx, types, Account, assertEquals } from "../deps.ts";

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

export function setTokenUri(newTokenUri: string, userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "set-token-uri",
    [types.ascii(newTokenUri)],
    userAddress
  );
}

export function freezeMetadata(userAddress: string) {
  return Tx.contractCall("ryder-nft", "freeze-metadata", [], userAddress);
}

export function setAdmin(newAdmin: string, userAddress: string) {
  return Tx.contractCall("ryder-nft", "set-admin", [newAdmin], userAddress);
}

export function setMinter(newMinter: string, userAddress: string) {
  return Tx.contractCall("ryder-nft", "set-minter", [newMinter], userAddress);
}

export function setBurner(newBurner: string, userAddress: string) {
  return Tx.contractCall("ryder-nft", "set-burner", [newBurner], userAddress);
}

export function levelUpNfts(userAddress: string) {
  return Tx.contractCall("ryder-nft", "level-up-nfts", [], userAddress);
}

export function getNftSeed(chain: Chain, id: number, userAddress: string) {
  return chain.callReadOnlyFn(
    "ryder-nft",
    "get-nft-seed",
    [types.uint(id)],
    userAddress
  );
}

export function expectNumberOfNfts(
  chain: Chain,
  count: number,
  userAddress: string
) {
  const nfts = chain.getAssetsMaps().assets[`.ryder-nft.ryder`];
  assertEquals(count, nfts ? nfts[userAddress] || 0 : 0);
}
