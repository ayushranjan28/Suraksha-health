const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', auditLogController.getPatientAccessLogs);

module.exports = router;
