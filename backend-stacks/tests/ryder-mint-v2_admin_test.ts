import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import {
  expectNumberOfNfts,
  setMintLimit,
  setMinter,
} from "./clients/ryder-nft-client.ts";
import { enabledPublicMint, claimFive } from "./clients/ryder-mint-client.ts";
import {
  buy,
  claimFor,
  claimManyFor,
  setMintEnabled,
  mintToContract,
  setClaimTrigger,
} from "./clients/ryder-mint-v2-client.ts";
import * as Errors from "./clients/error-codes.ts";

Clarinet.test({
  name: "Ensure that admin can claim for any buyer",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    const wallet_2 = accounts.get("wallet_2");

    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint-v2`, true, deployer.address),
      mintToContract(10, deployer.address),
      setMintEnabled(true, deployer.address),
    ]);
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk();

    block = chain.mineBlock([buy(1, wallet_1.address)]);
    block.receipts[0].result.expectOk().expectUint(3);

    // try to claim early
    block = chain.mineBlock([claimFor(3, wallet_1.address, deployer.address)]);
    block.receipts[0].result
      .expectErr()
      .expectUint(Errors.ERR_CANNOT_CLAIM_FUTURE);

    // try to claim
    block = chain.mineBlock([
      claimFor(1, wallet_1.address, deployer.address), // at wrong height
      claimFor(3, wallet_2.address, deployer.address), // for wrong buyer
      claimFor(3, wallet_1.address, deployer.address), // correctly
    ]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_NO_CLAIMS);
    block.receipts[1].result.expectErr().expectUint(Errors.ERR_NO_CLAIMS);
    block.receipts[2].result.expectOk().expectUint(2);
  },
});

Clarinet.test({
  name: "Ensure that claim trigger can claim for any buyer only when set by admin",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    const wallet_2 = accounts.get("wallet_2");

    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint-v2`, true, deployer.address),
      mintToContract(10, deployer.address),
      setMintEnabled(true, deployer.address),
      Tx.contractCall(
        "ryder-mint-v2",
        "set-claim-trigger",
        [types.principal(wallet_2.address), types.bool(false)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk();

    block = chain.mineBlock([buy(1, wallet_1.address)]);
    block.receipts[0].result.expectOk().expectUint(3);

    chain.mineEmptyBlock(1);

    // try to claim
    block = chain.mineBlock([
      claimFor(3, wallet_1.address, wallet_2.address), // forbidden
      Tx.contractCall(
        "ryder-mint-v2",
        "set-claim-trigger",
        [types.principal(wallet_2.address), types.bool(true)],
        deployer.address
      ),

      claimFor(3, wallet_1.address, wallet_2.address), // correctly
    ]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_FORBIDDEN);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectUint(2);
  },
});

Clarinet.test({
  name: "Ensure that admin can claim for many buyers",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    const wallet_2 = accounts.get("wallet_2");
    const wallet_3 = accounts.get("wallet_3");

    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint-v2`, true, deployer.address),
      mintToContract(10, deployer.address),
      setMintEnabled(true, deployer.address),
    ]);
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk();

    block = chain.mineBlock([buy(2, wallet_1.address)]);
    block.receipts[0].result.expectOk().expectUint(3);

    block = chain.mineBlock([buy(1, wallet_2.address)]);
    block.receipts[0].result.expectOk().expectUint(4);

    chain.mineEmptyBlock(1);

    // try to claim many for all buyers
    block = chain.mineBlock([
      claimManyFor(
        [3, 3, 4],
        [wallet_1.address, wallet_2.address, wallet_1.address],
        wallet_3.address
      ), // with wrong tx-sender
      claimManyFor(
        [4, 3, 4],
        [wallet_1.address, wallet_1.address, wallet_3.address],
        deployer.address
      ), // some at wrong height
      claimManyFor(
        [3, 4],
        [wallet_1.address, wallet_2.address],
        deployer.address
      ), // correctly
    ]);
    // with wrong tx-sender
    let result = block.receipts[0].result.expectOk().expectList();
    result[0].expectErr().expectUint(Errors.ERR_FORBIDDEN);
    result[1].expectErr().expectUint(Errors.ERR_FORBIDDEN);
    result[2].expectErr().expectUint(Errors.ERR_FORBIDDEN);

    // with some wrong height and wrong buyer
    result = block.receipts[1].result.expectOk().expectList();
    result[0].expectErr().expectUint(Errors.ERR_NO_CLAIMS);
    result[1].expectOk().expectUint(2);
    result[2].expectErr().expectUint(Errors.ERR_NO_CLAIMS);

    // correctly
    result = block.receipts[2].result.expectOk().expectList();
    result[0].expectOk().expectUint(6);
    result[1].expectOk().expectUint(10);
  },
});

Clarinet.test({
  name: "Ensure that admin can change payment recipient",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint-v2",
        "set-payment-recipient",
        [types.principal(wallet_1.address)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    let receipt = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "get-payment-recipient",
      [],
      deployer.address
    );
    receipt.result.expectPrincipal(wallet_1.address);
  },
});

Clarinet.test({
  name: "Ensure that admin can change mint price",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint-v2",
        "set-price-in-ustx",
        [types.uint(2000_000_000)],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    let receipt = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "get-price-in-ustx",
      [],
      deployer.address
    );
    receipt.result.expectUint(2000_000_000);
  },
});

Clarinet.test({
  name: "Ensure that admin can add and remove new admin",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");
    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint-v2",
        "set-admin",
        [types.principal(wallet_1.address), types.bool(true)],
        deployer.address
      ),
      Tx.contractCall(
        "ryder-mint-v2",
        "set-admin",
        [types.principal(deployer.address), types.bool(false)],
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);

    let receipt = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "is-admin",
      [types.principal(wallet_1.address)],
      deployer.address
    );
    receipt.result.expectBool(true);

    receipt = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "is-admin",
      [types.principal(deployer.address)],
      deployer.address
    );
    receipt.result.expectBool(false);
  },
});

Clarinet.test({
  name: "Ensure that admin can burn owned tokens",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1");

    enabledPublicMint(chain, deployer);

    // mint some tokens with minter v1
    let block = chain.mineBlock([claimFive(wallet_1.address)]);
    block.receipts[0].result.expectOk();

    block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint-v2`, true, deployer.address),
    ]);
    block.receipts[0].result.expectOk();

    // try to burn two tokens not owned by the contract
    block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint-v2",
        "burn-contract-tokens-top",
        ["0x0102"],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_BAD_MINT_STATUS);

    block = chain.mineBlock([
      mintToContract(10, deployer.address),
      setMintEnabled(true, deployer.address),
    ]);
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();

    let receipt = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "get-upper-bound",
      [],
      deployer.address
    );
    receipt.result.expectUint(15);

    // burn two tokens
    block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint-v2",
        "burn-contract-tokens-top",
        ["0x0102"],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    receipt = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "get-upper-bound",
      [],
      deployer.address
    );
    receipt.result.expectUint(13);
  },
});

Clarinet.test({
  name: "Non-admin cannot call admin functions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const non_admin = accounts.get("wallet_2")!.address;

    let block = chain.mineBlock([
      Tx.contractCall(
        "ryder-mint-v2",
        "set-admin",
        [types.principal(non_admin), types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint-v2",
        "set-claim-trigger",
        [types.principal(non_admin), types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint-v2",
        "set-mint-enabled",
        [types.bool(true)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint-v2",
        "set-price-in-ustx",
        [types.uint(3)],
        non_admin
      ),
      Tx.contractCall(
        "ryder-mint-v2",
        "set-payment-recipient",
        [types.principal(non_admin)],
        non_admin
      ),
      Tx.contractCall("ryder-mint-v2", "mint-to-contract", ["0x01"], non_admin),
      Tx.contractCall(
        "ryder-mint-v2",
        "burn-contract-tokens-top",
        ["0x01"],
        non_admin
      ),
    ]);
    block.receipts.map((receipt) =>
      receipt.result.expectErr().expectUint(Errors.ERR_UNAUTHORIZED)
    );
  },
});
