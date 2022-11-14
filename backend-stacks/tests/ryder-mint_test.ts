import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { setMinter, expectNumberOfNfts } from "./clients/ryder-nft-client.ts";
import {
  claim,
  flipMintActive,
  mintMany,
  dickson4973Permut,
  MINT_LIMIT,
} from "./clients/ryder-mint-client.ts";

export const shuffleHeight = 10;

Clarinet.test({
  name: "Ensure that users can mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(shuffleHeight);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    block = chain.mineBlock([claim(wallet_1.address)]);
    console.log(block.receipts[0].events);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      250_000_000,
      wallet_1.address,
      deployer.address
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
  name: "Ensure that users can't mint while minting is paused",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(shuffleHeight);
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
  name: "Ensure that users can mint different tiers between 1 and 7",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(shuffleHeight);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    block = chain.mineBlock([mintMany([1, 2], wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      300_000_000,
      wallet_1.address,
      deployer.address
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      dickson4973Permut(chain, 1, deployer.address),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      dickson4973Permut(chain, 2, deployer.address),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
    expectNumberOfNfts(chain, 2, wallet_1.address)

    // try wrong tiers
    block = chain.mineBlock([mintMany([0, 8], wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    expectNumberOfNfts(chain, 2, wallet_1.address)

  },
});

Clarinet.test({
  name: "Ensure that mint limit for each tier is respected",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(shuffleHeight);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    // mint all 6 nfts of tier 7
    block = chain.mineBlock([mintMany([7, 7, 7, 7, 7, 7], wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    // try to mint another one
    block = chain.mineBlock([mintMany([7], wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    expectNumberOfNfts(chain, 6, wallet_1.address);
  },
});

Clarinet.test({
  name: "Ensure that all nft ids are mintable",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const nftIds: any = {};
    for (let i = 1; i < MINT_LIMIT; ++i) {
      const nftId = dickson4973Permut(chain, i, deployer.address);
      if (nftIds[nftId]) {
        throw new Error("err " + nftId + " " + nftIds[nftId] + " " + i);
      } else {
        nftIds[nftId] = i;
      }
    }
    assertEquals(Object.keys(nftIds).length, MINT_LIMIT);
  },
});
