import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  getTierByTokenId,
  getTierId,
  getTier,
  getDicksonParameter,
} from "./clients/ryder-nft-client.ts";
import {
  shuffleIds,
  shufflePrepare,
  dickson5003Permut,
  enabledPublicMint,
  MAX_TOKENS,
} from "./clients/ryder-mint-client.ts";
import * as Errors from "./clients/error-codes.ts";

Clarinet.test({
  name: "Ensure that admin can shuffle ids",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    let receipt = getDicksonParameter(chain, deployer.address);
    receipt.result.expectUint(0);

    let block = chain.mineBlock([
      shufflePrepare(deployer.address),
      shuffleIds(wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(Errors.ERR_FATALE);

    block = chain.mineBlock([shuffleIds(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    receipt = getDicksonParameter(chain, deployer.address);
    receipt.result.expectUint(3600);

    receipt = getTierId(chain, 1, deployer.address);
    receipt.result.expectSome().expectUint(2644);

    receipt = getTierByTokenId(chain, 1, deployer.address);
    receipt.result.expectUint(2);
  },
});

Clarinet.test({
  name: "Ensure that admin can't shuffle twice",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    let block = chain.mineBlock([
      shufflePrepare(deployer.address),
      shufflePrepare(deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(Errors.ERR_ALREADY_DONE);

    block = chain.mineBlock([shufflePrepare(deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_ALREADY_DONE);
  },
});

Clarinet.test({
  name: "Ensure that different blocks result in different Dickson parameters",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    enabledPublicMint(chain, deployer);

    chain.mineEmptyBlock(1);

    let block = chain.mineBlock([shufflePrepare(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-nft",
      "get-shuffle-height",
      [],
      wallet_1.address
    );
    receipt.result.expectSome().expectUint(3);

    block = chain.mineBlock([shuffleIds(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    receipt = getDicksonParameter(chain, deployer.address);
    receipt.result.expectUint(397);

    receipt = getTierId(chain, 1, deployer.address);
    receipt.result.expectSome().expectUint(4300);

    receipt = getTierByTokenId(chain, 1, deployer.address);
    receipt.result.expectUint(2);
  },
});

Clarinet.test({
  name: "Ensure that all tiers have the correct count",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;

    const tierIds: any = {
      u1: {},
      u2: {},
      u3: {},
      u4: {},
      u5: {},
      u6: {},
      u7: {},
    };
    for (let i = 0; i < MAX_TOKENS; ++i) {
      const tier = getTier(chain, i, deployer.address).result;
      tierIds[tier][i] = tier;
    }
    assertEquals(Object.keys(tierIds.u1).length, 103);
    assertEquals(Object.keys(tierIds.u2).length, 4265);
    assertEquals(Object.keys(tierIds.u3).length, 500);
    assertEquals(Object.keys(tierIds.u4).length, 100);
    assertEquals(Object.keys(tierIds.u5).length, 20);
    assertEquals(Object.keys(tierIds.u6).length, 10);
    assertEquals(Object.keys(tierIds.u7).length, 5);
  },
});
