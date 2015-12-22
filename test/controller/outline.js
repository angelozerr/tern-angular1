"use strict"

var util = require('../util-model')

exports['test Controller Outline bad'] = function() {
    
    util.assertOutline("angular.module('app').controller();", {
      "outline":[
         {"name":"app","kind":"module","start":15,"end":20,"file":"test1.html"}
       ]
    });

}

exports['test Controller Outline'] = function() {
  
  util.assertOutline("angular.module('app').controller('ctrl', function() {return {}});", {
    "outline":[
       {"name":"app","kind":"module","start":15,"end":20,"file":"test1.html",
         "children":[
           {"name":"ctrl","kind":"controller", "start":33,"end":39,"file":"test1.html"}
          ]
       }
     ]
  });
  
  util.assertOutline("angular.module('app').controller('ctrl', function($scope) {$scope.todos = []});", {
    "outline":[
       {"name":"app","kind":"module","start":15,"end":20,"file":"test1.html",
         "children":[
           {"name":"ctrl","kind":"controller", "start":33,"end":39,"file":"test1.html"}
          ]
       }
     ]
  });
  
}

if (module == require.main) require("test").run(exports);