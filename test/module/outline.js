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
      {"name":"#app","kind":"module","start":15,"end":18,"file":"test1.html"}
    ]
  });
}

exports['test Module Outline with name'] = function() {

  util.assertOutline("angular.module('app1');", {
    "outline":[
      {"name":"app1","kind":"module","start":15,"end":21,"file":"test1.html"}
    ]
  });
}

if (module == require.main) require("test").run(exports);