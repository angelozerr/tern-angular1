var util = require("../util");

//Directive templateUrl

exports['test templateUrl completion with directive'] = function() {
    util.assertCompletion("angular.module('app1')" +
        ".directive('myCustomer', function() {" +
          "return {templateUrl: '" +
          "}" +
        ");", {
        "start":{"line":0,"ch":80},
        "end":{"line":0,"ch":80},
        "isProperty":false,
        "completions":[{"name":"'template1.html'","origin":"test/templateUrl/templates/template1.html","displayName":"template1.html"},
                       {"name":"'template2.html'","origin":"test/templateUrl/templates/template2.html","displayName":"template2.html"}
                      ]
    }, 4, {baseURL: "test/templateUrl/templates"});

    util.assertCompletion("angular.module('app1')" +
        ".directive('myCustomer', function() {" +
          "return {templateUrl: '" +
          "}" +
        ");", {
        "start":{"line":0,"ch":80},
        "end":{"line":0,"ch":80},
        "isProperty":false,
        "completions":[{"name":"'templates/template1.html'","origin":"test/templateUrl/templates/template1.html","displayName":"templates/template1.html"},
                       {"name":"'templates/template2.html'","origin":"test/templateUrl/templates/template2.html","displayName":"templates/template2.html"}
                      ]
    }, 4, {baseURL: "test/templateUrl"});
    
    util.assertCompletion("angular.module('app1')" +
        ".directive('myCustomer', function() {" +
          "return {templateUrl: 'template1'" +
          "}" +
        ");", {
        "start":{"line":0,"ch":80},
        "end":{"line":0,"ch":91},
        "isProperty":false,
        "completions":[{"name":"'template1.html'","origin":"test/templateUrl/templates/template1.html","displayName":"template1.html"}
                      ]
    }, 4, {baseURL: "test/templateUrl/templates"});
    
    util.assertCompletion("angular.module('app1')" +
        ".directive('myCustomer', function() {" +
          "return {templateUrl: 'template1'" +
          "}" +
        ");", {
        "start":{"line":0,"ch":80},
        "end":{"line":0,"ch":91},
        "isProperty":false,
        "completions":[{"name":"'templates/template1.html'","origin":"test/templateUrl/templates/template1.html","displayName":"templates/template1.html"}
                      ]
    }, 4, {baseURL: "test/templateUrl"});      
}

if (module == require.main) require("test").run(exports);