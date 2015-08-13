var util = require("./util");

// see http://yuilibrary.com/yui/docs/api/classes/App.html

exports['test App navigate'] = function() {
	util.assertCompletion("YUI().use('app', function(Y) { new Y.App().navigate('', {", {
	    "start":{"line":0,"ch":57},
	    "end":{"line":0,"ch":57},
	    "isProperty":true,
	    "isObjectKey":true,
	    "completions":[{"name":"force","type":"bool","origin":"yui3"},
	                   {"name":"replace","type":"bool","origin":"yui3"}
	                  ]
	});
}

exports['test App constructor'] = function() {
  util.assertCompletion("YUI().use('app', function(Y) { new Y.App({", {
      "start":{"line":0,"ch":42},
      "end":{"line":0,"ch":42},
      "isProperty":true,
      "isObjectKey":true,
      "completions":[{"name":"activeView","type":"app.View","origin":"yui3"},
                     {"name":"container","type":"Element|string","origin":"yui3"},
                     {"name":"html5","type":"bool","origin":"yui3"},
                     {"name":"linkSelector","type":"string","origin":"yui3"},
                     {"name":"serverRouting","type":"bool","origin":"yui3"},
                     {"name":"viewContainer","type":"Element|string","origin":"yui3"},
                     {"name":"views","type":"Object","origin":"yui3"}
                    ]
  });
}
if (module == require.main) require("test").run(exports);