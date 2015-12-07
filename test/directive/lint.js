var util = require("../util-lint");

// See https://docs.angularjs.org/api/ng/provider/$compileProvider#directive

exports['test directive signature validation'] = function() {
  
  // Number => error
  util.assertLint("angular.module('app1').directive('', 10)", {
    messages : [{"message":"Invalid argument at 2: cannot convert from number to Array|Function.prototype",
                 "from":37,
                 "to":39,
                 "severity":"error",
                 "file":"test1.js"}
               ]
  });
  
  // Array => OK
  util.assertLint("angular.module('app1').directive('', [])", {
    messages : [
               ]
  });
  
  // Function => OK
  util.assertLint("angular.module('app1').directive('', function() {})", {
    messages : [
               ]
  });
  
}