import { Chain, Tx, types, Account } from "../deps.ts";

export const MINT_LIMIT = 5003;

export function claim(userAddress: string) {
  return Tx.contractCall("ryder-nft", "claim", [], userAddress);
}

export function setLaunched(launched: boolean, userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "set-launched",
    [types.bool(launched)],
    userAddress
  );
}

export function setPublicMint(launched: boolean, userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "set-public-mint",
    [types.bool(launched)],
    userAddress
  );
}

export function setMintLimit(mintLimit: number, userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "set-mint-limit",
    [types.uint(mintLimit)],
    userAddress
  );
}

export function setAllowListedMany(userAddresses: string[], userAddress: string) {
  return Tx.contractCall(
    "ryder-nft",
    "set-allow-listed-many",
    [types.list(userAddresses.map(s => types.principal(s)))],
    userAddress
  );
}

export function dickson5003Permut(
  chain: Chain,
  index: number,
  dicksonParameter: number,
  userAddress: string
) {
  return chain.callReadOnlyFn(
    "ryder-nft",
    "dickson-5003-permut",
    [types.uint(index), types.uint(dicksonParameter)],
    userAddress
  ).result;
}

export function enabledPublicMint(chain: Chain, deployer: Account) {
  let block = chain.mineBlock([
    setLaunched(true, deployer.address),
    setPublicMint(true, deployer.address),
  ]);
  block.receipts[0].result.expectOk().expectBool(true);
  block.receipts[1].result.expectOk().expectBool(true);

  return block;
}
