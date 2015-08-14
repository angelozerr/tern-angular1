exports['test module completion'] = require('./module/completion');
exports['test module definition'] = require('./module/definition');

if (require.main === module) require("test").run(exports);