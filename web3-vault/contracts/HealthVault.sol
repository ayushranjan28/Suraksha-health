// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HealthVault
 * @dev Manages decentralized identities, record anchoring (IPFS CIDs), and access control.
 */
contract HealthVault is AccessControl, ReentrancyGuard {
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    struct Record {
        string cid;
        string arweaveTxId;
        uint256 timestamp;
        address author;
        bool isActive;
    }

    struct EmergencyRequest {
        address requester;
        string reason;
        uint256 requestTime;
        bool isApproved;
        bool isResolved;
    }

    // Mapping from Patient Address => Record ID => Record
    mapping(address => mapping(bytes32 => Record)) private patientRecords;
    
    // Mapping from Patient Address => list of Record IDs
    mapping(address => bytes32[]) private patientRecordIds;

    // Mapping from Patient Address => Doctor Address => bool (Consent)
    mapping(address => mapping(address => bool)) private consentRegistry;

    // Emergency Access Requests: Patient => Request ID => Request
    mapping(address => mapping(bytes32 => EmergencyRequest)) public emergencyRequests;

    event RecordAdded(address indexed patient, bytes32 indexed recordId, string cid);
    event ConsentGranted(address indexed patient, address indexed doctor);
    event ConsentRevoked(address indexed patient, address indexed doctor);
    event EmergencyRequested(address indexed patient, address indexed doctor, bytes32 indexed requestId);
    event EmergencyResolved(address indexed patient, bytes32 indexed requestId, bool approved);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    modifier onlyAuthorized(address patient) {
        require(
            msg.sender == patient || consentRegistry[patient][msg.sender],
            "HealthVault: Not authorized"
        );
        _;
    }

    /**
     * @dev Add a newly issued medical credential to the vault.
     */
    function addRecord(
        address patient, 
        bytes32 recordId, 
        string calldata cid, 
        string calldata arweaveTxId
    ) external nonReentrant {
        require(
            msg.sender == patient || hasRole(DOCTOR_ROLE, msg.sender),
            "HealthVault: Only patient or doctor can add records"
        );
        require(bytes(patientRecords[patient][recordId].cid).length == 0, "HealthVault: Record ID exists");

        patientRecords[patient][recordId] = Record({
            cid: cid,
            arweaveTxId: arweaveTxId,
            timestamp: block.timestamp,
            author: msg.sender,
            isActive: true
        });

        patientRecordIds[patient].push(recordId);

        emit RecordAdded(patient, recordId, cid);
    }

    /**
     * @dev Grant persistent consent to a doctor or entity.
     */
    function grantConsent(address doctor) external {
        consentRegistry[msg.sender][doctor] = true;
        emit ConsentGranted(msg.sender, doctor);
    }

    /**
     * @dev Revoke persistent consent.
     */
    function revokeConsent(address doctor) external {
        consentRegistry[msg.sender][doctor] = false;
        emit ConsentRevoked(msg.sender, doctor);
    }

    /**
     * @dev Retrieve a record. Caller must be authorized.
     */
    function getRecord(address patient, bytes32 recordId) 
        external 
        view 
        onlyAuthorized(patient) 
        returns (Record memory) 
    {
        require(patientRecords[patient][recordId].isActive, "HealthVault: Record inactive");
        return patientRecords[patient][recordId];
    }

    /**
     * @dev Emergency Break-Glass: Request access.
     */
    function requestEmergencyAccess(address patient, string calldata reason) external returns (bytes32) {
        require(hasRole(DOCTOR_ROLE, msg.sender), "HealthVault: Must be doctor");
        
        bytes32 requestId = keccak256(abi.encodePacked(patient, msg.sender, block.timestamp));
        
        emergencyRequests[patient][requestId] = EmergencyRequest({
            requester: msg.sender,
            reason: reason,
            requestTime: block.timestamp,
            isApproved: false,
            isResolved: false
        });

        emit EmergencyRequested(patient, msg.sender, requestId);
        return requestId;
    }

    /**
     * @dev Emergency Break-Glass: Resolve. 
     * In a production MPC network, Oracles or Patient Next-of-Kin would trigger this.
     */
    function resolveEmergencyAccess(address patient, bytes32 requestId, bool approve) external {
        require(
            msg.sender == patient || hasRole(ADMIN_ROLE, msg.sender), 
            "HealthVault: Unauthorized resolution"
        );
        EmergencyRequest storage req = emergencyRequests[patient][requestId];
        require(!req.isResolved, "HealthVault: Already resolved");

        req.isResolved = true;
        req.isApproved = approve;

        if (approve) {
            // Temporarily grant consent
            consentRegistry[patient][req.requester] = true;
        }

        emit EmergencyResolved(patient, requestId, approve);
    }
}
