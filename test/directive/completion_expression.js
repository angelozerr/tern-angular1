var util = require("../util-model");

exports['test directive expression completion (return obj literal)'] = function() {
  
  util.assertCompletion("angular.module('app').directive('dir', function() {return {restrict: 'EA'}})", 
      ["directive"],
      "",
      {"module": "app"},
      {"completions":[
         {"name":"dir","type":"fn() -> {restrict: string}","origin":"test1.js",
          "module":"app","angularType":"directive","restrict":"EA"}
        ],"start":0,"end":0}
  );
}

if (module == require.main) require("test").run(exports);