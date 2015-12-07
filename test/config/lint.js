var util = require("../util-lint");

exports['test config signature validation'] = function() {
  
  // Number => error
  util.assertLint("angular.module('app1').config(10)", {
    messages : [{"message":"Invalid argument at 1: cannot convert from number to Function.prototype|Array",
                 "from":30,
                 "to":32,
                 "severity":"error",
                 "file":"test1.js"}
               ]
  });
  
  // Array => OK
  util.assertLint("angular.module('app1').config([])", {
    messages : [
               ]
  });
  
  // Function => OK
  util.assertLint("angular.module('app1').config(function() {})", {
    messages : [
               ]
  });
  
}