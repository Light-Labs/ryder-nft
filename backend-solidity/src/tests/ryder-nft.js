const { expect } = require("chai");

describe("RyderNFT", function () {
  let ryderNft, ryderMockMint, owner, bob, jane, sara;
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const id1 = 5003;
  const id2 = 5002;

  const ERR_ZERO_ADDRESS = "003001";
  const ERR_UNAUTHORIZED = "403";
  const ERR_ALREADY_DONE = "505";
  const ERR_MAX_MINT_REACHED = "507";
  const ERR_NOT_ALLOWED = "508"

  beforeEach(async () => {
    [owner, bob, jane, sara] = await ethers.getSigners();
    const [ryderNftContract, ryderMockMintContract] = await Promise.all([
      ethers.getContractFactory("RyderNFT"),
      ethers.getContractFactory("RyderMockMint")
    ]);
    const admins = [owner.getAddress()];
    ryderNft = await ryderNftContract.deploy(admins);
    ryderMockMint = await ryderMockMintContract.deploy(ryderNft.address);
    await ryderNft.setMinter(ryderMockMint.address, true, { from: owner.address });
  });

  it("authorized minter can mint", async function () {
    const tx = ryderMockMint["mint(address)"](bob.address);
    await expect(tx).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
  });

  it("unauthorized minter cannot mint", async function () {
    const tx = ryderNft.connect(bob).mint(bob.address);
    await expect(tx).to.be.revertedWith(ERR_UNAUTHORIZED);
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
  });

  it("admin can set authorized minter", async function () {
    await ryderNft.connect(owner).setMinter(bob.address, true);
    const tx = ryderNft.connect(bob).mint(bob.address);
    await expect(tx).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
  });

  it("admin can remove authorized minter", async function () {
    await ryderNft.connect(owner).setMinter(ryderMockMint.address, false);
    const tx = ryderMockMint["mint(address)"](bob.address);
    await expect(tx).to.be.revertedWith(ERR_UNAUTHORIZED);
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
  });

  it("return the correct tier id", async function () {
    await ryderNft.connect(owner).setDicksonParameter(5103); // same as 100
    expect(await ryderNft.tokenIdToTierId(1)).to.equal(2201);
    expect(await ryderNft.tokenIdToTierId(2)).to.equal(4932);
    expect(await ryderNft.tokenIdToTierId(3)).to.equal(4040);
    expect(await ryderNft.tokenIdToTierId(5003)).to.equal(100);
  });

  it("return the correct tier by valid token ID", async function () {
    await ryderNft.connect(owner).setDicksonParameter(100);
    await ryderMockMint["mint()"]();
    expect(await ryderNft.tierById(id1)).to.equal(7);
  });

  it("throws if dickson parameter is set twice", async function () {
    await ryderNft.connect(owner).setDicksonParameter(100)
    await expect(ryderNft.connect(owner).setDicksonParameter(200)).to.be
      .revertedWithCustomError;
  });

  it("admin can set another admin", async function () {
    await ryderNft.connect(owner).setAdmin(bob.address, true);
    expect(await ryderNft.isAdmin(bob.address)).to.equal(true);
  });

  it("admin cannot de-admin itself", async function () {
    const tx = ryderNft.connect(owner).setAdmin(owner.address, false);
    await expect(tx).to.be.revertedWith(ERR_NOT_ALLOWED);
  });

  it("return the correct metadata", async function () {
    await ryderMockMint["mint()"](); // mint one NFT because tokenURI throws for invalid NFTs
    expect(await ryderNft.name()).to.equal("Ryder NFT");
    expect(await ryderNft.symbol()).to.equal("RYD");
    expect(await ryderNft.tokenURI(id1)).to.equal("ipfs://bafybeih3uz24rpxzdbco6ebfy7rapyy7237wlkiiol7zrvqznr5hfua72a/5003.json");
  });

  it('correctly burns a NFT', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
    expect(await ryderNft.connect(bob).burn(id1)).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    await expect(ryderNft.ownerOf(id1)).to.be.revertedWith('003002');
  });

  // ERC721 tests

  it('correctly checks all the supported interfaces', async function () {
    expect(await ryderNft.supportsInterface('0x80ac58cd')).to.equal(true);
    expect(await ryderNft.supportsInterface('0x5b5e139f')).to.equal(true);
    expect(await ryderNft.supportsInterface('0x01ffc9a7')).to.equal(true);
  });

  it('correctly mints a NFT', async function () {
    const tx = ryderMockMint.connect(bob)["mint()"]();
    await expect(tx).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
  });

  it('returns correct balanceOf', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.balanceOf(bob.address)).to.equal(1);
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.balanceOf(bob.address)).to.equal(2);
  });

  it('throws when trying to get count of NFTs owned by 0x0 address', async function () {
    await expect(ryderNft.balanceOf(zeroAddress)).to.be.revertedWith(ERR_ZERO_ADDRESS);
  });

  it('throws when trying to mint NFT to 0x0 address', async function () {
    const tx = ryderMockMint.connect(bob)["mint(address)"](zeroAddress);
    await expect(tx).to.be.revertedWith(ERR_ZERO_ADDRESS);
  });

  it('finds the correct owner of NFToken id', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.ownerOf(id1)).to.equal(bob.address);
  });

  it('throws when trying to find owner of non-existing NFT id', async function () {
    await expect(ryderNft.ownerOf(id1)).to.be.revertedWith('003002');
  });

  it('correctly approves account', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.connect(bob).approve(sara.address, id1)).to.emit(ryderNft, 'Approval');
    expect(await ryderNft.getApproved(id1)).to.equal(sara.address);
  });

  it('correctly cancels approval', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await ryderNft.connect(bob).approve(sara.address, id1);
    await ryderNft.connect(bob).approve(zeroAddress, id1);
    expect(await ryderNft.getApproved(id1)).to.equal(zeroAddress);
  });

  it('throws when trying to get approval of non-existing NFT id', async function () {
    await expect(ryderNft.getApproved(id1)).to.be.revertedWith('003002');
  });

  it('throws when trying to approve NFT ID from a third party', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await expect(ryderNft.connect(sara).approve(sara.address, id1)).to.be.revertedWith('003003');
  });

  it('correctly sets an operator', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.connect(bob).setApprovalForAll(sara.address, true)).to.emit(ryderNft, 'ApprovalForAll');
    expect(await ryderNft.isApprovedForAll(bob.address, sara.address)).to.equal(true);
  });

  it('correctly sets then cancels an operator', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await ryderNft.connect(bob).setApprovalForAll(sara.address, true);
    await ryderNft.connect(bob).setApprovalForAll(sara.address, false);
    expect(await ryderNft.isApprovedForAll(bob.address, sara.address)).to.equal(false);
  });

  it('correctly transfers NFT from owner', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.connect(bob).transferFrom(bob.address, sara.address, id1)).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    expect(await ryderNft.balanceOf(sara.address)).to.equal(1);
    expect(await ryderNft.ownerOf(id1)).to.equal(sara.address);
  });

  it('correctly transfers NFT from approved address', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await ryderNft.connect(bob).approve(sara.address, id1);
    await ryderNft.connect(sara).transferFrom(bob.address, jane.address, id1);
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    expect(await ryderNft.balanceOf(jane.address)).to.equal(1);
    expect(await ryderNft.ownerOf(id1)).to.equal(jane.address);
  });

  it('correctly transfers NFT as operator', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await ryderNft.connect(bob).setApprovalForAll(sara.address, true);
    await ryderNft.connect(sara).transferFrom(bob.address, jane.address, id1);
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    expect(await ryderNft.balanceOf(jane.address)).to.equal(1);
    expect(await ryderNft.ownerOf(id1)).to.equal(jane.address);
  });

  it('throws when trying to transfer NFT as an address that is not owner, approved or operator', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await expect(ryderNft.connect(sara).transferFrom(bob.address, jane.address, id1)).to.be.revertedWith('003004');
  });

  it('throws when trying to transfer NFT to a zero address', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await expect(ryderNft.connect(bob).transferFrom(bob.address, zeroAddress, id1)).to.be.revertedWith(ERR_ZERO_ADDRESS);
  });

  it('throws when trying to transfer an invalid NFT', async function () {
    await expect(ryderNft.connect(bob).transferFrom(bob.address, sara.address, id1)).to.be.revertedWith('003004');
  });

  it('throws when trying to transfer an invalid NFT', async function () {
    await expect(ryderNft.connect(bob).transferFrom(bob.address, sara.address, id1)).to.be.revertedWith('003004');
  });

  it('correctly safe transfers NFT from owner', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.connect(bob)['safeTransferFrom(address,address,uint256)'](bob.address, sara.address, id1)).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    expect(await ryderNft.balanceOf(sara.address)).to.equal(1);
    expect(await ryderNft.ownerOf(id1)).to.equal(sara.address);
  });

  it('throws when trying to safe transfers NFT from owner to a smart contract', async function () {
    await ryderMockMint.connect(bob)["mint()"]();
    await expect(ryderNft.connect(bob)['safeTransferFrom(address,address,uint256)'](bob.address, ryderNft.address, id1)).to.be.revertedWithoutReason();
  });

  it('correctly safe transfers NFT from owner to smart contract that can receive NFTs', async function () {
    const tokenReceiverContract = await ethers.getContractFactory('NFTokenReceiverTestMock');
    const tokenReceiver = await tokenReceiverContract.deploy();
    await tokenReceiver.deployed();

    await ryderMockMint.connect(bob)["mint()"]();
    await ryderNft.connect(bob)['safeTransferFrom(address,address,uint256)'](bob.address, tokenReceiver.address, id1);
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    expect(await ryderNft.balanceOf(tokenReceiver.address)).to.equal(1);
    expect(await ryderNft.ownerOf(id1)).to.equal(tokenReceiver.address);
  });

  it('correctly safe transfers NFT from owner to smart contract that can receive NFTs with data', async function () {
    const tokenReceiverContract = await ethers.getContractFactory('NFTokenReceiverTestMock');
    const tokenReceiver = await tokenReceiverContract.deploy();
    await tokenReceiver.deployed();

    await ryderMockMint.connect(bob)["mint()"]();
    expect(await ryderNft.connect(bob)['safeTransferFrom(address,address,uint256,bytes)'](bob.address, tokenReceiver.address, id1, '0x01')).to.emit(ryderNft, 'Transfer');
    expect(await ryderNft.balanceOf(bob.address)).to.equal(0);
    expect(await ryderNft.balanceOf(tokenReceiver.address)).to.equal(1);
    expect(await ryderNft.ownerOf(id1)).to.equal(tokenReceiver.address);
  });

  it('throws when trying to burn non existent NFT', async function () {
    await expect(ryderNft.connect(owner).burn(id1)).to.be.revertedWith('003002');
  });

  it('non-admin cannot call any admin function', async function () {
    await expect(ryderNft.connect(bob).setDicksonParameter(100)).to.be.revertedWith(ERR_UNAUTHORIZED);
    await expect(ryderNft.connect(bob).setTokenUri("base", "suffix")).to.be.revertedWith(ERR_UNAUTHORIZED);
    await expect(ryderNft.connect(bob).freezeMetadata()).to.be.revertedWith(ERR_UNAUTHORIZED);
    await expect(ryderNft.connect(bob).setMinter(bob.address, true)).to.be.revertedWith(ERR_UNAUTHORIZED);
    await expect(ryderNft.connect(bob).setAdmin(sara.address, true)).to.be.revertedWith(ERR_UNAUTHORIZED);
    await expect(ryderNft.connect(bob).setMintLimit(100)).to.be.revertedWith(ERR_UNAUTHORIZED);
  });
});
