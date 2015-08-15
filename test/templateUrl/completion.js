var util = require("../util");

/*exports['test templateUrl completion with directive'] = function() {
    util.assertCompletion("angular.module('app1')" +
        ".directive('myCustomer', function() {" +
          "return {templateUrl: '" +
          "}" +
        ");", {
        "start":{"line":0,"ch":47},
        "end":{"line":0,"ch":49},
        "isProperty":false,
        "completions":[{"name":"'app1'","type":"Module","origin":"test1.js","displayName":"app1"},
                       {"name":"'app2'","type":"Module","origin":"test1.js","displayName":"app2"}
                      ]
    }, 4, {baseURL: "demos/test/templateUrl/templates"});
}*/

if (module == require.main) require("test").run(exports);