import { Clarinet, Tx, Chain, Account, types, assertEquals } from "./deps.ts";
import { mint, levelUpNfts, getNftSeed } from "./clients/ryder-nft-client.ts";

function hexToArrayBuffer(hex: string) {
  return new Uint8Array(hex.match(/[\da-f]{2}/gi)!.map((h) => parseInt(h, 16)));
}

Clarinet.test({
  name: "Ensure that admin can level up nfts",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let block = chain.mineBlock([
      mint(1, 1, deployer.address),
      mint(2, 7, deployer.address),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    // check seeds
    let seed = getNftSeed(chain, 1, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x010000000000000000000000000000000000000000000000000000000000000000"
        )
      );
    seed = getNftSeed(chain, 2, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x070000000000000000000000000000000000000000000000000000000000000000"
        )
      );

    // level up nfts
    block = chain.mineBlock([levelUpNfts(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    seed = getNftSeed(chain, 1, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x01c60c77a2fe4c38114522d186d6119fc1848260ecb95e1ef6f7fb3f7c96d76717"
        )
      );
    seed = getNftSeed(chain, 2, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x073454e94b5a91395e14a39bc73c64275356b0b2d84b1ba863b93676169e2d6559"
        )
      );

    // more up levelling possible
    block = chain.mineBlock([levelUpNfts(deployer.address)]);
    block.receipts[0].result.expectOk().expectBool(true);

    seed = getNftSeed(chain, 1, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x010e08fc97da36d9800aaeb091f2e452f9d80fbf6cf9dfbbd08b38e74fa8a9c890"
        )
      );
    seed = getNftSeed(chain, 2, deployer.address);
    seed.result
      .expectOk()
      .expectBuff(
        hexToArrayBuffer(
          "0x0769d25bd20a53aa4cc128fed1f88f541f840473492b66242ca9a921ad42fb4a95"
        )
      );
  },
});
