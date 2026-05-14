// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

/// @title KuraPrivacyVault
/// @notice Stores circle metadata (names, descriptions) as encrypted ciphertext.
/// Only invited members can decrypt. Supports private circles invisible to outsiders.
contract KuraPrivacyVault {
    struct VaultEntry {
        /// @dev Encrypted name packed as euint64 chunks (8 bytes each)
        euint64[] encNameChunks;
        /// @dev Encrypted description chunks
        euint64[] encDescChunks;
        bool isPrivate;
        address admin;
    }

    mapping(uint256 => VaultEntry) private vaults;
    /// @dev Track which members have been granted read access
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    event MetadataStored(uint256 indexed circleId, uint256 nameChunks, uint256 descChunks);
    event AccessGranted(uint256 indexed circleId, address indexed member);
    event AccessRevoked(uint256 indexed circleId, address indexed member);
    event CirclePrivacySet(uint256 indexed circleId, bool isPrivate);

    modifier onlyVaultAdmin(uint256 circleId) {
        require(msg.sender == vaults[circleId].admin, "Not vault admin");
        _;
    }

    /// @notice Initialize the vault for a circle. Must be called by the circle admin.
    function initVault(uint256 circleId, bool isPrivate) external {
        require(vaults[circleId].admin == address(0), "Vault already initialized");
        vaults[circleId].admin = msg.sender;
        vaults[circleId].isPrivate = isPrivate;
        hasAccess[circleId][msg.sender] = true;
        emit CirclePrivacySet(circleId, isPrivate);
    }

    /// @notice Store encrypted metadata chunks for a circle.
    /// @param encNameChunks  Array of InEuint64 — each chunk holds 8 bytes of the name
    /// @param encDescChunks  Array of InEuint64 — each chunk holds 8 bytes of the description
    function storeMetadata(
        uint256 circleId,
        InEuint64[] calldata encNameChunks,
        InEuint64[] calldata encDescChunks
    ) external onlyVaultAdmin(circleId) {
        require(encNameChunks.length <= 32, "Name too long");
        require(encDescChunks.length <= 128, "Description too long");

        VaultEntry storage v = vaults[circleId];

        // Clear existing chunks
        delete v.encNameChunks;
        delete v.encDescChunks;

        for (uint256 i = 0; i < encNameChunks.length; i++) {
            euint64 chunk = FHE.asEuint64(encNameChunks[i]);
            FHE.allowThis(chunk);
            v.encNameChunks.push(chunk);
        }

        for (uint256 i = 0; i < encDescChunks.length; i++) {
            euint64 chunk = FHE.asEuint64(encDescChunks[i]);
            FHE.allowThis(chunk);
            v.encDescChunks.push(chunk);
        }

        emit MetadataStored(circleId, encNameChunks.length, encDescChunks.length);
    }

    /// @notice Grant a member read access to all metadata chunks in the vault.
    function allowMemberToRead(uint256 circleId, address member) external onlyVaultAdmin(circleId) {
        VaultEntry storage v = vaults[circleId];
        for (uint256 i = 0; i < v.encNameChunks.length; i++) {
            FHE.allow(v.encNameChunks[i], member);
        }
        for (uint256 i = 0; i < v.encDescChunks.length; i++) {
            FHE.allow(v.encDescChunks[i], member);
        }
        hasAccess[circleId][member] = true;
        emit AccessGranted(circleId, member);
    }

    /// @notice Revoke a member's access flag (does not revoke FHE ACL — use as soft gate).
    function revokeMemberAccess(uint256 circleId, address member) external onlyVaultAdmin(circleId) {
        require(member != vaults[circleId].admin, "Cannot revoke admin");
        hasAccess[circleId][member] = false;
        emit AccessRevoked(circleId, member);
    }

    /// @notice Returns encrypted name handles. Only callable by members with access.
    function getNameHandles(uint256 circleId) external view returns (euint64[] memory) {
        require(hasAccess[circleId][msg.sender], "No access");
        return vaults[circleId].encNameChunks;
    }

    /// @notice Returns encrypted description handles. Only callable by members with access.
    function getDescHandles(uint256 circleId) external view returns (euint64[] memory) {
        require(hasAccess[circleId][msg.sender], "No access");
        return vaults[circleId].encDescChunks;
    }

    /// @notice Check if a circle is private (hides its existence from non-members).
    function isPrivateCircle(uint256 circleId) external view returns (bool) {
        return vaults[circleId].isPrivate;
    }

    /// @notice Toggle private/public mode for a circle.
    function setCirclePrivate(uint256 circleId, bool isPrivate) external onlyVaultAdmin(circleId) {
        vaults[circleId].isPrivate = isPrivate;
        emit CirclePrivacySet(circleId, isPrivate);
    }

    /// @notice Get chunk counts (safe: counts not content).
    function getMetadataCounts(uint256 circleId) external view returns (uint256 nameChunks, uint256 descChunks) {
        VaultEntry storage v = vaults[circleId];
        return (v.encNameChunks.length, v.encDescChunks.length);
    }
}
