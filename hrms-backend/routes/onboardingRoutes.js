const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const OnboardingController = require('../controllers/onboardingController');

const router = express.Router();

router.post('/', authMiddleware, OnboardingController.submitOnboarding);
router.get('/status', authMiddleware, OnboardingController.getOnboardingStatus);
router.get('/pending', authMiddleware, roleMiddleware('admin', 'hr_manager'), OnboardingController.getAllPending);
router.put('/:id/review', authMiddleware, roleMiddleware('admin', 'hr_manager'), OnboardingController.reviewOnboarding);

module.exports = router;
