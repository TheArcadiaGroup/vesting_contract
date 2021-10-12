const BN = require('bignumber.js');
BN.config({ DECIMAL_PLACES: 0 })
BN.config({ ROUNDING_MODE: BN.ROUND_DOWN })
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Token = artifacts.require('ABC');
const TokenVesting = artifacts.require('TokenVesting');
const truffleAssert = require('truffle-assertions');


const e18 = new BN('1000000000000000000');

const { assertion } = require('@openzeppelin/test-helpers/src/expectRevert');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
function toWei(n) {
	return new BN(n).multipliedBy(e18).toFixed();
}

function bn(x) {
	return new BN(x);
}
const cliff = 90 * 1 * 86400; //90 days
const week = 7 * 86400;
contract('TokenVesting Test', (accounts) => {
	let deployer = accounts[0];
	let fundRecipient = accounts[1];
	let fundRecipient2 = accounts[2];
	let users = accounts.slice(3);

	beforeEach(async () => {
		this.token = await Token.new(bn(1e18), { from: deployer })
		this.tokenVesting = await TokenVesting.new({from : deployer});

		await this.tokenVesting.initialize(this.token.address, { from: deployer });
		await this.token.approve(this.tokenVesting.address, bn(1e18), { from: deployer })

	});
	it("Lock ", async () => {
		const lockAmount = 500000000
		const percent = 5
		const balanceBefore = (await this.token.balanceOf(deployer)).valueOf().toString()
		assert.equal(balanceBefore, bn(1e18))
		await this.tokenVesting.lock(fundRecipient, lockAmount, percent,cliff, { from: deployer })
		const balanceAfter = (await this.token.balanceOf(deployer)).valueOf().toString()
		assert.equal(bn(balanceBefore).minus(bn(balanceAfter)), lockAmount)

		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), 0)
		time.increase(cliff - 100)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), 0)
		time.increase(week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount * percent / 100)

		time.increase(20 * week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount)
		time.increase(200 * week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount)

		//lock2
		await this.tokenVesting.lock(fundRecipient, lockAmount, percent,cliff, { from: deployer })
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), 0)
		time.increase(cliff - 100)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), 0)
		time.increase(week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount * percent / 100)
		time.increase(20 * week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount)
		time.increase(200 * week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount)

		for(var i =0 ; i<users.length; i++){
			const balanceBefore = (await this.token.balanceOf(deployer)).valueOf().toString()
			await this.tokenVesting.lock(users[i], lockAmount, percent,cliff, { from: deployer })
			const balanceAfter = (await this.token.balanceOf(deployer)).valueOf().toString()
			assert.equal(bn(balanceBefore).minus(bn(balanceAfter)), lockAmount)
		}

	})

	it("Unlock ", async () => {
		const lockAmount = 1000;
		const percent = 20;


		await this.tokenVesting.lock(fundRecipient2, lockAmount, percent,cliff, { from: deployer })
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)

		time.increase(cliff);
		const balanceBefore = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore, 0)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter).minus(bn(balanceBefore)), 200)

		time.increase(week);
		const balanceBefore2 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore2, 200)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter2 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter2).minus(bn(balanceBefore2)), 200)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)
		time.increase(86400);
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)

		time.increase(week);
		const balanceBefore3 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore3, 400)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter3 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter3).minus(bn(balanceBefore3)), 200)

		time.increase(week);
		const balanceBefore4 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore4, 600)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter4 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter4).minus(bn(balanceBefore4)), 200)

		time.increase(week);
		const balanceBefore5 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore5, 800)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter5 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter5).minus(bn(balanceBefore5)), 200)

		await expectRevert( this.tokenVesting.unlock(0,fundRecipient2) ,"TokenVesting: no tokens are due")


		for(var i = 0; i <users.length;i++) {
			await this.tokenVesting.lock(users[i], lockAmount, percent,cliff, { from: deployer })
			const balanceBefore = (await this.token.balanceOf(users[i])).valueOf().toString()
			time.increase(cliff+100)
			await this.tokenVesting.unlock(0, users[i], { from: fundRecipient2 });
			const balanceAfter = (await this.token.balanceOf(users[i])).valueOf().toString()
			assert.equal(bn(balanceAfter).minus(bn(balanceBefore)), 200)

		}
	})
	it("blacklist", async () => {
		const lockAmount = 1000;
		const percent = 20;
		await this.tokenVesting.lock(fundRecipient2, lockAmount, percent,cliff, { from: deployer })
		const balanceBefore = (await this.token.balanceOf(deployer)).valueOf().toString()
		await this.tokenVesting.blackList(0, fundRecipient2, { from: deployer })
		const balanceAfter = (await this.token.balanceOf(deployer)).valueOf().toString()
		assert.equal(bn(balanceAfter).minus(bn(balanceBefore)), 1000)

		await this.tokenVesting.lock(fundRecipient2, lockAmount, percent,cliff, { from: deployer })
		time.increase(cliff)
		await this.tokenVesting.unlock(1, fundRecipient2)
		assert.equal((await this.token.balanceOf(fundRecipient2)).valueOf().toString(), 200)
		await this.tokenVesting.blackList(1, fundRecipient2, { from: deployer })
	
		await expectRevert.unspecified(this.tokenVesting.getUnlockable(1, fundRecipient2))
	})

});