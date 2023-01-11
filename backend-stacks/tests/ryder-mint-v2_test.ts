import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";

import { enabledPublicMint, claimTwenty } from "./clients/ryder-mint-client.ts";
import { shufflePrepare, shuffleIds } from "./clients/ryder-mint-client.ts";
import { setMintLimit, setMinter } from "./clients/ryder-nft-client.ts";
import {
  mintToContract,
  setMintEnabled,
  buy,
  claim as claimV2,
  claimTen as claimV2Ten,
} from "./clients/ryder-mint-v2-client.ts";
import * as Errors from "./clients/error-codes.ts";

Clarinet.test({
  name: "Ensure that all nfts after reveal can be minted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

    // mint some tokens with minter v1
    let block = chain.mineBlock([claimTwenty(wallet_1.address)]);
    block.receipts[0].result.expectOk();

    block = chain.mineBlock([shufflePrepare(deployer.address)]);
    block.receipts[0].result.expectOk();
    block = chain.mineBlock([
      shuffleIds(deployer.address),
      setMintLimit(40, deployer.address),
    ]);
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();

    block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint-v2`, true, deployer.address),
      mintToContract(10, deployer.address),
      setMintEnabled(true, deployer.address),
    ]);
    block.receipts[0].result.expectOk();
    block.receipts[1].result.expectOk();
    block.receipts[2].result.expectOk();

    let reciept = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "nfts-available",
      [],
      deployer.address
    );
    reciept.result.expectUint(10);

    block = chain.mineBlock([buy(10, wallet_1.address)]);
    let expectedClaimHeight = 7;
    block.receipts[0].result.expectOk().expectUint(expectedClaimHeight);

    chain.mineEmptyBlock(1);

    block = chain.mineBlock([
      claimV2Ten(expectedClaimHeight, wallet_1.address),
    ]);

    console.log(block.receipts);
    block.receipts[0].result.expectOk();

    reciept = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "nfts-available",
      [],
      deployer.address
    );
    reciept.result.expectUint(0);
  },
});

Clarinet.test({
  name: "Ensure that users can't mint while minting is paused",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([buy(1, wallet_1.address)]);
    block.receipts[0].result.expectErr().expectUint(Errors.ERR_BAD_MINT_STATUS);

    // try to mint while not enabled
    block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint-v2`, true, deployer.address),
      mintToContract(10, deployer.address),
      buy(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectErr().expectUint(Errors.ERR_BAD_MINT_STATUS);

    // un-pause mint
    block = chain.mineBlock([
      setMintEnabled(true, deployer.address),
      buy(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectUint(4);

    // pause again
    block = chain.mineBlock([
      setMintEnabled(false, deployer.address),
      buy(1, wallet_1.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(Errors.ERR_BAD_MINT_STATUS);

    let receipt = chain.callReadOnlyFn(
      "ryder-mint-v2",
      "get-mint-enabled",
      [],
      wallet_1.address
    );
    receipt.result.expectBool(false);
  },
});
