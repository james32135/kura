// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract KuraRoundOrder {
    uint8 private constant EUINT8_TYPE = 2;
    uint8 public constant MAX_MEMBERS = 200;
    mapping(uint256 => mapping(address => euint8)) private _positions;
    mapping(uint256 => mapping(address => bool)) private _assigned;
    mapping(uint256 => address[]) private _members;
    mapping(uint256 => bool) public orderAssigned;
    address public immutable kuraCircle;
    event OrderAssigned(uint256 indexed circleId, uint256 memberCount);
    modifier onlyKuraCircle() {
        require(msg.sender == kuraCircle, "Not KuraCircle");
        _;
    }
    constructor(address _kuraCircle) {
        kuraCircle = _kuraCircle;
    }
    function registerMember(uint256 circleId, address member) external onlyKuraCircle {
        require(!orderAssigned[circleId], "Order already assigned");
        require(!_assigned[circleId][member], "Already registered");
        require(_members[circleId].length < MAX_MEMBERS, "Circle too large");
        _members[circleId].push(member);
    }
    function assignOrder(uint256 circleId) external onlyKuraCircle {
        require(!orderAssigned[circleId], "Already assigned");
        address[] storage members = _members[circleId];
        uint256 count = members.length;
        require(count > 0, "No members");
        require(count <= MAX_MEMBERS, "Too many members");
        euint8 base = FHE.randomEuint8();
        FHE.allowThis(base);
        for (uint256 i = 0; i < count; i++) {
            address member = members[i];
            euint8 offset = FHE.asEuint8(uint8(i));
            FHE.allowThis(offset);
            euint8 pos = FHE.add(base, offset);
            FHE.allowThis(pos);
            _positions[circleId][member] = pos;
            _assigned[circleId][member] = true;
            FHE.allow(pos, member);
            FHE.allow(pos, kuraCircle);
        }
        orderAssigned[circleId] = true;
        emit OrderAssigned(circleId, count);
    }
    function getPositionHandle(uint256 circleId, address member) external view returns (euint8) {
        require(_assigned[circleId][member], "No position assigned");
        return _positions[circleId][member];
    }
    function getMyPositionHandle(uint256 circleId) external view returns (euint8) {
        require(_assigned[circleId][msg.sender], "No position assigned");
        return _positions[circleId][msg.sender];
    }
    function getMembers(uint256 circleId) external view returns (address[] memory) {
        return _members[circleId];
    }
    function getMemberCount(uint256 circleId) external view returns (uint256) {
        return _members[circleId].length;
    }
}