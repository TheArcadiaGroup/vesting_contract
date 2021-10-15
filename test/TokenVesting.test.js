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
const cliff = 90; //90 days
const week = 7 * 86400;
const vestingPeriod = 50	//50 weeks
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
		const balanceBefore = (await this.token.balanceOf(deployer)).valueOf().toString()
		assert.equal(balanceBefore, bn(1e18))
		await this.tokenVesting.lock(fundRecipient, lockAmount, cliff, vestingPeriod, { from: deployer })
		const balanceAfter = (await this.token.balanceOf(deployer)).valueOf().toString()
		assert.equal(bn(balanceBefore).minus(bn(balanceAfter)), lockAmount)

		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), 0)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), 0)

		time.increase(cliff * 86400 - 100)

		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), 0)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), 0)

		time.increase(week + 101)

		//should be able to unlock 2% (1 week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount * 2 / 100)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount * 2 / 100)

		time.increase(20 * week)
		//should be able to unlock 42% (21 week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount * 42 / 100)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount * 42 / 100)

		time.increase(29 * week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount)

		time.increase(200 * week)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient)).valueOf().toString(), lockAmount)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount)

		//lock2
		await this.tokenVesting.lock(fundRecipient, lockAmount, cliff, vestingPeriod, { from: deployer })

		time.increase(cliff * 86400 - 100)

		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), 0)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount)

		time.increase(week + 101)

		//should be able to unlock 2% (1 week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount * 2 / 100)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount * 2 / 100 + lockAmount)

		time.increase(20 * week)
		//should be able to unlock 42% (21 week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount * 42 / 100)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount * 42 / 100 + lockAmount)

		time.increase(29 * week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount + lockAmount)

		time.increase(200 * week)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient)).valueOf().toString(), lockAmount)
		assert.equal((await this.tokenVesting.getAllUnlockable(fundRecipient)).valueOf().toString(), lockAmount + lockAmount)
	})

	it("Unlock ", async () => {
		const lockAmount = 1000;

		await this.tokenVesting.lock(fundRecipient2, lockAmount, cliff, vestingPeriod, { from: deployer })
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)

		time.increase(cliff * 86400);
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)
		let balanceBefore = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore, 0)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		let balanceAfter = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter).minus(bn(balanceBefore)), 0)

		time.increase(week);

		balanceBefore = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore, 0)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		balanceAfter = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter).minus(bn(balanceBefore)).toString(), 20)

		time.increase(week);
		const balanceBefore2 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore2, 20)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter2 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter2).minus(bn(balanceBefore2)), 20)
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)
		time.increase(86400);
		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)).valueOf().toString(), 0)

		time.increase(week);
		const balanceBefore3 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore3, 40)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter3 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter3).minus(bn(balanceBefore3)), 20)

		time.increase(week);
		const balanceBefore4 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore4, 60)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter4 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter4).minus(bn(balanceBefore4)), 20)

		time.increase(week);
		const balanceBefore5 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore5, 80)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter5 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter5).minus(bn(balanceBefore5)), 20)

		time.increase(week * 50);
		const balanceBefore6 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(balanceBefore6, 100)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		const balanceAfter6 = (await this.token.balanceOf(fundRecipient2)).valueOf().toString()
		assert.equal(bn(balanceAfter6).minus(bn(balanceBefore6)), 900)

		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		assert.equal((await this.token.balanceOf(fundRecipient2)).valueOf().toString(), 1000)
		await this.tokenVesting.unlock(0, fundRecipient2, { from: fundRecipient2 });
		assert.equal((await this.token.balanceOf(fundRecipient2)).valueOf().toString(), 1000)
	})
	it("revoke", async () => {
		const lockAmount = 1000;
		await this.tokenVesting.lock(fundRecipient2, lockAmount, cliff, vestingPeriod, { from: deployer })
		let balanceBefore = (await this.token.balanceOf(deployer)).valueOf().toString()
		await this.tokenVesting.revoke(0, fundRecipient2, { from: deployer })
		let balanceAfter = (await this.token.balanceOf(deployer)).valueOf().toString()
		assert.equal(bn(balanceAfter).minus(bn(balanceBefore)), 1000)

		assert.equal((await this.tokenVesting.getUnlockable(0, fundRecipient2)), 0)

		await this.tokenVesting.lock(fundRecipient2, lockAmount, cliff, vestingPeriod, { from: deployer })
		time.increase(cliff * 86400 + week)
		await this.tokenVesting.unlock(1, fundRecipient2)
		assert.equal((await this.token.balanceOf(fundRecipient2)).valueOf().toString(), 20)
		await this.tokenVesting.revoke(1, fundRecipient2, { from: deployer })

		assert.equal((await this.tokenVesting.getVestingLength(fundRecipient2)), 2)
		assert.equal((await this.tokenVesting.getUnlockable(1, fundRecipient2)), 0)
	})

});