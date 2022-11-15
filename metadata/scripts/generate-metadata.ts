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
    const tier = await fetchTierByNftId(1);
    const metadata = {
      name: "Ryder NFT",
      description: "",
      image: "ipfs://Qm",
      external_url: "",
      attributes: [
        {
          display_type: "number",
          trait_type: "tier",
          value: tier,
        },
      ],
      localization: {
        uri: "ipfs://Qm/1/{locale}.json",
        default: "en",
        locales: ["kr", "zh", "en", "fr", "de"],
      },
    };
    fs.writeFileSync(`meta-data/${i}.json`, JSON.stringify(metadata));
  }
})();
