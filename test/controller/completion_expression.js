var util = require("../util-model");

exports['test controller expression completion'] = function() {
  
  var text = "var phonecatControllers = angular.module('phonecatControllers', [])";
  text += "\nphonecatControllers.controller('PhoneListCtrl', ['$scope', 'Phone',";
  text += "\nfunction($scope, Phone) {";
  text += "\n$scope.phones = Phone.query();";
  text += "\n$scope.orderProp = 'age';";
  text += "\n}]);";

  text += "\nphonecatControllers.controller('PhoneDetailCtrl', ['$scope', '$routeParams', 'Phone',";
  text += "\nfunction($scope, $routeParams, Phone) {";
  text += "\n$scope.phone = Phone.get({phoneId: $routeParams.phoneId}, function(phone) {";
  text += "\n$scope.mainImageUrl = phone.images[0];";
  text += "\n});";

  text += "\n$scope.setImage = function(imageUrl) {";
  text += "\n$scope.mainImageUrl = imageUrl;";
  text += "\n}";
  text += "\n}]);";
  
  // No module defined
  util.assertCompletion(text, 
      ["controller"],
      "Phone",
      null,
      {"completions":[],"start":0,"end":5}
  );

  // with module 'phonecatControllers' defined in the scope
  util.assertCompletion(text, 
      ["controller"],
      "Phone",
      {"module": "phonecatControllers"},
      {"completions":[
        {"name":"PhoneListCtrl","type":"fn($scope: $scope, Phone: Resource.prototype)","origin":"test1.js","module":"phonecatControllers","angularType":"controller"},
        {"name":"PhoneDetailCtrl","type":"fn($scope: $scope, $routeParams: {phoneId: ?}, Phone: ?)","origin":"test1.js","module":"phonecatControllers","angularType":"controller"}
       ],
       "start":0,"end":5
      }
  );

}

exports['test controller inside directive expression completion'] = function() {
  
  var text = "angular.module('ui.bootstrap.buttons', [])";
  text += "\n.directive('btnRadio', function () {";
  text += "\nreturn {";
  text += "\ncontroller: function($scope) {}";
  text += "\n};})";
    
  // with module 'phonecatControllers' defined in the scope
  util.assertCompletion(text, 
      ["controller"],
      "btnRadio",
      {"module": "ui.bootstrap.buttons"},
      {"completions":[
        {"name":"btnRadio#controller","type":"fn($scope: $scope)","origin":"test1.js","module":"ui.bootstrap.buttons","angularType":"controller"}
       ],
       "start":0,"end":8
      }
  );
}

if (module == require.main) require("test").run(exports);