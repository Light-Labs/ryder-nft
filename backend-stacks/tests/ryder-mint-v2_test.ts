import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";

import { enabledPublicMint, claimTwenty } from "./clients/ryder-mint-client.ts";
import { shufflePrepare, shuffleIds } from "./clients/ryder-mint-client.ts";
import { setMintLimit, setMinter } from "./clients/ryder-nft-client.ts";
import {
  mintToContract,
  setMintEnabled,
  buy,
  claimTen,
} from "./clients/ryder-mint-v2-client.ts";

Clarinet.test({
  name: "Ensure that all nfts after reveal can be minted",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    enabledPublicMint(chain, deployer);

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

    block = chain.mineBlock([buy(10, wallet_1.address)]);
    let expectedClaimHeight = 7;
    block.receipts[0].result.expectOk().expectUint(expectedClaimHeight);

    chain.mineEmptyBlock(1);

    block = chain.mineBlock([claimTen(expectedClaimHeight, wallet_1.address)]);

    console.log(block.receipts);
    block.receipts[0].result.expectOk();
  },
});
