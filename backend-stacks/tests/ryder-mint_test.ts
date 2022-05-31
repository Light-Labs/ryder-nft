import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { setMinter, transfer } from "./clients/ryder-nft-client.ts";
import {
  claim,
  flipMintActive,
  mintMany,
  dickson4973Permut,
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
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      10_000_000_000,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      dickson4973Permut(chain, 101, deployer.address),
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
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(500); // err-paused

    // un-pause mint
    block = chain.mineBlock([
      flipMintActive(deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

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
  name: "Ensure that users can mint different tiers",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(10);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    block = chain.mineBlock([mintMany([1, 2], wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      12_500_000_000,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      dickson4973Permut(chain, 101, deployer.address),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      dickson4973Permut(chain, 1, deployer.address),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
  },
});

Clarinet.test({
  name: "Ensure that all nft ids are mintable",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const nftIds: any = {};
    for (let i = 1; i < 4974; i++) {
      const nftId = dickson4973Permut(chain, i, deployer.address);
      if (nftIds[nftId]) {
        throw new Error("err " + nftId + " " + nftIds[nftId] +  " " + i);
      } else {
        nftIds[nftId] = i;
      }
    }
    assertEquals(Object.keys(nftIds).length, 4973)
  },
});
