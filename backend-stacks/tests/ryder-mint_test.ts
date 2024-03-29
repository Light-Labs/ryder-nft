import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  setLaunched,
  enabledPublicMint,
  setPublicMint,
  dickson5003Permut,
  MAX_TOKENS,
  claim,
  claimTwo,
  claimFive,
  claimTwenty,
} from "./clients/ryder-mint-client.ts";

import { setMinter, setMintLimit } from "./clients/ryder-nft-client.ts";
import * as Errors from "./clients/error-codes.ts";

const MINT_PRICE = 1130_000_000;
const payment_recipient = 'SP1YZSSPWJ5D3S1G48ZPW8NGXVG0K2TZJJXDM6N0Q';

Clarinet.test({
  name: "Ensure that users can mint",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      MINT_PRICE,
      wallet_1.address,
      payment_recipient
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );

    let receipt = chain.callReadOnlyFn(
      "ryder-mint",
      "get-mint-count",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    receipt.result.expectUint(1);

    receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-token-id-nonce",
      [],
      wallet_1.address
    );
    receipt.result.expectUint(2);

    block = chain.mineBlock([
      Tx.contractCall("ryder-mint", "claim-two", [], wallet_2.address),
      Tx.contractCall("ryder-mint", "claim-five", [], wallet_2.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that users can't mint while minting is paused",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_NOT_LAUNCHED);

    // un-pause mint
    block = chain.mineBlock([
      setLaunched(true, deployer.address),
      setPublicMint(true, deployer.address),
      setMinter(`'${deployer.address}.ryder-mint`, true, deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectOk().expectBool(true);

    // pause again
    block = chain.mineBlock([
      setLaunched(false, deployer.address),
      claim(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(Errors.ERR_NOT_LAUNCHED);

    let receipt = chain.callReadOnlyFn(
      "ryder-mint",
      "get-mint-launched",
      [],
      wallet_1.address
    );
    receipt.result.expectBool(false);

    receipt = chain.callReadOnlyFn(
      "ryder-mint",
      "get-public-mint",
      [],
      wallet_1.address
    );
    receipt.result.expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that admin can set more than one minter",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-nft",
        "set-minter",
        [`'${deployer.address}.ryder-mint-free`, types.bool(true)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([
      claim(wallet_1.address),
      Tx.contractCall(
        "ryder-mint-free",
        "mint-free",
        [types.principal(wallet_1.address)],
        wallet_2.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[0].events.expectSTXTransferEvent(
      MINT_PRICE,
      wallet_1.address,
      payment_recipient
    );
    block.receipts[0].events.expectNonFungibleTokenMintEvent(
      types.uint(1),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );
    block.receipts[1].events.expectNonFungibleTokenMintEvent(
      types.uint(2),
      wallet_1.address,
      `${deployer.address}.ryder-nft`,
      "ryder"
    );

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-balance",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    receipt.result.expectUint(2);
  },
});

Clarinet.test({
  name: "Ensure that all nft ids are mintable and there are no doubles",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const tierIds: any = {};
    for (let i = 1; i <= MAX_TOKENS; ++i) {
      const tierId = dickson5003Permut(chain, i, 0, deployer.address);
      if (tierIds[tierId]) {
        throw new Error("err " + tierId + " " + tierIds[tierId] + " " + i);
      } else {
        tierIds[tierId] = i;
      }
    }
    assertEquals(Object.keys(tierIds).length, MAX_TOKENS);
  },
});

Clarinet.test({
  name: "Ensure that user can't mint above mint limit",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);
    const MINT_LIMIT = 28;
    let block = chain.mineBlock([setMintLimit(MINT_LIMIT, deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([
      claimTwenty(wallet_1.address),
      claimFive(wallet_1.address),
      claimTwo(wallet_1.address),
      claimTwo(wallet_1.address), // id 28 is last valid id, id 29 is above mint limit
      claim(wallet_1.address), // claim id 28.
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    block.receipts[3].result.expectErr().expectUint(Errors.ERR_ALREADY_DONE);
    block.receipts[4].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-balance",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    receipt.result.expectUint(MINT_LIMIT);
  },
});
