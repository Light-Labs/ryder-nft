import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  transfer,
  listInUstx,
  buyInUstx,
  unlistInUstx,
  setLaunched,
} from "./clients/ryder-nft-client.ts";
import { claim, enabledPublicMint } from "./clients/ryder-mint-client.ts";
import * as Errors from "./clients/error-codes.ts";

Clarinet.test({
  name: "Ensure that NFT can be listed and unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    const commissionFree = `'${deployer.address}.commission-free`;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      listInUstx(1, 50000000, commissionFree, wallet_1.address),
      unlistInUstx(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that users can't list and unlist other NFT",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    const commissionFree = `'${deployer.address}.commission-free`;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      listInUstx(1, 50000000, commissionFree, wallet_1.address),
      listInUstx(1, 50000000, commissionFree, deployer.address),
      unlistInUstx(1, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(Errors.ERR_UNAUTHORIZED);
    block.receipts[3].result.expectErr().expectUint(Errors.ERR_UNAUTHORIZED);
  },
});

Clarinet.test({
  name: "Ensure that NFT can't be transferred when listed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    const commissionFree = `'${deployer.address}.commission-free`;
    enabledPublicMint(chain, deployer);

    const PRICE_IN_USTX = 50_000_000;
    let block = chain.mineBlock([
      claim(wallet_1.address),
      listInUstx(1, PRICE_IN_USTX, commissionFree, wallet_1.address),
      transfer(1, wallet_1.address, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(Errors.ERR_LISTING);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-listing-in-ustx",
      [types.uint(1)],
      wallet_1.address
    );
    receipt.result.expectSome().expectTuple().price.expectUint(PRICE_IN_USTX);
  },
});

Clarinet.test({
  name: "Ensure that NFT can be listed and bought",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    const commissionFree = `'${deployer.address}.commission-free`;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      listInUstx(1, 50_000_000, commissionFree, wallet_1.address),
      buyInUstx(1, commissionFree, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    let stxEventbuy = block.receipts[2].events[0];
    let nftEventbuy = block.receipts[2].events[1];
    let logEventbuy = block.receipts[2].events[2];

    assertEquals(stxEventbuy.stx_transfer_event.amount, "50000000");
    assertEquals(stxEventbuy.stx_transfer_event.recipient, wallet_1.address);
    assertEquals(nftEventbuy.nft_transfer_event.recipient, wallet_2.address);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-listing-in-ustx",
      [types.uint(1)],
      wallet_1.address
    );
    receipt.result.expectNone();
  },
});

Clarinet.test({
  name: "Ensure that NFT can't be bought when unlisted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    let deployer = accounts.get("deployer")!;
    let wallet_1 = accounts.get("wallet_1")!;
    let wallet_2 = accounts.get("wallet_2")!;
    const commissionFree = `'${deployer.address}.commission-free`;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      claim(wallet_1.address),
      listInUstx(1, 50000000, commissionFree, wallet_1.address),
      unlistInUstx(1, wallet_1.address),
      buyInUstx(1, commissionFree, wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectErr().expectUint(Errors.ERR_LISTING);
  },
});
