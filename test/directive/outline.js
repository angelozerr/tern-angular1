"use strict"

var util = require('../util-model')

exports['test Directive Outline bad'] = function() {
    
    util.assertOutline("angular.module('app').directive();", {
      "outline":[
         {"name":"app","kind":"module"}
       ]
    });

}

exports['test Directive Outline'] = function() {
  
  util.assertOutline("angular.module('app').directive('dir', function() {return {}});", {
    "outline":[
       {"name":"app","kind":"module", 
         "children":[
           {"name":"dir","kind":"directive"}
          ]
       }
     ]
  });
  
  util.assertOutline("angular.module('app').directive('dir', function() {return {restrict: 'EA'}});", {
    "outline":[
       {"name":"app","kind":"module", 
         "children":[
           {"name":"dir","kind":"directive",
             "children":[
               {"name":"restrict","kind":"property","value":"EA"}
             ]
           }
          ]
       }
     ]
  });
  
}

if (module == require.main) require("test").run(exports);