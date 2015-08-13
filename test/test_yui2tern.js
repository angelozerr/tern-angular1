var util = require("./util"), assert = require('assert');

var yuiDef = util.generateDef();

// Test with http://yuilibrary.com/yui/docs/api/classes/Anim.html

exports['test admin.Anim'] = function() {
  var Anim = yuiDef["!define"]["anim"]["Anim"];
  assert.notEqual(Anim, null, 'cannot find anim.Anim');
  assert.equal(Anim["!type"], "fn()");
  // extends Base
  assert.equal(Anim["prototype"]["!proto"], "base.Base.prototype");
}

exports['test app.App'] = function() {
  var App = yuiDef["!define"]["app"]["App"];
  assert.notEqual(App, null, 'cannot find app.App');
  assert.equal(App["!type"], "fn(config?: +config.AppConfig)");
  // extends Base
  assert.equal(App["prototype"]["!proto"], "app.App.Base.prototype");
  // showContent
  var Content = App["Content"]
  assert.notEqual(Content, null, 'cannot find App.Content');
  // Test with callback of showContent
  assert.equal(Content["prototype"]["showContent"]["!type"], "fn(content: +HTMLElement|+node.Node|string, options?: +config.App.ContentShowContentConfig, callback?: fn(view: +app.View)) -> !this");
}

exports['test test.EventTarget'] = function() {
  var EventTarget = yuiDef["!define"]["test"]["Test"]["EventTarget"];
  assert.notEqual(EventTarget, null, 'cannot find Test.EventTarget');
  assert.equal(EventTarget["!type"], "fn()");
}

//Test with http://yuilibrary.com/yui/docs/api/classes/Node.html

exports['test node.Node'] = function() {
  var Node = yuiDef["!define"]["node"]["Node"];
  assert.notEqual(Node, null, 'cannot find node.Node');
  var prototypeNode = Node["prototype"];
  assert.notEqual(prototypeNode, null, 'cannot find node.Node.prototype');
  // see https://github.com/angelozerr/tern-yui3/issues/9
  var on = prototypeNode["on"];
  assert.notEqual(on, null, 'cannot find node.Node.prototype.on');
  assert.equal(on["!type"], "fn(type: string, fn: fn(e: +event.DOMEventFacade), context?: ?, arg?: ?) -> +event_custom.EventHandle");
}

if (module == require.main) require("test").run(exports);