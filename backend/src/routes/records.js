const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const recordController = require('../controllers/recordController');

router.use(authenticateToken);

// Doctors can create records
router.post('/', requireRole('doctor'), recordController.createRecord);

// Patients and doctors can view records
router.get('/', recordController.getRecords);

// Patients and doctors can view a specific record
router.get('/:id', recordController.getRecordById);

module.exports = router;
