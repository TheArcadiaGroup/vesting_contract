pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract TokenVesting is Initializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct VestingInfo {
        uint256 id ; 
        uint256 unlockedFrom;
       // uint256 unlockedTo;
        uint256 releasedAmount;
        uint256 totalAmount;
        uint256 vetsingPercent;
    }
    uint256 public cliff = 90 days;
    IERC20 public token;
    //mapping(address => VestingInfo) public vestings;
    mapping(address => VestingInfo[]) public vestings;
    mapping(address => bool) public lockers;
   
    event Lock(address user, uint256 amount);
    event Unlock(address user, uint256 amount);
    event SetLocker(address locker, bool val);

    function initialize(address _token, uint256 _cliff)
        external
         initializer
    {
        token = IERC20(_token);
        cliff = _cliff > 0 ? _cliff : cliff;
    }

    function setLockers(address[] memory _lockers, bool val)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < _lockers.length; i++) {
            lockers[_lockers[i]] = val;
            emit SetLocker(_lockers[i], val);
        }
    }
         function setCliff(uint256 _cliff)
        external
        {
              require(lockers[msg.sender], "only locker can set cliff");
                cliff = _cliff;
        }
    function unlock(uint256 _id , address _addr) public {
        uint256 unlockable = getUnlockable(_id,_addr);
          require(unlockable > 0, "TokenVesting: no tokens are due");
            VestingInfo[] storage vestingArr =  vestings[_addr] ;
            vestingArr[_id].releasedAmount = vestingArr[_id].releasedAmount.add(unlockable);
            token.safeTransfer(_addr, unlockable);
            emit Unlock(_addr, unlockable);
       
    }

    function lock(address _addr, uint256 _amount, uint256 _vetsingPercent) external {
         VestingInfo[] storage vestingArr =  vestings[_addr] ;

      //  VestingInfo storage vesting = vestings[_id][_addr];
        require(lockers[msg.sender], "only locker can lock");
        require(_addr != address(0), "TokenVesting: addr is the zero address");
        require(_vetsingPercent<=100,"<100%");

            uint256 id=  vestingArr.length ;
        if (_amount > 0) {
            token.safeTransferFrom(msg.sender, address(this), _amount);
            vestingArr.push(VestingInfo(id ,block.timestamp.add(cliff),0,_amount,_vetsingPercent));
            emit Lock(_addr, _amount);
        }
    }
    function blackList(uint256 _id, address _addr) external {
           require(lockers[msg.sender], "only locker can add blackList");
           
           if(getUnlockable(_id,_addr)>0){
                unlock(_id,_addr);
           }
             VestingInfo[] storage vestingArr =  vestings[_addr] ;
           uint256 refundAmount = vestingArr[_id].totalAmount.sub(vestingArr[_id].releasedAmount);
           if(refundAmount>0) {
            token.safeTransfer(msg.sender, refundAmount);
           vestingArr[_id].releasedAmount = vestingArr[_id].totalAmount;
           }
          
    }
    function getUnlockable(uint256 _id,address _addr) public view returns (uint256) {
        VestingInfo[] storage vestingArr =  vestings[_addr] ;

        if (vestingArr[_id].totalAmount == 0) {
            return 0;
        }

        if (vestingArr[_id].unlockedFrom > block.timestamp) return 0;
        uint256 gap  = block.timestamp.sub(vestingArr[_id].unlockedFrom);
        uint256 _weeks = gap.div(7 * 86400) +  1;
        uint256 releasable = vestingArr[_id].totalAmount.mul(_weeks.mul(vestingArr[_id].vetsingPercent)).div(100);
       // uint256 releasable = timeElapsed.mul(vesting.totalAmount).div(period);
        if (releasable > vestingArr[_id].totalAmount) {
            releasable = vestingArr[_id].totalAmount;
        }
        return releasable.sub(vestingArr[_id].releasedAmount);
    }
    function getLockedInfo(uint256 _id , address _addr) external view returns (uint256 _locked, uint256 _releasable) {
         VestingInfo[] storage vestingArr =  vestings[_addr] ;
        _releasable = getUnlockable(_id,_addr);
        _locked =  vestingArr[_id].totalAmount.sub( vestingArr[_id].releasedAmount);
           
    }
    function getVestingInfo(address _addr)  external view returns (uint256[] memory ids, uint256[] memory unlockFrom, uint256[] memory releasedAmount,uint256[] memory totalAmount ,uint256[] memory vetsingPercent) {
        ids = new uint256[](vestings[_addr].length);
        unlockFrom = new uint256[](vestings[_addr].length);
        releasedAmount = new uint256[](vestings[_addr].length);
        totalAmount = new uint256[](vestings[_addr].length);
        vetsingPercent = new uint256[](vestings[_addr].length);

        for(uint256 i = 0; i < vestings[_addr].length; i++) {
            ids[i] = vestings[_addr][i].id;
            unlockFrom[i] = vestings[_addr][i].unlockedFrom;
            releasedAmount[i] = vestings[_addr][i].releasedAmount;
            totalAmount[i] = vestings[_addr][i].totalAmount;
            vetsingPercent[i] = vestings[_addr][i].vetsingPercent;
        }
    }
    function getCliff () external view returns (uint256){
        return cliff;
    }
     
}