(async () => {
  const promptController = require('./controllers/promptController.js');
  const result = await promptController.getAllPrompts();
  console.log(result);
})();