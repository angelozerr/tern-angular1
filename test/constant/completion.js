var util = require("../util");

// See http://twofuckingdevelopers.com/2014/06/angularjs-best-practices-001-constants/

exports['test constant completion'] = function() {
    util.assertCompletion("angular.module('app1').constant('myConfig', {a:1, b:''}).controller('ctrl', function(myConfig) {myConfig.", {
        "start":{"line":0,"ch":105},
        "end":{"line":0,"ch":105},
        "isProperty":true,
        "isObjectKey":false,
        "completions":[{"name":"a","type":"number","origin":"test1.js"},
                       {"name":"b","type":"string","origin":"test1.js"},
                      ]
    });
    
    util.assertCompletion("angular.module('app1').constant('myConfig', {a:1, b:''}).controller('ctrl', ['myConfig', function(f) {f.", {
      "start":{"line":0,"ch":104},
      "end":{"line":0,"ch":104},
      "isProperty":true,
      "isObjectKey":false,
      "completions":[{"name":"a","type":"number","origin":"test1.js"},
                     {"name":"b","type":"string","origin":"test1.js"},
                    ]
  });    
}

if (module == require.main) require("test").run(exports);