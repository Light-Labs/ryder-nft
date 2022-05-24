import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { setMinter, transfer } from "./clients/ryder-nft-client.ts";
import {
  claim,
  flipMintActive,
  mintMany,
  shuffleIds,
} from "./clients/ryder-mint-client.ts";

Clarinet.test({
  name: "Ensure that users can mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(10);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
      shuffleIds(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);

    block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectUint(1);
    block.receipts[0].events.expectSTXTransferEvent(
      10_000_000_000,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(10),
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
    chain.mineEmptyBlock(10);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      shuffleIds(wallet_1.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(500); // err-paused

    // un-pause mint
    block = chain.mineBlock([
      flipMintActive(deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectUint(1);

    // pause again
    block = chain.mineBlock([
      flipMintActive(deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(false);
    block.receipts[1].result.expectErr().expectUint(500); // err-paused
  },
});

Clarinet.test({
  name: "Ensure that users can't mint before ids are shuffled",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(10);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(503); // err-minting-failed
  },
});

Clarinet.test({
  name: "Ensure that users can't shuffle before shuffle height",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      shuffleIds(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(501); // err-too-early

    chain.mineEmptyBlock(8);
    block = chain.mineBlock([shuffleIds(wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(501); // err-too-early

    block = chain.mineBlock([shuffleIds(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that users can mint different tiers",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(10);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
      shuffleIds(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    block = chain.mineBlock([mintMany([1, 2], wallet_1.address)]);
    block.receipts[0].result.expectOk().expectUint(2);
    block.receipts[0].events.expectSTXTransferEvent(
      12_500_000_000,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(10),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
  },
});
