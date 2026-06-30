const express = require('express');
const router = express.Router();
const delegateController = require('../controllers/delegateController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/', delegateController.addDelegate);
router.delete('/:id', delegateController.removeDelegate);
router.get('/', delegateController.getDelegates);

module.exports = router;
