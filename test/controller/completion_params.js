var util = require("../util");

exports['test controller params completion'] = function() {
    
  util.assertCompletion("angular.module('app1').controller('ctrl1', function($rou", {
    "start":{"line":0,"ch":52},
    "end":{"line":0,"ch":56},
    "isProperty":false,
    "completions":[{"name":"$route","type":"service.$route","origin":"angular"},
                   {"name":"$routeProvider","type":"provider.$routeProvider","origin":"angular"}
                  ]
  });
  
  util.assertCompletion("angular.module('app1').controller('ctrl1', ['$rou'", {
        "start":{"line":0,"ch":44},
        "end":{"line":0,"ch":50},
        "isProperty":false,
        "completions":[{"name":"'$route'","type":"service.$route","origin":"angular","displayName":"$route"},
                       {"name":"'$routeProvider'","type":"provider.$routeProvider","origin":"angular","displayName":"$routeProvider"}
                      ]
    }, 1);
}

if (module == require.main) require("test").run(exports);