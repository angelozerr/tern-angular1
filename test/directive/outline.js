"use strict"

var util = require('../util-model')

exports['test Directive Outline bad'] = function() {
    
    util.assertOutline("angular.module('app').directive();", {
      "outline":[
         {"name":"app","kind":"module","start":15,"end":20,"file":"test1.html"}
       ]
    });

}

exports['test Directive Outline'] = function() {
  
  util.assertOutline("angular.module('app').directive('dir', function() {return {}});", {
    "outline":[
       {"name":"app","kind":"module","start":15,"end":20,"file":"test1.html",
         "children":[
           {"name":"dir","kind":"directive", "start":32,"end":37,"file":"test1.html"}
          ]
       }
     ]
  });
  
  util.assertOutline("angular.module('app').directive('dir', function() {return {restrict: 'EA'}});", {
    "outline":[
       {"name":"app","kind":"module","start":15,"end":20,"file":"test1.html",
         "children":[
           {"name":"dir","kind":"directive","start":32,"end":37,"file":"test1.html",
             "children":[
               {"name":"restrict","kind":"property","start":59,"end":67,"file":"test1.html","value":"EA"}
             ]
           }
          ]
       }
     ]
  });
  
}

if (module == require.main) require("test").run(exports);