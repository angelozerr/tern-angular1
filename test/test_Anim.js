var util = require("./util");

// see http://yuilibrary.com/yui/docs/api/classes/Anim.html

exports['test Anim Methods+Properties static'] = function() {
	util.assertCompletion("YUI().use('', function(Y) { Y.Anim.", {
	    "start":{"line":0,"ch":35},
	    "end":{"line":0,"ch":35},
	    "isProperty":true,
	    "isObjectKey":false,
	    "completions":[{"name":"apply","type":"fn(this: ?, args: [?])","origin":"ecma5"},
	                   {"name":"behaviors","type":"?","origin":"yui3"},
	                   {"name":"bind","type":"fn(this: ?, args?: ?)","origin":"ecma5"},
	                   {"name":"call","type":"fn(this: ?, args?: ?)","origin":"ecma5"},
	                   {"name":"getBezier","type":"fn(points: [number], t: number) -> [number]","origin":"yui3"},
	                   {"name":"intervalTime","type":"?","origin":"yui3"},
	                   {"name":"pause","type":"fn()","origin":"yui3"},
	                   {"name":"prototype","type":"anim.Anim.prototype","origin":"yui3"},
	                   {"name":"run","type":"fn()","origin":"yui3"},{"name":"stop","type":"fn()","origin":"yui3"},
	                   {"name":"DEFAULT_GETTER","type":"?","origin":"yui3"},
	                   {"name":"DEFAULT_SETTER","type":"?","origin":"yui3"},
	                   {"name":"DEFAULT_UNIT","type":"?","origin":"yui3"},
	                   {"name":"RE_DEFAULT_UNIT","type":"?","origin":"yui3"}
	                  ]
	});
}

exports['test Anim Methods+Properties (not static) without var'] = function() {
  util.assertCompletion("YUI().use('', function(Y) { new Y.Anim().", {
      "start":{"line":0,"ch":41},
      "end":{"line":0,"ch":41},
      "isProperty":true,
      "isObjectKey":false,
      "completions":[ {"name":"addAttr","type":"fn(name: string, config: ?, lazy: bool)","origin":"yui3"},
                      {"name":"addAttrs","type":"fn(cfgs: Object, values: Object, lazy: bool)","origin":"yui3"},
                      {"name":"addTarget","type":"fn(o: event_custom.EventTarget)","origin":"yui3"},
                      {"name":"after","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                      {"name":"attrAdded","type":"fn(name: string) -> bool","origin":"yui3"},
                      {"name":"before","type":"fn()","origin":"yui3"},
                      {"name":"bubble","type":"fn(evt: event_custom.CustomEvent) -> bool","origin":"yui3"},
                      {"name":"destroy","type":"fn()","origin":"yui3"},
                      {"name":"detach","type":"fn(type: string|Object, fn: fn(), context: Object) -> event_custom.EventTarget","origin":"yui3"},
                      {"name":"detachAll","type":"fn(type: string)","origin":"yui3"},
                      {"name":"fire","type":"fn(type: string|Object, arguments: Object) -> bool","origin":"yui3"},
                      {"name":"get","type":"fn(name: string)","origin":"yui3"},
                      {"name":"getAttrs","type":"fn(attrs: [string]|bool) -> Object","origin":"yui3"},
                      {"name":"getEvent","type":"fn(type: string, prefixed: string) -> event_custom.CustomEvent","origin":"yui3"},
                      {"name":"getTargets","type":"fn()","origin":"yui3"},
                      {"name":"init","type":"fn(config: ?)","origin":"yui3"},
                      {"name":"modifyAttr","type":"fn(name: string, config: ?)","origin":"yui3"},
                      {"name":"name","type":"string","origin":"yui3"},
                      {"name":"on","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                      {"name":"once","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                      {"name":"onceAfter","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                      {"name":"parseType","type":"fn(type: string, pre?: string) -> [?]","origin":"yui3"},
                      {"name":"pause","type":"fn()","origin":"yui3"},
                      {"name":"publish","type":"fn(type: string, opts: {}) -> event_custom.CustomEvent","origin":"yui3"},
                      {"name":"removeAttr","type":"fn(name: string)","origin":"yui3"},
                      {"name":"removeTarget","type":"fn(o: event_custom.EventTarget)","origin":"yui3"},
                      {"name":"reset","type":"fn(name: string)","origin":"yui3"},
                      {"name":"run","type":"fn()","origin":"yui3"},
                      {"name":"set","type":"fn(name: string, value: ?, opts: Object)","origin":"yui3"},
                      {"name":"setAttrs","type":"fn(attrs: Object, opts: Object)","origin":"yui3"},
                      {"name":"stop","type":"fn(finish: bool)","origin":"yui3"},
                      {"name":"subscribe","type":"fn()","origin":"yui3"},
                      {"name":"toString","type":"fn() -> string","origin":"yui3"},
                      {"name":"unsubscribe","type":"fn()","origin":"yui3"},
                      {"name":"unsubscribeAll","type":"fn(type: string)","origin":"yui3"}
                    ]
  });
}

exports['test Anim Methods+Properties (not static)'] = function() {
  util.assertCompletion("YUI().use('', function(Y) { var anim = new Y.Anim(); anim.", {
      "start":{"line":0,"ch":58},
      "end":{"line":0,"ch":58},
      "isProperty":true,
      "isObjectKey":false,
      "completions":[{"name":"addAttr","type":"fn(name: string, config: ?, lazy: bool)","origin":"yui3"},
                     {"name":"addAttrs","type":"fn(cfgs: Object, values: Object, lazy: bool)","origin":"yui3"},
                     {"name":"addTarget","type":"fn(o: event_custom.EventTarget)","origin":"yui3"},
                     {"name":"after","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                     {"name":"attrAdded","type":"fn(name: string) -> bool","origin":"yui3"},
                     {"name":"before","type":"fn()","origin":"yui3"},
                     {"name":"bubble","type":"fn(evt: event_custom.CustomEvent) -> bool","origin":"yui3"},
                     {"name":"destroy","type":"fn()","origin":"yui3"},
                     {"name":"detach","type":"fn(type: string|Object, fn: fn(), context: Object) -> event_custom.EventTarget","origin":"yui3"},
                     {"name":"detachAll","type":"fn(type: string)","origin":"yui3"},
                     {"name":"fire","type":"fn(type: string|Object, arguments: Object) -> bool","origin":"yui3"},
                     {"name":"get","type":"fn(name: string)","origin":"yui3"},
                     {"name":"getAttrs","type":"fn(attrs: [string]|bool) -> Object","origin":"yui3"},
                     {"name":"getEvent","type":"fn(type: string, prefixed: string) -> event_custom.CustomEvent","origin":"yui3"},
                     {"name":"getTargets","type":"fn()","origin":"yui3"},
                     {"name":"init","type":"fn(config: ?)","origin":"yui3"},
                     {"name":"modifyAttr","type":"fn(name: string, config: ?)","origin":"yui3"},
                     {"name":"name","type":"string","origin":"yui3"},
                     {"name":"on","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                     {"name":"once","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                     {"name":"onceAfter","type":"fn(type: string, fn: fn(), context?: Object, arg?: ?) -> event_custom.EventHandle","origin":"yui3"},
                     {"name":"parseType","type":"fn(type: string, pre?: string) -> [?]","origin":"yui3"},
                     {"name":"pause","type":"fn()","origin":"yui3"},
                     {"name":"publish","type":"fn(type: string, opts: {}) -> event_custom.CustomEvent","origin":"yui3"},
                     {"name":"removeAttr","type":"fn(name: string)","origin":"yui3"},
                     {"name":"removeTarget","type":"fn(o: event_custom.EventTarget)","origin":"yui3"},
                     {"name":"reset","type":"fn(name: string)","origin":"yui3"},
                     {"name":"run","type":"fn()","origin":"yui3"},
                     {"name":"set","type":"fn(name: string, value: ?, opts: Object)","origin":"yui3"},
                     {"name":"setAttrs","type":"fn(attrs: Object, opts: Object)","origin":"yui3"},
                     {"name":"stop","type":"fn(finish: bool)","origin":"yui3"},
                     {"name":"subscribe","type":"fn()","origin":"yui3"},
                     {"name":"toString","type":"fn() -> string","origin":"yui3"},
                     {"name":"unsubscribe","type":"fn()","origin":"yui3"},
                     {"name":"unsubscribeAll","type":"fn(type: string)","origin":"yui3"}
                    ]
  });
}

if (module == require.main) require("test").run(exports);