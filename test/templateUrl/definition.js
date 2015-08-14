"use strict"

var util = require('../util')

// Directive templateUrl

exports['test templateUrl definition with directive'] = function() {
    util.assertDefinition("angular.module('app1')" +
    		".directive('myCustomer', function() {" +
    		    "return {templateUrl: 'templates/template1.html'};" +
    		  "}" +
    		");", {
      "origin":"templates/template1.html"
    }, 7);
}

exports['test templateUrl definition with directive [baseUrl option]'] = function() {
  util.assertDefinition("angular.module('app1')" +
          ".directive('myCustomer', function() {" +
              "return {templateUrl: 'template1.html'};" +
            "}" +
          ");", {
    "origin":"templates/template1.html"
  }, 7, {baseURL: "templates"});
}

// $routeProvider templateUrl

exports['test templateUrl definition with $routeProvider'] = function() {
  util.assertDefinition("angular.module('app1')" +
          ".config(function($routeProvider){" +
              "$routeProvider.when('/'," +
              "{" +
              " templateUrl: 'templates/template1.html'" +
              "})" +
          "});", {
    "origin":"templates/template1.html"
  }, 7);
}

exports['test templateUrl definition with $routeProvider [baseUrl option]'] = function() {
  util.assertDefinition("angular.module('app1')" +
          ".config(function($routeProvider){" +
              "$routeProvider.when('/'," +
              "{" +
              " templateUrl: 'template1.html'" +
              "})" +
          "});", {
    "origin":"templates/template1.html"
  }, 7, {baseURL: "templates"});
}

if (module == require.main) require("test").run(exports);