var yuidoc2tern = require("../generator/yuidoc2tern"), assert = require('assert');

var assertExtractType = function (yuiType, expected) {
  var type = yuidoc2tern.extractYUIType(yuiType);
  assert.deepEqual(type, expected);
}

exports['test extract type'] = function() {
  assertExtractType(null, null);
  assertExtractType('Anim', ['Anim']);
  assertExtractType('Any|Object', ['Any', 'Object']);
  assertExtractType('Any | Object', ['Any', 'Object']);
  assertExtractType('{Any}', ['Any']);
  assertExtractType('{ Number }', ['Number']);
  assertExtractType('{ArrayList|Widget}', ['ArrayList','Widget']); 
  assertExtractType('{string: boolean}', ['string']);
  assertExtractType('{Object} the values are HTML strings', ['Object']);
  assertExtractType('{null}', []);
  assertExtractType('Object*', ['Object']);
  assertExtractType('Number | false', ['Number','false']);
  assertExtractType('Number/false', ['Number','false']);
  assertExtractType('Number[]', ['Number[]']);
  assertExtractType('Number[]|Node', ['Number[]','Node']);
  assertExtractType('string| {searchExp: string, replaceStr: string}', ['string','searchExp']);
  assertExtractType('{searchExp: string, replaceStr: string} | string', ['searchExp']);
}

var assertGetPropertyTernType = function (yuiType, expected) {
  var type = yuidoc2tern.getPropertyTernType(yuiType);
  assert.equal(type, expected);
}

exports['test getPropertyTernType'] = function() {	
  assertGetPropertyTernType('Number', 'number');
  assertGetPropertyTernType('Any', '?');
}

exports['test getTernType - YUIClass'] = function() {
  var yuiDoc = {
    classes: {
      Anim: {
        module: "anim" 
      }	
    }		  
  }
  var yuiClass = {
    module: 'anim',
    name: 'Anim',
    is_constructor: 1
  };
  var type = yuidoc2tern.getTernType(yuiClass, yuiDoc);
  assert.equal(type, 'fn()');
}

exports['test getTernType - YUIClassItem - method'] = function() {  	
  var yuiDoc = {
    classes: {
      Anim: {
        module: "anim" 
      }	
    }		  
  }
  var yuiClassItem = {
    module: 'anim',
    "class": 'Anim',
    name: "getBezier",
    "static": 1,
    params: [{name:"points", type: "Number[]" },
             {name:"t", type: "Number" }],
    "return": {
      type: "Number[]"	
    }
  };
  var type = yuidoc2tern.getTernType(yuiClassItem, yuiDoc);
  assert.equal(type, 'fn(points: [number], t: number) -> [number]');
}

exports['test getTernType - YUIClassItem - method with callback'] = function() {  	
  var yuiDoc = {
    classes: {
      View: {
        module: "app" 
      },
      Object: {
        module: "yui"
      }
    }		  
  }
  var yuiClassItem = {
    module: 'app',
    "class": 'App.Content',
    name: "showContent",
    itemtype: "method",
    chainable: 1,
    params: [{name:"content", type: "HTMLElement|Node|String" },
             {name:"options", type: "Object", optional: true,
              props: [{name: "view", type: "Object|String"},
                      {name: "config", type: "Object", optional: true}
                     ]
              },
              {name:"callback", type: "Function", optional: true,
               props: [{name: "view", type: "View"}               
                      ]
              }
            ],
    "return": {
      type: "Number[]"	
    }
  };
  var ternDef = {"!define": {}};
  var type = yuidoc2tern.getTernType(yuiClassItem, yuiDoc, false, ternDef);
  assert.equal(type, 'fn(content: +HTMLElement|+Node|string, options?: +config.App.ContentShowContentConfig, callback?: fn(view: +app.View)) -> !this');
  assert.equal(JSON.stringify(ternDef, null, " "), JSON.stringify({
   "!define": {
    "config": {
      "App": {
        "ContentShowContentConfig": {
          "view": {
          "!type": "+Object|string"
        },
        "config": {
         "!type": "+Object"
        }
       } 
      }     
    }}
   }, null, " "));
}

exports['test toTernName'] = function() {
  // case found inside AlloyUI 1.5.x
  assertToTernName('@param', 'param');
  assertToTernName('+', 'arg');
  assertToTernName('', 'arg');
  assertToTernName('*callback', 'callback');
}

var assertToTernName = function (name, expected) {
  var ternName = yuidoc2tern.toTernName(name);
  assert.equal(ternName, expected);
}
if (module == require.main) require("test").run(exports);