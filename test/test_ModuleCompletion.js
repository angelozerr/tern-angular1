var util = require("./util");

exports['test YUI Module Completion'] = function() {
  
    // Test completion with modules + submodules
	util.assertCompletion("YUI().use('an'", {
	    "start":{"line":0,"ch":10},
	    "end":{"line":0,"ch":14},
	    "isProperty":false,
	    "isObjectKey":false,
	    "completions":[{"name":"'anim'","type":"module","origin":"yui3","displayName":"anim"},
	                   {"name":"'anim-color'","type":"submodule","origin":"yui3","displayName":"anim-color"},
	                   {"name":"'anim-curve'","type":"submodule","origin":"yui3","displayName":"anim-curve"},
	                   {"name":"'anim-easing'","type":"submodule","origin":"yui3","displayName":"anim-easing"},
	                   {"name":"'anim-node-plugin'","type":"submodule","origin":"yui3","displayName":"anim-node-plugin"},
	                   {"name":"'anim-scroll'","type":"submodule","origin":"yui3","displayName":"anim-scroll"},
	                   {"name":"'anim-shape-transform'","type":"submodule","origin":"yui3","displayName":"anim-shape-transform"},
	                   {"name":"'anim-shape'","type":"submodule","origin":"yui3","displayName":"anim-shape"},
	                   {"name":"'anim-xy'","type":"submodule","origin":"yui3","displayName":"anim-xy"},
	                   {"name":"'anim-base'","type":"submodule","origin":"yui3","displayName":"anim-base"}]
	}, null, 1);
	
	// Test completion with '-' inside module name like async-queue 
    util.assertCompletion("YUI().use('as'", {
      "start":{"line":0,"ch":10},
      "end":{"line":0,"ch":14},
      "isProperty":false,
      "isObjectKey":false,
      "completions":[{"name":"'async-queue'","type":"module","origin":"yui3","displayName":"async-queue"}]
    }, null, 1);	
}

if (module == require.main) require("test").run(exports);