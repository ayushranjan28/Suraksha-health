const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const emergencyController = require('../controllers/emergencyController');

router.use(authenticateToken);

// Doctors can create emergency requests
router.post('/', requireRole('doctor'), emergencyController.createRequest);

// Both can view requests
router.get('/', emergencyController.getRequests);

// Patients can update request status (approve/reject/revoke)
router.patch('/:id/status', requireRole('patient'), emergencyController.updateRequestStatus);

// Doctors can use emergency override (geo-fenced)
router.post('/override', requireRole('doctor'), emergencyController.overrideRequest);

module.exports = router;
