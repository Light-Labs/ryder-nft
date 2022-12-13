import * as fs from "fs";
import { callReadOnlyFunction } from "micro-stacks/api";
import { uintCV } from "micro-stacks/clarity";
import { StacksMainnet } from "micro-stacks/network";

const MAX_TOKENS = 5003;
const RYDER_NFT_CONTRACT = { address: "SP1234", name: "ryder-nft-v1" };
const network = new StacksMainnet({ coreApiUrl: "http://localhost:3999" });

async function fetchTierByNftId(nftId: number) {
  return callReadOnlyFunction({
    contractAddress: RYDER_NFT_CONTRACT.address,
    contractName: RYDER_NFT_CONTRACT.name,
    functionName: "get-tier-by-nft-id",
    functionArgs: [uintCV(nftId)],
    network,
  });
}

(async () => {
  console.log("start");
  for (let i = 1; i <= MAX_TOKENS; i++) {
    const tier = "unrevealed"; // await fetchTierByNftId(1);
    const metadata = {
      sip: 16,
      id: i,
      name: `Ryder Digital Collectible #${i}`,
      description:
        "Ryder is the world's first social wallet. One tap to save, swap, and recover assets. The first edition is limited to 5,003 pieces redeemable for the Ryder device. Each collectible comes with its own unique early backer benefits.",
      image:
        "ipfs://bafybeicxq2kwlwixiqb364mbdpwvgx2p2xechhyusetj3sxytw64gduws4",
      external_url: "https://ryder.sale",
      attributes: [
        {
          trait_type: "tier",
          value: tier,
        },
      ],
      collection: "Ryder Digital Collectible"
    };
    fs.writeFileSync(`meta-data-0/${i}.json`, JSON.stringify(metadata));
  }
  console.log("done");
})();
