// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

interface IKuraCircleGov {
    function isMember(uint256 circleId, address member) external view returns (bool);
    function getMemberCount(uint256 circleId) external view returns (uint256);
}

interface IKuraCreditGov {
    function getMemberTier(address member) external view returns (uint8);
}

/// @title KuraGovernance
/// @notice Encrypted circle governance voting. Members vote yes/no on proposals
/// without revealing individual votes. Only the final tally is revealed.
/// FHE ops: FHE.select on InEbool (vote accumulation), FHE.add (tally),
///          FHE.gte (majority check), FHE.publishDecryptResult (final reveal)
contract KuraGovernance {
    enum ProposalStatus { Active, Passed, Failed, Cancelled }

    struct Proposal {
        uint256 circleId;
        string description;      // plaintext description of the change
        uint256 deadline;
        uint256 quorum;          // minimum votes required (plaintext)
        euint64 encYesCount;     // encrypted yes vote count
        euint64 encTotalVotes;   // encrypted total votes cast
        uint256 plainYesCount;   // revealed after close
        uint256 plainTotalVotes; // revealed after close
        ProposalStatus status;
        address proposer;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;
    /// @dev proposalId => voter => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    IKuraCircleGov public kuraCircle;
    IKuraCreditGov public kuraCredit;
    address public admin;

    // Reusable encrypted constants
    euint64 private encZero;
    euint64 private encOne;

    event ProposalCreated(uint256 indexed proposalId, uint256 indexed circleId, address proposer);
    event VoteSubmitted(uint256 indexed proposalId, uint256 indexed circleId);
    event ProposalClosed(uint256 indexed proposalId, ProposalStatus status);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _kuraCircle, address _kuraCredit) {
        admin = msg.sender;
        kuraCircle = IKuraCircleGov(_kuraCircle);
        kuraCredit = IKuraCreditGov(_kuraCredit);
        encZero = FHE.asEuint64(uint64(0));
        FHE.allowThis(encZero);
        encOne = FHE.asEuint64(uint64(1));
        FHE.allowThis(encOne);
    }

    /// @notice Create a governance proposal for a circle.
    /// @param circleId   Target circle
    /// @param description Plain text description (e.g., "increase min contribution to 50 USDC")
    /// @param duration   Voting window in seconds
    /// @param quorum     Minimum number of votes required
    function createProposal(
        uint256 circleId,
        string calldata description,
        uint256 duration,
        uint256 quorum
    ) external returns (uint256 proposalId) {
        require(kuraCircle.isMember(circleId, msg.sender), "Not a member");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");
        require(quorum > 0, "Quorum must be > 0");

        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            circleId: circleId,
            description: description,
            deadline: block.timestamp + duration,
            quorum: quorum,
            encYesCount: encZero,
            encTotalVotes: encZero,
            plainYesCount: 0,
            plainTotalVotes: 0,
            status: ProposalStatus.Active,
            proposer: msg.sender
        });

        emit ProposalCreated(proposalId, circleId, msg.sender);
        return proposalId;
    }

    /// @notice Submit an encrypted yes/no vote on a proposal.
    /// Uses FHE.select on the vote: yes_count += select(vote, 1, 0)
    /// Individual votes are never stored — only the running tally is updated.
    function submitVote(uint256 proposalId, InEbool calldata encVote) external {
        Proposal storage p = proposals[proposalId];
        require(p.status == ProposalStatus.Active, "Proposal not active");
        require(block.timestamp <= p.deadline, "Voting ended");
        require(kuraCircle.isMember(p.circleId, msg.sender), "Not a member");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;

        ebool vote = FHE.asEbool(encVote);
        FHE.allowThis(vote);

        // Accumulate yes count: encYesCount += select(vote, 1, 0)
        euint64 increment = FHE.select(vote, encOne, encZero);
        FHE.allowThis(increment);

        p.encYesCount = FHE.add(p.encYesCount, increment);
        FHE.allowThis(p.encYesCount);

        // Total votes always increments by 1
        p.encTotalVotes = FHE.add(p.encTotalVotes, encOne);
        FHE.allowThis(p.encTotalVotes);

        emit VoteSubmitted(proposalId, p.circleId);
    }

    /// @notice Admin closes voting and reveals the result.
    /// Calls publishDecryptResult on encYesCount to reveal the final tally.
    /// @param yesCount  Decrypted yes count (from CoFHE threshold network)
    /// @param totalVotes Decrypted total votes
    /// @param yesSig    Decryption signature for yesCount
    /// @param totalSig  Decryption signature for totalVotes
    function closeVote(
        uint256 proposalId,
        uint64 yesCount,
        uint64 totalVotes,
        bytes calldata yesSig,
        bytes calldata totalSig
    ) external onlyAdmin {
        Proposal storage p = proposals[proposalId];
        require(p.status == ProposalStatus.Active, "Not active");

        // Verify and publish both counts on-chain
        FHE.publishDecryptResult(p.encYesCount, yesCount, yesSig);
        FHE.publishDecryptResult(p.encTotalVotes, totalVotes, totalSig);

        p.plainYesCount = uint256(yesCount);
        p.plainTotalVotes = uint256(totalVotes);

        // Pass if quorum met and majority yes
        bool quorumMet = p.plainTotalVotes >= p.quorum;
        bool majority = p.plainTotalVotes > 0 && (p.plainYesCount * 2 > p.plainTotalVotes);

        p.status = (quorumMet && majority) ? ProposalStatus.Passed : ProposalStatus.Failed;
        emit ProposalClosed(proposalId, p.status);
    }

    /// @notice Encrypted majority check: is yes_count > threshold?
    /// Uses FHE.gte without revealing exact count — only returns ebool.
    function verifyMajority(uint256 proposalId, uint64 threshold) external returns (ebool) {
        Proposal storage p = proposals[proposalId];
        require(p.status == ProposalStatus.Active, "Use plainYesCount after close");

        euint64 encThreshold = FHE.asEuint64(threshold);
        FHE.allowThis(encThreshold);

        ebool passes = FHE.gte(p.encYesCount, encThreshold);
        FHE.allowThis(passes);
        FHE.allow(passes, msg.sender);
        return passes;
    }

    /// @notice Cancel a proposal (proposer or admin only).
    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(
            msg.sender == p.proposer || msg.sender == admin,
            "Not authorized"
        );
        require(p.status == ProposalStatus.Active, "Not active");
        p.status = ProposalStatus.Cancelled;
        emit ProposalClosed(proposalId, ProposalStatus.Cancelled);
    }

    /// @notice Get plaintext proposal info (not vote counts until revealed).
    function getProposal(uint256 proposalId) external view returns (
        uint256 circleId,
        string memory description,
        uint256 deadline,
        uint256 quorum,
        uint256 plainYesCount,
        uint256 plainTotalVotes,
        ProposalStatus status,
        address proposer
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.circleId,
            p.description,
            p.deadline,
            p.quorum,
            p.plainYesCount,
            p.plainTotalVotes,
            p.status,
            p.proposer
        );
    }

    /// @notice Get encrypted vote count handles (for admin to request decryption).
    function getVoteHandles(uint256 proposalId) external view returns (
        euint64 encYesCount,
        euint64 encTotalVotes
    ) {
        require(msg.sender == admin, "Only admin");
        Proposal storage p = proposals[proposalId];
        return (p.encYesCount, p.encTotalVotes);
    }
}
