const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const patientProfileController = require('../controllers/patientProfileController');

router.use(authenticateToken);

// Patient routes
router.get('/', requireRole('patient'), patientProfileController.getProfile);
router.post('/', requireRole('patient'), patientProfileController.updateProfile);

// Doctor routes
router.get('/:patientId', requireRole('doctor'), patientProfileController.getPatientProfileByDoctor);

module.exports = router;
