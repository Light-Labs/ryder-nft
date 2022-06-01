import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { setMinter, expectNumberOfNfts } from "./clients/ryder-nft-client.ts";
import {
  claim,
  flipMintActive,
  mintMany,
  dickson4973Permut,
  setMintLimits,  
} from "./clients/ryder-mint-client.ts";

import { shuffleHeight } from "./ryder-mint_test.ts";

Clarinet.test({
  name: "Ensure that admin can't activate before shuffle height",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    let block = chain.mineBlock([flipMintActive(deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(501); // err-too-early

    chain.mineEmptyBlock(8);
    // still too early
    block = chain.mineBlock([flipMintActive(deployer.address)]);
    block.receipts[0].result.expectErr().expectUint(501); // err-too-early

    // shuffleHeight blocks passed
    block = chain.mineBlock([flipMintActive(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that admin can change mint-limits",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    chain.mineEmptyBlock(shuffleHeight);
    let block = chain.mineBlock([
      setMinter(`'${deployer.address}.ryder-mint`, deployer.address),
      flipMintActive(deployer.address),
    ]);

    block = chain.mineBlock([
      setMintLimits(
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 100, 4213, 500, 100, 30, 20, 10],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    expectNumberOfNfts(chain, 0, wallet_1.address);


    // increase mint-limit of tier 2 by 1 on stx
    // decrease mint-limit of tier 2 by 1 on eth
    block = chain.mineBlock([
      setMintLimits(
        [0, 0, 1, 0, 0, 0, 0, 0],
        [0, 100, 4212, 500, 100, 30, 20, 10],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);

    block = chain.mineBlock([claim(wallet_1.address)]);
    block.receipts[0].result.expectOk().expectBool(true);
    expectNumberOfNfts(chain, 1, wallet_1.address);

    // try to increase the mint-limit of tier 1 by 1 on stx only
    block = chain.mineBlock([
      setMintLimits(
        [0, 1, 1, 0, 0, 0, 0, 0],
        [0, 100, 4212, 500, 100, 30, 20, 10],
        deployer.address
      ),
    ]);
    block.receipts[0].result.expectErr().expectUint(504); // invalid limits

  },
});
