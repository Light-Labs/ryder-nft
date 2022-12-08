import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Recipient of Payments", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const [ryderNftContract, ryderMintContract] = await Promise.all([
    ethers.getContractFactory("RyderNFT"),
    ethers.getContractFactory("RyderMint"),
  ]);

  const ryderNft = await ryderNftContract.deploy([deployer.address]);
  const ryderMint = await ryderMintContract.deploy(ryderNft.address, []);

  await ryderMint.setPaymentRecipient(deployer.address, {
    from: deployer.address,
  });
  await ryderNft.setMinter(ryderMint.address, true, { from: deployer.address });

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
