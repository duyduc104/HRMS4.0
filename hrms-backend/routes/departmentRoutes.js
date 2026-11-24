const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', departmentController.getAll);
router.post('/', roleMiddleware('admin', 'hr_manager'), departmentController.create);
router.put('/:id', roleMiddleware('admin', 'hr_manager'), departmentController.update);
router.delete('/:id', roleMiddleware('admin', 'hr_manager'), departmentController.delete);

module.exports = router;
