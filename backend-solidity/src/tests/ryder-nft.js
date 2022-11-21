const { expect } = require("chai");

describe("nf-token", function () {
  let ryderNft, owner, bob, jane, sara;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const id1 = 123;
  const id2 = 124;

  beforeEach(async () => {
    [owner, bob, jane, sara] = await ethers.getSigners();
    const ryderNftContract = await ethers.getContractFactory("RyderNFT");
    const admins = [owner.getAddress()];
    ryderNft = await ryderNftContract.deploy(admins);
    await ryderNft.deployed([owner]);
  });

  it("return the correct tier id", async function () {
    await ryderNft.connect(owner).setDicksonParameter(100);
    expect(await ryderNft.tokenIdToTierId(1)).to.equal(2201);
    expect(await ryderNft.tokenIdToTierId(2)).to.equal(4932);
    expect(await ryderNft.tokenIdToTierId(3)).to.equal(4040);
    expect(await ryderNft.tokenIdToTierId(5003)).to.equal(100);
  });

  it("throws if dickson parameter is set twice", async function () {
    await ryderNft.connect(owner).setDicksonParameter(100)
    await expect(ryderNft.connect(owner).setDicksonParameter(200)).to.be
      .revertedWithCustomError;
  });

  it("return the correct meta data", async function () {
    expect(await ryderNft.name()).to.equal("Ryder NFT");
    expect(await ryderNft.symbol()).to.equal("RYD");
    expect(await ryderNft.tokenURI(1)).to.equal("ipfs://");
  });

  it('correctly burns a NFT', async function() {
    await ryderNft.connect(owner).setMinter(owner.getAddress(), true);
    await ryderNft.connect(owner).mint(bob.address)
    expect(await ryderNft.connect(bob).burn(id1)).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    await expect(ryderNft.ownerOf(id1)).to.be.revertedWith('003002');
  });
});
