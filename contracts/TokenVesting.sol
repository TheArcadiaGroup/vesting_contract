pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./BlackholePrevention.sol";

contract TokenVesting is Initializable, Ownable, BlackholePrevention {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct VestingInfo {
        uint256 unlockedFrom;
        uint256 vestingPeriod; //how many weeks
        uint256 releasedAmount;
        uint256 totalAmount;
    }
    IERC20 public token;
    mapping(address => VestingInfo[]) public vestings;

    event Lock(address user, uint256 amount, uint256 id);
    event Unlock(address user, uint256 amount);
    event Revoke(address user, uint256 revokedAmount);

    function initialize(address _token) external initializer {
        token = IERC20(_token);
    }

    function unlock(uint256 _id, address _addr) public {
        uint256 unlockable = getUnlockable(_id, _addr);
        if (unlockable > 0) {
            VestingInfo[] storage vestingArr = vestings[_addr];
            vestingArr[_id].releasedAmount = vestingArr[_id].releasedAmount.add(
                unlockable
            );
            token.safeTransfer(_addr, unlockable);
            emit Unlock(_addr, unlockable);
        }
    }

    function unlockAll(address _addr) public {
        uint256 vestingLength = vestings[_addr].length;
        for (uint256 i = 0; i < vestingLength; i++) {
            unlock(i, _addr);
        }
    }

    function lock(
        address _addr,
        uint256 _amount,
        uint256 _cliff, //how many days
        uint256 _vestingPeriod //how many weeks
    ) external onlyOwner {
        VestingInfo[] storage vestingArr = vestings[_addr];

        require(_addr != address(0), "TokenVesting: addr should not be null");

        uint256 id = vestingArr.length;
        if (_amount > 0) {
            token.safeTransferFrom(msg.sender, address(this), _amount);
            vestingArr.push(
                VestingInfo(
                    block.timestamp.add(_cliff * 86400),
                    _vestingPeriod,
                    0,
                    _amount
                )
            );
            emit Lock(_addr, _amount, id);
        }
    }

    function revoke(uint256 _id, address _addr) public onlyOwner {
        if (getUnlockable(_id, _addr) > 0) {
            unlock(_id, _addr);
        }
        VestingInfo[] storage vestingArr = vestings[_addr];
        uint256 refundAmount = vestingArr[_id].totalAmount.sub(
            vestingArr[_id].releasedAmount
        );
        if (refundAmount > 0) {
            token.safeTransfer(msg.sender, refundAmount);
            vestingArr[_id].releasedAmount = vestingArr[_id].totalAmount;
            emit Revoke(_addr, refundAmount);
        }
    }

    function revokeAll(address _addr) external onlyOwner {
        uint256 vestingLength = vestings[_addr].length;
        for (uint256 i = 0; i < vestingLength; i++) {
            revoke(i, _addr);
        }
    }
    function getUnlockable(uint256 _id, address _addr)
        public
        view
        returns (uint256)
    {
        VestingInfo[] storage vestingArr = vestings[_addr];

        if (vestingArr[_id].totalAmount == 0) {
            return 0;
        }

        if (vestingArr[_id].unlockedFrom > block.timestamp) return 0;
        uint256 gap = block.timestamp.sub(vestingArr[_id].unlockedFrom);
        uint256 _weeks = gap.div(7 * 86400);
        uint256 releasable = vestingArr[_id].totalAmount.mul(_weeks).div(
            vestingArr[_id].vestingPeriod
        );
        if (releasable > vestingArr[_id].totalAmount) {
            releasable = vestingArr[_id].totalAmount;
        }

        return releasable >= vestingArr[_id].releasedAmount ? releasable.sub(vestingArr[_id].releasedAmount): 0;
    }

    function getAllUnlockable(address _addr) external view returns (uint256 ret) {
        uint256 vestingLength = vestings[_addr].length;
        for (uint256 i = 0; i < vestingLength; i++) {
            ret = ret.add(getUnlockable(i, _addr));
        }
    }

    function getLockedInfo(uint256 _id, address _addr)
        external
        view
        returns (uint256 _locked, uint256 _releasable)
    {
        VestingInfo[] storage vestingArr = vestings[_addr];
        _releasable = getUnlockable(_id, _addr);
        _locked = vestingArr[_id].totalAmount.sub(
            vestingArr[_id].releasedAmount
        );
    }

    function getVestingInfo(address _addr)
        external
        view
        returns (
            uint256[] memory ids,
            uint256[] memory unlockFrom,
            uint256[] memory releasedAmount,
            uint256[] memory totalAmount,
            uint256[] memory vestingPeriod
        )
    {
        ids = new uint256[](vestings[_addr].length);
        unlockFrom = new uint256[](vestings[_addr].length);
        releasedAmount = new uint256[](vestings[_addr].length);
        totalAmount = new uint256[](vestings[_addr].length);
        vestingPeriod = new uint256[](vestings[_addr].length);

        for (uint256 i = 0; i < vestings[_addr].length; i++) {
            ids[i] = i;
            unlockFrom[i] = vestings[_addr][i].unlockedFrom;
            releasedAmount[i] = vestings[_addr][i].releasedAmount;
            totalAmount[i] = vestings[_addr][i].totalAmount;
            vestingPeriod[i] = vestings[_addr][i].vestingPeriod;
        }
    }

    function getVestingLength(address _addr) external view returns (uint256) {
        return vestings[_addr].length;
    }

    //functions to rescue tokens
    function withdrawEther(address payable receiver, uint256 amount)
        external
        virtual
        onlyOwner
    {
        _withdrawEther(receiver, amount);
    }

    function withdrawERC20(
        address payable receiver,
        address tokenAddress,
        uint256 amount
    ) external virtual onlyOwner {
        _withdrawERC20(receiver, tokenAddress, amount);
    }

    function withdrawERC721(
        address payable receiver,
        address tokenAddress,
        uint256 tokenId
    ) external virtual onlyOwner {
        _withdrawERC721(receiver, tokenAddress, tokenId);
    }
}
