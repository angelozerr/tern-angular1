exports['test module completion'] = require('./module/completion');
exports['test module definition'] = require('./module/definition');
exports['test templateUrl completion'] = require('./templateUrl/completion');
exports['test templateUrl definition'] = require('./templateUrl/definition');

if (require.main === module) require("test").run(exports);