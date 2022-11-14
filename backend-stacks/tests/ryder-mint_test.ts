import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  setLaunched,
  enabledPublicMint,
  setPublicMint,
  dickson5003Permut,
  MINT_LIMIT,
  claim,
} from "./clients/ryder-mint-client.ts";

const MINT_PRICE = 1000_000_000;

Clarinet.test({
  name: "Ensure that users can mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      MINT_PRICE,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
  },
});

Clarinet.test({
  name: "Ensure that users can't mint while minting is paused",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(506); // err-not-launched

    // un-pause mint
    block = chain.mineBlock([
      setLaunched(true, deployer.address),
      setPublicMint(true, deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);

    // pause again
    block = chain.mineBlock([
      setLaunched(false, deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(506); // err-not-launched
  },
});

Clarinet.test({
  name: "Ensure that all nft ids are mintable",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const tierIds: any = {};
    for (let i = 1; i <= MINT_LIMIT; ++i) {
      const tierId = dickson5003Permut(chain, i, 0, deployer.address);
      if (tierIds[tierId]) {
        throw new Error("err " + tierId + " " + tierIds[tierId] + " " + i);
      } else {
        tierIds[tierId] = i;
      }
    }
    assertEquals(Object.keys(tierIds).length, MINT_LIMIT);
  },
});
