// Angular config tests
exports['test config validation'] = require('./config/lint');
// Angular constant tests
exports['test constant completion'] = require('./constant/completion');

// Angular module tests
exports['test module completion'] = require('./module/completion');
exports['test module definition'] = require('./module/definition');
exports['test module outline'] = require('./module/outline');

// Angular controller tests
exports['test controller completion (model)'] = require('./controller/completion_expression');
exports['test controller params completion'] = require('./controller/completion_params');
exports['test controller validation'] = require('./controller/lint');

// Angular directive tests
exports['test directive validation'] = require('./directive/lint');
exports['test directive outline'] = require('./directive/outline');
exports['test templateUrl completion'] = require('./templateUrl/completion');
exports['test templateUrl definition'] = require('./templateUrl/definition');

if (require.main === module) require("test").run(exports);