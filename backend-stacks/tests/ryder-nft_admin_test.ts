import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  setTokenUri,
  freezeMetadata,
  levelUpNfts,
} from "./clients/ryder-nft-client.ts";

Clarinet.test({
  name: "Ensure that admin can change metadata until frozen",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri/{id}.json", deployer.address),
      levelUpNfts(deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([freezeMetadata(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // try to change token uri after freeze
    block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri-2/{id}.json", deployer.address),
      levelUpNfts(deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(504); // err-metadata-frozen
    block.receipts[1].result.expectErr().expectUint(504); // err-metadata-frozen

  },
});

Clarinet.test({
  name: "Ensure that user can't change metadata",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      setTokenUri("ipfs://new-token-uri/{id}.json", wallet_1.address),
      levelUpNfts(wallet_1.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(403);
    block.receipts[1].result.expectErr().expectUint(403);
  },
});
