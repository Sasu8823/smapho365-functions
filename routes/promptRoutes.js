const express = require('express');
const promptController = require('../controllers/promptController.js');

const router = express.Router();

router.get('/', promptController.getPrompts);
router.get('/:id', promptController.getPrompt);
router.post('/', promptController.addPrompt);
router.put('/:id', promptController.editPrompt);
router.delete('/:id', promptController.removePrompt);

module.exports = router;