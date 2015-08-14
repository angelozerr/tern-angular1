"use strict"

var util = require('../util')

exports['test Module dependencies definition'] = function() {
    util.assertDefinition("angular.module('app1');angular.module('app2', ['app1'", {
      "origin":"test1.html",
      "start":{"line":0,"ch":15},
      "end":{"line":0,"ch":21},
      "file":"test1.html",
      "contextOffset":15,
      "context":"angular.module('app1');angular.module('app2', ['ap"
    }, null, 1);
}

if (module == require.main) require("test").run(exports);