"use strict"

var util = require('../util-model')

exports['test Module Outline with none name'] = function() {
    
    util.assertOutline("angular.module();", {
      "outline": []
    });
}

exports['test Module Outline with identifier'] = function() {
  
  util.assertOutline("angular.module(app);", {
    "outline":[
      {"name":"#app","kind":"module"}
    ]
  });
}

exports['test Module Outline with name'] = function() {

  util.assertOutline("angular.module('app1');", {
    "outline":[
      {"name":"app1","kind":"module"}
    ]
  });
}

if (module == require.main) require("test").run(exports);