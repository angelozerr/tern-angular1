exports['test YUI 2 Tern - Type'] = require('./test_yuidoc2tern');
exports['test YUI 2 Tern'] = require('./test_yui2tern');
exports['test YUI Tern completion'] = require('./test_completion');
exports['test YUI Tern Module Completion'] = require('./test_ModuleCompletion');
exports['test YUI Tern Module Lint'] = require('./test_ModuleLint');
exports['test Anim'] = require('./test_Anim');
exports['test App'] = require('./test_App');
exports['test Node'] = require('./test_Node');
exports['test YUI config Completion'] = require('./test_YUIConfig');

if (require.main === module) require("test").run(exports);