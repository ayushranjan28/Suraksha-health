const express = require('express');
const router = express.Router();
const delegateController = require('../controllers/delegateController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/', delegateController.addDelegate);
router.delete('/:id', delegateController.removeDelegate);
router.get('/', delegateController.getDelegates);

module.exports = router;
