var util = require("../util");

exports['test Module dependencies completion'] = function() {
    util.assertCompletion("angular.module('app1');angular.module('app2', [''", {
        "start":{"line":0,"ch":47},
        "end":{"line":0,"ch":49},
        "isProperty":false,
        "completions":[{"name":"'app1'","type":"Module","origin":"test1.js","displayName":"app1"},
                       {"name":"'app2'","type":"Module","origin":"test1.js","displayName":"app2"}
                      ]
    }, 1);
}

if (module == require.main) require("test").run(exports);