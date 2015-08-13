var util = require("./util-lint");

exports['test YUI module validation'] = function() {
  
  // Unknown module 'XXX'
  util.assertLint("YUI().use('XXX', function(Y) {});", {
    messages : [{"message":"Unknown module 'XXX'",
                 "from":10,
                 "to":15,
                 "severity":"error",
                 "file":"test1.js"}
               ]
  });
  
  // known module
  util.assertLint("YUI().use('anim', function(Y) {});", {
          messages : []
  });
  
  // known submodule
  util.assertLint("YUI().use('anim-color', function(Y) {});", {
          messages : []
  });
  
  util.assertLint("YUI().use('node', 10, function(Y) {});", {
    messages : [{"message":"Expected string type for YUI module",
      "from":18,
      "to":20,
      "severity":"error",
      "file":"test1.js"}
    ]
  });
  
}

if (module == require.main) require("test").run(exports);