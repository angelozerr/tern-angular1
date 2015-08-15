var util = require("../util-lint");

// See https://docs.angularjs.org/api/ng/provider/$controllerProvider#register

exports['test controller signature validation'] = function() {
  
  // Number => error
  util.assertLint("angular.module('app1').controller('', 10)", {
    messages : [{"message":"Invalid argument at 2: cannot convert from Number.prototype to Function.prototype|Array.prototype",
                 "from":38,
                 "to":40,
                 "severity":"error",
                 "file":"test1.js"}
               ]
  });
  
  // Array => OK
  util.assertLint("angular.module('app1').controller('', [])", {
    messages : [
               ]
  });
  
  // Function => OK
  util.assertLint("angular.module('app1').controller('', function() {})", {
    messages : [
               ]
  });
  
}