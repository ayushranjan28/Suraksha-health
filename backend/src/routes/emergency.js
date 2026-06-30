const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const emergencyController = require('../controllers/emergencyController');

router.use(authenticateToken);

// Doctors can declare an emergency to get immediate access and notify delegates
router.post('/declare', requireRole('doctor'), emergencyController.declareEmergency);

module.exports = router;
