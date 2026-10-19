const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/accounts', socialController.getConnectedAccounts);
router.post('/:platform/connect', socialController.connectAccount);
router.post('/:platform/disconnect', socialController.disconnectAccount);
router.post('/:platform/publish', socialController.publishVideo);

module.exports = router;
