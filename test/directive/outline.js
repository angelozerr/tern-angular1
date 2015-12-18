"use strict"

var util = require('../util-model')

exports['test Module Outline with none name'] = function() {
    
    util.assertOutline("angular.module();", {      
    });
}

exports['test Module Outline with identifier'] = function() {
  
  util.assertOutline("angular.module(app);", {
    "children":[
      {"name":"#app","kind":"module"}
    ]
  });
}

exports['test Module Outline with name'] = function() {

  util.assertOutline("angular.module('app1');", {
    "children":[
      {"name":"app1","kind":"module"}
    ]
  });
}

if (module == require.main) require("test").run(exports);