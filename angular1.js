(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    return mod(require("tern/lib/infer"), require("tern/lib/tern"), require("tern/lib/comment"),
               require("acorn/dist/walk"), require("acorn/dist/acorn"), require);
  if (typeof define == "function" && define.amd) // AMD
    return define(["tern/lib/infer", "tern/lib/tern", "tern/lib/comment", "acorn/dist/walk", "acorn/dist"], mod);
  mod(tern, tern, tern.comment, acorn.walk, acorn);
})(function(infer, tern, comment, walk, acorn, require) {
  "use strict";

  var SetDoc = infer.constraint({
    construct: function(doc) { this.doc = doc; },
    addType: function(type) {
      if (!type.doc) type.doc = this.doc;
    }
  });

  function Injector() {
    this.fields = Object.create(null);
    this.forward = [];
  }

  Injector.prototype.get = function(name) {
    if (name == "$scope") return new infer.Obj(globalInclude("$rootScope").getType(), "$scope");
    if (name in this.fields) return this.fields[name];
    var field = this.fields[name] = new infer.AVal;
    return field;
  };
  Injector.prototype.set = function(name, val, doc, node, depth, fieldType) {
    if (name == "$scope" || depth && depth > 10) return;
    var field = this.fields[name] || (this.fields[name] = new infer.AVal);
    if (!depth) field.local = true;
    field.type = fieldType;
    field.fnType = val.fnType;
    if (!field.origin) field.origin = infer.cx().curOrigin;
    if (typeof node == "string" && !field.span) field.span = node;
    else if (node && typeof node == "object" && !field.originNode) field.originNode = node;
    if (doc) { field.doc = doc; field.propagate(new SetDoc(doc)); }
    val.propagate(field);
    for (var i = 0; i < this.forward.length; ++i)
      this.forward[i].set(name, val, doc, node, (depth || 0) + 1, fieldType);
  };
  Injector.prototype.forwardTo = function(injector) {
    this.forward.push(injector);
    for (var field in this.fields) {
      var val = this.fields[field];
      injector.set(field, val, val.doc, val.span || val.originNode, 1, val.type);
    }
  };

  function globalInclude(name) {
    var service = infer.cx().definitions.angular.service;
    if (service.hasProp(name)) return service.getProp(name);
    var provider = infer.cx().definitions.angular.provider;
    if (provider.hasProp(name)) return provider.getProp(name);
  }

  function getInclude(mod, name) {
    var glob = globalInclude(name);
    if (glob) {
      if (glob.getType && glob.getType() && glob.getType().metaData && glob.getType().metaData.instance == true) return new infer.Obj(glob.getType().hasProp("prototype").getType()); // ex : $routeProvider
      return glob;
    }
    if (!mod.injector) return infer.ANull;
    return mod.injector ? mod.injector.get(name) : infer.ANull;
  }

  function applyWithInjection(mod, fnType, node, asNew) {
    var deps = [];
    if (/FunctionExpression/.test(node.type)) {
      for (var i = 0; i < node.params.length; ++i) {
        var elt = node.params[i], dep = getInclude(mod, elt.name);
        deps.push(dep);
        // mark node as field name
        elt.angular = {type: "field", parentModule: mod, field: dep};
      }
    } else if (node.type == "ArrayExpression") {
      for (var i = 0; i < node.elements.length; ++i) {
        var elt = node.elements[i];
        if (elt.type == "Literal" && typeof elt.value == "string") {
          var dep = getInclude(mod, elt.value);
          deps.push(dep);
          // mark node as field name
          elt.angular = {type: "field", parentModule: mod, field: dep};
        }
        else if (i < node.elements.length)
          deps.push(infer.ANull);
      }
      var last = node.elements[node.elements.length - 1];
      if (last && /FunctionExpression/.test(last.type))
        fnType = last.scope.fnType;
    }
    var result = new infer.AVal;
    if (asNew) {
      var self = new infer.AVal;
      fnType.propagate(new infer.IsCtor(self));
      self.propagate(result, 90);
      fnType.propagate(new infer.IsCallee(self, deps, null, new infer.IfObj(result)));
    } else {
      fnType.propagate(new infer.IsCallee(infer.cx().topScope, deps, null, result));
    }
    result.fnType = fnType;
    return result;
  }
  
  function getModule(name) {
    return infer.cx().parent.mod.angular.modules[name];  
  }  

  infer.registerFunction("angular_callInject", function(argN) {
    return function(self, args, argNodes) {
      var mod = self.getType();
      if (mod && argNodes && argNodes[argN])
        var result = applyWithInjection(mod, args[argN], argNodes[argN]), fnType = result && result.fnType;
        if (fnType && fnType.args) {
          for (var i = 0; i < fnType.args.length; i++) {
            var arg = fnType.args[i], argType = arg.getType();            
            if (argType && argType.name) {
              var elt = mod.addSimpleElement(argType.name, arg.originNode, argType, "config");
              if (argType.name == "provider.$routeProvider") argType["$routeProvider"] = elt;
            }
          }
        }
        if (args[argN] && args[argN].argNames && args[argN].argNames[0] == '$rootScope') {
          mod.rootScope = args[argN].args[0];
        }
    };
  });

  infer.registerFunction("angular_controller", function(self, args, argNodes) {
    angular_regFieldCall(self, args, argNodes, 'controller');
    var mod = self.getType();
    if (mod && argNodes && argNodes.length > 1) mod.addElement(args, argNodes, "controller");
  });
    
  infer.registerFunction("angular_directive", function(self, args, argNodes) {
    var mod = self.getType();
    if (mod && argNodes && argNodes.length > 1) mod.addElement(args, argNodes, "directive");
  });
  
  infer.registerFunction("angular_regFieldCall", function(self, args, argNodes) {
    angular_regFieldCall(self, args, argNodes);
  });
  
  function angular_regFieldCall(self, args, argNodes, callType) {
    var mod = self.getType();
    if (mod && argNodes && argNodes.length > 1) {
      var result = applyWithInjection(mod, args[1], argNodes[1]);
      if (mod.injector && argNodes[0].type == "Literal")
        mod.injector.set(argNodes[0].value, result, argNodes[0].angularDoc, argNodes[0], null, callType);
    }
  };

  infer.registerFunction("angular_regFieldNew", function(self, args, argNodes) {
    var mod = self.getType();
    if (mod && argNodes && argNodes.length > 1) {
      var result = applyWithInjection(mod, args[1], argNodes[1], true);
      if (mod.injector && argNodes[0].type == "Literal")
        mod.injector.set(argNodes[0].value, result, argNodes[0].angularDoc, argNodes[0]);
    }
  });

  infer.registerFunction("angular_regField", function(self, args, argNodes) {
    var mod = self.getType();
    if (mod && mod.injector && argNodes && argNodes[0] && argNodes[0].type == "Literal" && args[1])
      mod.injector.set(argNodes[0].value, args[1], argNodes[0].angularDoc, argNodes[0]);
  });
  
  infer.registerFunction("angular_callFilter", function(self, args, argNodes) {
    var mod = self.getType();
    if (mod && argNodes && argNodes[0] && argNodes[0].type == "Literal")  mod.addElement(args, argNodes, "filter");    
  });
  
  infer.registerFunction("angular_callFactory", function(self, args, argNodes) {
    var mod = self.getType();
    if (mod && argNodes && argNodes.length > 1) {
      var result = applyWithInjection(mod, args[1], argNodes[1]);
      if (mod.injector && argNodes[0].type == "Literal") {
        mod.injector.set(argNodes[0].value, result, argNodes[0].angularDoc, argNodes[0], null);
        mod.addElement(args, argNodes, "factory");
      }
    }
  });
  
  infer.registerFunction("angular_callProvider", function(self, args, argNodes) {
    var mod = self.getType();
    if (mod && argNodes && argNodes.length > 1) {
      var result = applyWithInjection(mod, args[1], argNodes[1]);
      if (mod.injector && argNodes[0].type == "Literal") {
        mod.injector.set(argNodes[0].value, result, argNodes[0].angularDoc, argNodes[0], null);
        mod.addElement(args, argNodes, "provider");
      }
    }
  });

  infer.registerFunction("angular_callService", function(self, args, argNodes) {
    var mod = self.getType();
    if (mod && argNodes && argNodes.length > 1) {
      var result = applyWithInjection(mod, args[1], argNodes[1], true);
      if (mod.injector && argNodes[0].type == "Literal") {
        mod.injector.set(argNodes[0].value, result, argNodes[0].angularDoc, argNodes[0]);
        mod.addElement(args, argNodes, "service");
      }
    }
  });
  
  function arrayNodeToStrings(node) {
    var strings = [];
    if (node && node.type == "ArrayExpression")
      for (var i = 0; i < node.elements.length; ++i) {
        var elt = node.elements[i];
        if (elt.type == "Literal" && typeof elt.value == "string") {
          // mark node as module.
          elt.angular = {type: "module", dep: true};
          strings.push(elt.value);
        }
      }
    return strings;
  }

  function moduleProto(cx) {
    var ngDefs = cx.definitions.angular;
    return ngDefs && ngDefs.Module.getProp("prototype").getType();
  }
  
  function copy(obj, props) {
    if (props) for (var prop in props) obj[prop] = props[prop];
  }
  
  function extend(proto, props) {
    var obj = Object.create(proto);
    copy(obj, props);
    return obj;
  }
  
  var AngularElement = function(name, originNode, fnType, kind, parent) {
    this.originNode = originNode; // origine node for the name of the angular element
    this.fnType = fnType; // function type of the angular element
    this.parent = parent; // parent object (ex : for directive it's module)
    this.kind = kind;
    this.eltName = name;
  }
  
  AngularElement.prototype.kinds = []; // all kind (directive, controller, etc) added in the module
  
  AngularElement.prototype.createElement = function(name, originNode, fnType, kind) {
    switch(kind) {
      case "directive":
        return new Directive(name, originNode, fnType, kind, this);
      default:
        return new AngularElement(name, originNode, fnType, kind, this);
    }
  }
  
  AngularElement.prototype.updateElement = function(originNode, fnType) {
    this.originNode = originNode;
    this.fnType = fnType;
  }
  
  AngularElement.prototype.getRetObjType = function() {
    var fnType = this.fnType && this.fnType.getType();
    if (fnType instanceof infer.Arr) {
      fnType = fnType.getProp("<i>").getFunctionType();
    }
    if (fnType) fnType = fnType.getFunctionType();
    if (!(fnType && fnType instanceof infer.Fn && fnType.retval)) return;
    var objType = fnType.retval.getObjType();
    if (objType && objType.originNode && objType.originNode.type == "ObjectExpression" ) return objType;
  } 
  
  AngularElement.prototype.addElement = function(args, argNodes, kind) {    
    var name = argNodes[0].value, originNode = argNodes[0], fnType = args[1];
    return this.addSimpleElement(name, originNode, fnType, kind);
  }

  AngularElement.prototype.addSimpleElement = function(name, originNode, fnType, kind) {    
    var fieldName = kind == "factory" ? "factories" : kind + "s";
    if (this.kinds.indexOf(fieldName) < 0) this.kinds.push(fieldName);
    var elts = !this[fieldName] ? this[fieldName] = {} : this[fieldName];
    var elt = elts[name];
    if (!elt) elt = elts[name] = this.createElement(name, originNode, fnType, kind);
    else elt.updateElement(originNode, fnType);
    elt.include();     
    return elt;
  }
  
  AngularElement.prototype.include = function() {
    if (this.excluded == true) this.excluded = false;
  }
  
  AngularElement.prototype.exclude = function(filename) {
    // exclude the module, directive, controller
    if (this.originNode && this.originNode.sourceFile.name == filename) this.excluded = true;      
    // exclude the children directives, controllers, ... of the module
    for (var i = 0; i < this.kinds.length; i++) {
      var children = this[this.kinds[i]];
      for (var name in children) children[name].exclude(filename);
    }    
  }
  
  AngularElement.prototype.update = function(filename) {
    var changed = false;
    // update the module
    if (this.originNode && this.originNode.sourceFile.name == filename) {
      if (this.excluded == true) {
        // the module was removed
        var fieldName = this.kind == "factory" ? "factories" : this.kind + "s";
        delete this.parent[fieldName][this.eltName];
        changed = true;
      } else if (this.excluded == false) {
        // the module was not changed
        delete this["excluded"];
      } else {
        // the module was added
        changed = true;
      }
    }
    // update directives, controllers, ... of the module
    for (var i = 0; i < this.kinds.length; i++) {
      var children = this[this.kinds[i]];
      for (var name in children) if (children[name].update(filename)) changed = true;      
    }
    return changed;
  }
  
  AngularElement.prototype.toJSON = function(parent) {
    
    function addItem(name, kind, originNode, parent) {
      if (!(parent instanceof Array)) {
        if (parent.children) {
          parent = parent.children;
        } else {
          parent = parent.children = []; 
        } 
      }
      var item = {"name": name, "kind": kind};
      if (originNode) {
        item.start = originNode.start;
        item.end = originNode.end;
        item.file = originNode.sourceFile.name;        
      }
      parent.push(item);
      return item;
    }
   
    var item = addItem(this.eltName, this.kind, this.originNode, parent);
    for (var i = 0; i < this.kinds.length; i++) {
      var children = this[this.kinds[i]];
      for (var name in children) children[name].toJSON(item);      
    }
    
    var objType = this.getRetObjType(); 
    if (objType && objType.originNode && objType.originNode.properties) {
      var properties = objType.originNode.properties;
      for ( var i = 0; i < properties.length; i++) {
        var p = properties[i];
        var name = p.key.name, value = p.value.value;
        var prop = addItem(name, "property", p.key, item);
        if (value) prop.value = value;
      }
    }
  }

  var Directive = function(name, originNode, fnType, kind, parent) {
    AngularElement.call(this, name, originNode, fnType, kind, parent);
  }
  
  Directive.prototype = extend(AngularElement.prototype, {
    update: function(filename) {
      // call super AngularElement update
      AngularElement.prototype.update.apply(this, arguments);
      // update controller if it is defined inside the directive
      var mod = this.parent, objType = this.getRetObjType();
      if (objType) {        
        var ctrlType = objType.hasProp("controller") && objType.hasProp("controller").getType();
        if (ctrlType instanceof infer.Fn) {
          // case: .directive('btnRadio', function () {return {controller: function($scope) {}}; 
          var argNode = this.originNode, node = ctrlType.originNode;                  
          var result = applyWithInjection(mod, ctrlType, node);
          if (mod.injector)
            mod.injector.set(this.eltName + '#controller', result, argNode.angularDoc, argNode, null, 'controller');
        }
      }
    }
  });
  
  function declareMod(name, includes, node) {
    var cx = infer.cx(), data = cx.parent.mod.angular;
    var proto = moduleProto(cx);
    var mod = new infer.Obj(proto || true);
    if (!proto) data.nakedModules.push(mod);
    mod.origin = cx.curOrigin;
    if (typeof node == "string" && !mod.span) mod.span = node;
    else if (node && typeof node == "object" && !mod.originNode) mod.originNode = node;
    mod.injector = new Injector();
    mod.metaData = {includes: includes};
    for (var i = 0; i < includes.length; ++i) {
      var depMod = data.modules[includes[i]];
      if (!depMod)
        (data.pendingImports[includes[i]] || (data.pendingImports[includes[i]] = [])).push(mod.injector);
      else if (depMod.injector)
        depMod.injector.forwardTo(mod.injector);
    }
    if (typeof name == "string") {
      data.modules[name] = mod;
      var pending = data.pendingImports[name];
      if (pending) {
        delete data.pendingImports[name];
        for (var i = 0; i < pending.length; ++i)
          mod.injector.forwardTo(pending[i]);
      }
    }
    copy(mod, AngularElement.prototype);
    mod.parent = data;
    mod.eltName = name;
    mod.kind = "module";
    return mod;
  }

  infer.registerFunction("angular_module", function(_self, _args, argNodes) {
    var mod, name, argNode = argNodes && argNodes[0];
    if (argNode) {
      if (argNode.type == "Literal") name = argNode.value;
      if (argNode.type == "Identifier" && _args[0] && (!_args[0].getType || (_args[0].getType && !_args[0].getType()) || (_args[0].getType && _args[0].getType() && _args[0].getType().name == 'string'))) name = '#' + argNode.name;
    }
    if (typeof name == "string")
      mod = getModule(name);
    var deps = arrayNodeToStrings(argNodes && argNodes[1]);
    // FIXME: refresh module when deps changed.
    if (!mod) mod = declareMod(name, deps, argNodes[0]);      
    mod.originNode = argNodes[0];
    // mark node as module (when angular.module() => argNodes[0] is null)
    if (argNodes[0]) argNodes[0].angular = {type: "module"};
    // include the module
    if (mod) mod.include();
    return mod;
  });

  var IsBound = infer.constraint({
    construct: function(self, args, target) {
      this.self = self; this.args = args; this.target = target;
    },
    addType: function(tp) {
      if (!(tp instanceof infer.Fn)) return;
      this.target.addType(new infer.Fn(tp.name, tp.self, tp.args.slice(this.args.length),
                                       tp.argNames.slice(this.args.length), tp.retval));
      this.self.propagate(tp.self);
      for (var i = 0; i < Math.min(tp.args.length, this.args.length); ++i)
        this.args[i].propagate(tp.args[i]);
    }
  });

  infer.registerFunction("angular_bind", function(_self, args) {
    if (args.length < 2) return infer.ANull;
    var result = new infer.AVal;
    args[1].propagate(new IsBound(args[0], args.slice(2), result));
    return result;
  });

  function findPropNodeValue(obj, name) {
    if (obj) {
      if (obj.getFunctionType() && obj.getFunctionType().retval) obj = obj.getFunctionType().retval.getObjType();
      else if (obj.getObjType()) obj = obj.getObjType();
      else obj = null;
      if (obj && obj.hasProp(name)) {
        // returns the property node value
        var propNodes = obj.originNode.properties;
        for (var i = 0; i < propNodes.length; i++) {
          if (propNodes[i].key.name == name) return propNodes[i].value;
        }
      }
    }
  }
  
  function baseUrl() {
    var cx = infer.cx(), server = cx.parent; 
    return server.mod.angular.options.baseURL || "";    
  }
  
  function relativePath(from, to) {
    if (from[from.length - 1] != "/") from += "/";
    if (to.indexOf(from) == 0) return to.slice(from.length);
    else return to;
  }
  
  function normPath(name) { return name.replace(/\\/g, "/"); }

  function resolveProjectPath(pth) {
    var base = baseUrl();
    return base ? resolvePath(normPath(base) + "/", normPath(pth)): normPath(pth);
  }
  
  function resolvePath(base, path) {
    if (path[0] == "/") return path;
    var slash = base.lastIndexOf("/"), m;
    if (slash >= 0) path = base.slice(0, slash + 1) + path;
    while (m = /[^\/]*[^\/\.][^\/]*\/\.\.\//.exec(path))
      path = path.slice(0, m.index) + path.slice(m.index + m[0].length);
    return path.replace(/(^|[^\.])\.\//g, "$1");
  }
  
  infer.registerFunction("angular_templateUrl", function(argN) {
    return function(self, args, argNodes) {
      var node = findPropNodeValue(args && args[argN], "templateUrl");
      if (node && node.type == "Literal" && typeof node.value == "string") {        
        // mark node as templateUrl
        node.angular = {type: "templateUrl", templateUrl: resolveProjectPath(node.value)};
      }
      var routeProvider = self["$routeProvider"];
      if (routeProvider) {
        var arg = args && args[0], node = argNodes && argNodes[0]; // string
        if (arg && node.type == "Literal" && typeof node.value == "string") {
          var when = routeProvider.addSimpleElement(node.value, node, null, "when");
          var arg = args[1], node = argNodes[1]; // string
          if (node && node.type == "ObjectExpression") {
            when.getRetObjType = function() {return arg};             
          }
        }        
      }
    };
  });
  
  function postParse(ast, text) {
    walk.simple(ast, {
      CallExpression: function(node) {
        if (node.callee.type == "MemberExpression" &&
            !node.callee.computed && node.arguments.length &&
            /^(value|constant|controller|factory|provider)$/.test(node.callee.property.name)) {
          var before = comment.commentsBefore(text, node.callee.property.start - 1);
          if (before) {
            var first = before[0], dot = first.search(/\.\s/);
            if (dot > 5) first = first.slice(0, dot + 1);
            first = first.trim().replace(/\s*\n\s*\*\s*|\s{1,}/g, " ");
            node.arguments[0].angularDoc = first;
          }
        }
      }
    });
  }

  function postLoadDef(json) {
    var cx = infer.cx(), defName = json["!name"], defs = cx.definitions[defName];
    if (defName == "angular") {
      var proto = moduleProto(cx), naked = cx.parent.mod.angular.nakedModules;
      if (proto) for (var i = 0; i < naked.length; ++i) naked[i].proto = proto;
      return;
    }
    var mods = defs && defs["!ng"];
    if (mods) for (var name in mods.props) {
      var obj = mods.props[name].getType();
      var mod = declareMod(name.replace(/`/g, "."), obj.metaData && obj.metaData.includes || [], mods.props[name].span);
      mod.origin = defName;
      for (var prop in obj.props) {
        var val = obj.props[prop], tp = val.getType();
        if (!tp) continue;
        if (/^_inject_/.test(prop)) {
          if (!tp.name) tp.name = prop.slice(8);
          mod.injector.set(prop.slice(8), tp, val.doc, val.span);
        } else {
          obj.props[prop].propagate(mod.defProp(prop));
        }
      }
    }
  }

  function preCondenseReach(state) {
    var mods = infer.cx().parent.mod.angular.modules;
    var modObj = new infer.Obj(null), found = 0;
    for (var name in mods) {
      var mod = mods[name];
      if (state.origins.indexOf(mod.origin) > -1) {
        var propName = name.replace(/\./g, "`");
        modObj.defProp(propName).addType(mod);
        mod.condenseForceInclude = true;
        ++found;
        if (mod.injector) for (var inj in mod.injector.fields) {
          var field = mod.injector.fields[inj];
          if (field.local) state.roots["!ng." + propName + "._inject_" + inj] = field;
        }
      }
    }
    if (found) state.roots["!ng"] = modObj;
  }

  function postCondenseReach(state) {
    var mods = infer.cx().parent.mod.angular.modules;
    for (var path in state.types) {
      var m;
      if (m = path.match(/^!ng\.([^\.]+)\._inject_([^\.]+)^/)) {
        var mod = mods[m[1].replace(/`/g, ".")];
        var field = mod.injector.fields[m[2]];
        var data = state.types[path];
        if (field.span) data.span = field.span;
        if (field.doc) data.doc = field.doc;
      }
    }
  }

  function initServer(server, options) {
    server.mod.angular = {
      modules: Object.create(null),
      pendingImports: Object.create(null),
      nakedModules: [],
      options: options
    };
  }

  tern.registerPlugin("angular1", function(server, options) {
    initServer(server, options);
    server.on("reset", function() { initServer(server, options); });
    server.on("postParse", postParse)
    server.on("postLoadDef", postLoadDef)
    server.on("preCondenseReach", preCondenseReach)
    server.on("postCondenseReach", postCondenseReach)
    server.on("preInfer", preInfer)
    server.on("postInfer", postInfer)
    server.on("typeAt", findTypeAt)
    server.on("completion", findCompletions)
    server.addDefs(defs, true)    
  });
  
  function copyTypeInfo(from, to) {
    if (from.doc) to.doc = from.doc;
    if (from.url) to.url = from.url;
    if (from.origin) to.origin = from.origin;
    if (from.originNode) to.originNode = from.originNode;
  }
  
  function getTypeAt(expr) {
    if (!expr || !expr.node || !expr.node.angular) return null;
    var data = expr.node.angular;
    if (data.type == "module") return typeAtModuleName;
    if (data.type == "templateUrl") return typeAtTemplateUrl;
    if (data.type == "field") return typeAtField;
  }
  
  function findTypeAt(file, pos, expr, type) {
    var typeAt = getTypeAt(expr);
    if (!typeAt) return type;
    var t = typeAt(file, pos, expr, type);
    return t ? t : type;
    
    
    var isStringLiteral = expr.node.type === "Literal" &&
       typeof expr.node.value === "string";
    if (isStringLiteral) {
      if(expr.node.module != undefined) {
        // Angular module
        var name = expr.node.value, mod = getModule(name);
        if (mod) {
          // The `type` is a value shared for all string literals.
          // We must create a copy before modifying `origin` and `originNode`.
          // Otherwise all string literals would point to the last jump location
          type = Object.create(type);
          copyTypeInfo(mod, type);
        }
      } else if (expr.node.templateUrl != undefined) {
        // template url file
        type = Object.create(type);
        type.origin = expr.node.templateUrl;
      } else if (expr.node.field  != undefined && expr.node.field.getType && expr.node.field.getType()) {
        var fieldType = expr.node.field.getType();
        type = Object.create(type);
        copyTypeInfo(fieldType, type);
      }
    }
    return type;
  }
  
  function typeAtModuleName(file, pos, expr, type) {
    if (!(expr.node.type === "Literal" && typeof expr.node.value === "string")) return;
    // Angular module
    var name = expr.node.value, mod = getModule(name);
    if (mod) {
      type = Object.create(type);
      copyTypeInfo(mod, type);
    }
    return type;
  }
  
  function typeAtTemplateUrl(file, pos, expr, type) {
    if (!(expr.node.type === "Literal" && typeof expr.node.value === "string")) return;
    type = Object.create(type);
    type.origin = expr.node.angular.templateUrl;
    return type;
  }

  function typeAtField(file, pos, expr, type) {
    if (!(expr.node.type === "Literal" && typeof expr.node.value === "string")) return;
    var fieldType = expr.node.angular.field && expr.node.angular.field.getType();
    type = Object.create(type);
    copyTypeInfo(fieldType, type);
    return type;
  }

  function getCompletionType(expr) {
    if (!expr || !expr.node || !expr.node.angular) return null;
    var data = expr.node.angular;
    if (data.type == "module" && data.dep) return completeModuleName;
    if (data.type == "templateUrl") return completeTemplateUrl;
    if (data.type == "field") return completeInjectionParam;
  }
  
  function findCompletions(file, query) {
    var wordEnd = tern.resolvePos(file, query.end);
    var expr = infer.findExpressionAround(file.ast, null, wordEnd, file.scope);
    var complete = getCompletionType(expr);
    if (!complete) return;
    var argNode = expr.node, isStringName = argNode.type == "Literal";
    var word, quote;
    if(isStringName) {
      word = argNode.raw.slice(1, wordEnd - argNode.start);
      quote = argNode.raw.charAt(0);
      if (word && word.charAt(word.length - 1) == quote)
        word = word.slice(0, word.length - 1);  
    } else {
      word = argNode.name.slice(0, wordEnd - argNode.start);
    }    
    var completions = complete(query, file, argNode, word);
    if (argNode.end == wordEnd + 1 && file.text.charAt(wordEnd) == quote)
      ++wordEnd;
    return {
      start: tern.outputPos(query, file, argNode.start),
      end: tern.outputPos(query, file, wordEnd),
      isProperty: false,
      completions: completions.map(function(rec) {
        var name = typeof rec == "string" ? rec : rec.name;
        if (!isStringName) {
          if (typeof rec == "string") return name;
          return rec;
        }        
        var string = JSON.stringify(name);
        if (quote == "'") string = quote + string.slice(1, string.length -1).replace(/'/g, "\\'") + quote;
        if (typeof rec == "string") return string;
        rec.displayName = name;
        rec.name = string;
        return rec;
      })
    };
  }

  function completeModuleName(query, file, node, word) {
    var completions = [];
    var cx = infer.cx(), server = cx.parent, data = server.mod.angular;
    
    function gather(modules) {
      for (var name in modules) {
        if (name &&
            !(query.filter !== false && word &&
              (query.caseInsensitive ? name.toLowerCase() : name).indexOf(word) !== 0))
          tern.addCompletion(query, completions, name, modules[name]);
      }
    }

    if (query.caseInsensitive) word = word.toLowerCase();
    gather(data.modules);
    return completions;
  }
  
  function completeFiles(pat, c) {
    
  }
  
  //Assume node.js & access to local file system
  if (require) (function() {
    var fs = require("fs"), glob = require("glob"), path = require("path");

    relativePath = path.relative;
    
    completeFiles = function(paths, c) {
      if (paths) paths.forEach(function(pat) {
        glob.sync(pat).forEach(function(file) {
          c(file);
        });
      });     
    }
    
  })();  
  
  var htmlExtensions = "html|htm|xhtml|jsp|jsf|php";
  
  function completeTemplateUrl(query, file, node, word) {
    var completions = [];
    var baseURL = baseUrl();
    var wrapAsObjs = query.types || query.depths || query.docs || query.urls || query.origins;
    completeFiles(["**.+(" + htmlExtensions + ")", "**/**.+(" + htmlExtensions + ")"], function(htmlFile) {
      if (!startsWithString(htmlFile.toString(), baseURL)) return false; // templateUrl seems not support relative path?
      var filename = normPath(relativePath(baseURL, htmlFile.toString()));      
      if (!isFileMatch(filename, word, query)) return;
      var rec = wrapAsObjs ? {name: filename} : filename;
      completions.push(rec);
      
      if ((query.types || query.docs || query.urls || query.origins)) {
        // if (query.types) rec.type= "{}";
        if (query.origins) rec.origin= baseURL + '/' + filename;
      }
    });
    return completions;
  }
  
  function isFileMatch(filename, word, query) {
    if (query.caseInsensitive) filename = filename.toLowerCase();
    if (startsWithString(filename, word)) return true;
    var index = word.indexOf('/');
    if (index == -1) {
      // search by filename
      var nameIndex = filename.indexOf('/');
      var name = nameIndex != 1 ? filename.substring(nameIndex + 1, filename.length) : filename;
      if (startsWithString(name, word)) return true;
    }
    return false;
  }  
  
  function completeInjectionParam(query, file, node, word) {
    var completions = [], mod = node.angular && node.angular.parentModule, fields = mod && mod.injector && mod.injector.fields;
    if (!fields) return;
    var cx = infer.cx(), angular = cx.definitions.angular;
    
    function gather(fields, checkType) {
      for (var name in fields) {
        if (name &&
            !(query.filter !== false && word &&
              (query.caseInsensitive ? name.toLowerCase() : name).indexOf(word) !== 0)
            && (!checkType || (checkType && fields[name].getType())))
          tern.addCompletion(query, completions, name, fields[name]);
      }
    }

    if (query.caseInsensitive) word = word.toLowerCase();    
    gather(angular.service.props);
    gather(angular.provider.props);
    gather(fields, true);
    return completions;
  }
    
  function preInfer(ast, scope) {
    var filename = ast.sourceFile.name, server = infer.cx().parent, angular= server.mod.angular, mods = angular.modules;
    // marks the angular modules of the current file as excluded.
    // module are enabled inside the angular_module tern function.    
    for (var name in mods) mods[name].exclude(filename);
  }
  
  function postInfer(ast, scope) {
    
    function updateOutline(ast) {
      var filename = ast.sourceFile.name, server = infer.cx().parent, angular = server.mod.angular, mods = angular.modules, changes = false;
      for (var name in mods) {
        if (mods[name].update(filename)) changes = true;
      }
      if (!server.sendToClient) return;
      if (changes || !angular.outline) return createOutline(server);
      var oldOutline = angular.outline, newOutline = createOutline(server);
      if (JSON.stringify(oldOutline) != JSON.stringify(newOutline)) return newOutline;
    }
    
    // delete the angular modules of the current file which are marked as excluded.
    var outline = updateOutline(ast);
    if (outline) {
      // outline has changed
      var server = infer.cx().parent, angular = server.mod.angular;
      angular.outline = outline;
      server.sendToClient("angular:modelChanged", outline);
    }        
  }
  
  var defs = {
    "!name": "angular",
    "!define": {
      cacheObj: {
        info: "fn() -> ?",
        put: "fn(key: string, value: ?) -> !1",
        get: "fn(key: string) -> ?",
        remove: "fn(key: string)",
        removeAll: "fn()",
        destroy: "fn()"
      },
      eventObj: {
        targetScope: "service.$rootScope",
        currentScope: "service.$rootScope",
        name: "string",
        stopPropagation: "fn()",
        preventDefault: "fn()",
        defaultPrevented: "bool"
      },
      routeObj: {
        controller: {
         "!type": "string",
         "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
         "!doc": " Controller fn that should be associated with newly created scope or the name of a registered controller if passed as a string."
        },
        controllerAs: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
          "!doc": " A controller alias name. If present the controller will be published to scope under the controllerAs name."
        },
        template: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
          "!doc": "html template as a string or a function that returns an html template as a string which should be used by ngView or ngInclude directives. This property takes precedence over templateUrl."
        },
        templateUrl: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
          "!doc": "Path or function that returns a path to an html template that should be used by ngView."
        },
        resolve: {
          "!type": "?",
          "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
          "!doc": "An optional map of dependencies which should be injected into the controller. If any of these dependencies are promises, the router will wait for them all to be resolved or one to be rejected before the controller is instantiated. If all the promises are resolved successfully, the values of the resolved promises are injected and $routeChangeSuccess event is fired. If any of the promises are rejected the $routeChangeError event is fired."
        },
        redirectTo: {
          "!type": "fn()",
          "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
          "!doc": "Value to update $location path with and trigger route redirection."
        },
        reloadOnSearch: {
          "!type": "bool",
          "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
          "!doc": "Reload route when only $location.search() or $location.hash() changes. If the option is set to false and url in the browser changes, then $routeUpdate event is broadcasted on the root scope."
        },
        caseInsensitiveMatch: {
          "!type": "bool",
          "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
          "!doc": "match routes without being case sensitive. If the option is set to true, then the particular route can be matched without being case sensitive"
        }
      },
      directiveObj: {
        multiElement: {
          "!type": "bool",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-multielement-",
          "!doc": "When this property is set to true, the HTML compiler will collect DOM nodes between nodes with the attributes directive-name-start and directive-name-end, and group them together as the directive elements. It is recommended that this feature be used on directives which are not strictly behavioural (such as ngClick), and which do not manipulate or replace child nodes (such as ngInclude)."
        },
        priority: {
          "!type": "number",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-priority-",
          "!doc": "When there are multiple directives defined on a single DOM element, sometimes it is necessary to specify the order in which the directives are applied. The priority is used to sort the directives before their compile functions get called. Priority is defined as a number. Directives with greater numerical priority are compiled first. Pre-link functions are also run in priority order, but post-link functions are run in reverse order. The order of directives with the same priority is undefined. The default priority is 0."
        },
        terminal: {
          "!type": "bool",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-terminal-",
          "!doc": "If set to true then the current priority will be the last set of directives which will execute (any directives at the current priority will still execute as the order of execution on same priority is undefined). Note that expressions and other directives used in the directive's template will also be excluded from execution."
        },
        scope: {
          "!type": "?",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-scope-",
          "!doc": "If set to true, then a new scope will be created for this directive. If multiple directives on the same element request a new scope, only one new scope is created. The new scope rule does not apply for the root of the template since the root of the template always gets a new scope. If set to {} (object hash), then a new 'isolate' scope is created. The 'isolate' scope differs from normal scope in that it does not prototypically inherit from the parent scope. This is useful when creating reusable components, which should not accidentally read or modify data in the parent scope."
        },
        bindToController: {
          "!type": "bool",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-bindtocontroller-",
          "!doc": "When an isolate scope is used for a component (see above), and controllerAs is used, bindToController: true will allow a component to have its properties bound to the controller, rather than to scope. When the controller is instantiated, the initial values of the isolate scope bindings are already available."
        },
        controller: {
          "!type": "fn()",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-controller-",
          "!doc": "Controller constructor function. The controller is instantiated before the pre-linking phase and it is shared with other directives (see require attribute). This allows the directives to communicate with each other and augment each other's behavior."
        },
        require: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-require-",
          "!doc": "Require another directive and inject its controller as the fourth argument to the linking function. The require takes a string name (or array of strings) of the directive(s) to pass in. If an array is used, the injected argument will be an array in corresponding order. If no such directive can be found, or if the directive does not have a controller, then an error is raised."
        },
        controllerAs: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-controlleras-",
          "!doc": "Controller alias at the directive scope. An alias for the controller so it can be referenced at the directive template. The directive needs to define a scope for this configuration to be used. Useful in the case when directive is used as component."
        },
        restrict: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-restrict-",
          "!doc": "String of subset of EACM which restricts the directive to a specific directive declaration style. If omitted, the defaults (elements and attributes) are used. E - Element name (default): <my-directive></my-directive>. A - Attribute (default): <div my-directive='exp'></div>. C - Class: <div class='my-directive: exp;'></div>. M - Comment: <!-- directive: my-directive exp --> "
        },
        templateNamespace: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-templatenamespace-",
          "!doc": "String representing the document type used by the markup in the template. AngularJS needs this information as those elements need to be created and cloned in a special way when they are defined outside their usual containers like <svg> and <math>."
        },
        template: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-template-",
          "!doc": "HTML markup that may: Replace the contents of the directive's element (default). Replace the directive's element itself (if replace is true - DEPRECATED). Wrap the contents of the directive's element (if transclude is true)."
        },
        templateUrl: {
          "!type": "string",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-templateurl-",
          "!doc": "This is similar to template but the template is loaded from the specified URL, asynchronously."
        },
        transclude: {
          "!type": "bool",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-transclude-",
          "!doc": "Extract the contents of the element where the directive appears and make it available to the directive. The contents are compiled and provided to the directive as a transclusion function."
        },
        compile: {
          "!type": "fn(tElement: +Element, tAttrs: +Attr)",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-transclude-",
          "!doc": "The compile function deals with transforming the template DOM. Since most directives do not do template transformation, it is not used often."
        },
        link: {
          "!type": "fn(scope: ?, iElement: +Element, iAttrs: +Attr, controller: string|[string], transcludeFn: fn())",
          "!url": "https://docs.angularjs.org/api/ng/service/$compile#-link-",
          "!doc": "The link function is responsible for registering DOM listeners as well as updating the DOM. It is executed after the template has been cloned. This is where most of the directive logic will be put."
        }
      },
      Module: {
        "!url": "http://docs.angularjs.org/api/angular.Module",
        "!doc": "Interface for configuring angular modules.",
        prototype: {
          animation: {
            "!type": "fn(name: string, animationFactory: fn()) -> !this",
            "!url": "http://docs.angularjs.org/api/angular.Module#animation",
            "!doc": "Defines an animation hook that can be later used with $animate service and directives that use this service."
          },
          config: {
            "!type": "fn(configFn: fn()|[]) -> !this",
            "!effects": ["custom angular_callInject 0"],
            "!url": "https://docs.angularjs.org/api/ng/type/angular.Module#config",
            "!doc": "Use this method to register work which needs to be performed on module loading."
          },
          constant: "service.$provide.constant",
          controller: "provider.$controllerProvider.register",
          directive: "provider.$compileProvider.directive",
          factory: "service.$provide.factory",
          filter: {
            "!type": "fn(name: string, filterFactory: fn()) -> !this",
            "!effects": ["custom angular_callFilter"],
            "!url": "http://docs.angularjs.org/api/ng.$filterProvider",
            "!doc": "Register filter factory function."
          },
          provider: "service.$provide.provider",
          run: {
            "!type": "fn(initializationFn: fn()) -> !this",
            "!effects": ["custom angular_callInject 0"],
            "!url": "http://docs.angularjs.org/api/angular.Module#run",
            "!doc": "Register work which should be performed when the injector is done loading all modules."
          },
          service: "service.$provide.service",
          value: "service.$provide.value",
          name: {
            "!type": "string",
            "!url": "http://docs.angularjs.org/api/angular.Module#name",
            "!doc": "Name of the module."
          },
          requires: {
            "!type": "[string]",
            "!url": "http://docs.angularjs.org/api/angular.Module#requires",
            "!doc": "List of module names which must be loaded before this module."
          }
        }
      },
      Promise: {
        "!url": "http://docs.angularjs.org/api/ng.$q",
        "!doc": "Allow for interested parties to get access to the result of the deferred task when it completes.",
        prototype: {
          then: "fn(successCallback: fn(value: ?), errorCallback: fn(reason: ?), notifyCallback: fn(value: ?)) -> +Promise",
          "catch": "fn(errorCallback: fn(reason: ?))",
          "finally": "fn(callback: fn()) -> +Promise",
          success: "fn(callback: fn(data: ?, status: number, headers: ?, config: ?)) -> +Promise",
          error: "fn(callback: fn(data: ?, status: number, headers: ?, config: ?)) -> +Promise"
        }
      },
      Deferred: {
        "!url": "http://docs.angularjs.org/api/ng.$q",
        prototype: {
          resolve: "fn(value: ?)",
          reject: "fn(reason: ?)",
          notify: "fn(value: ?)",
          promise: "+Promise"
        }
      },
      ResourceClass: {
        "!url": "http://docs.angularjs.org/api/ngResource.$resource",
        prototype: {
          $promise: "+Promise",
          $save: "fn()"
        }
      },
      Resource: {
        "!url": "http://docs.angularjs.org/api/ngResource.$resource",
        prototype: {
          get: "fn(params: ?, callback: fn()) -> +ResourceClass",
          save: "fn(params: ?, callback: fn()) -> +ResourceClass",
          query: "fn(params: ?, callback: fn()) -> +ResourceClass",
          remove: "fn(params: ?, callback: fn()) -> +ResourceClass",
          "delete": "fn(params: ?, callback: fn()) -> +ResourceClass"
        }
      },
      service: {
        $anchorScroll: {
          "!type": "fn()",
          "!url": "http://docs.angularjs.org/api/ng.$anchorScroll",
          "!doc": "Checks current value of $location.hash() and scroll to related element."
        },
        $animate: {
          "!url": "http://docs.angularjs.org/api/ng.$animate",
          "!doc": "Rudimentary DOM manipulation functions to insert, remove, move elements within the DOM.",
          addClass: {
            "!type": "fn(element: +Element, className: string, done?: fn()) -> !this",
            "!url": "http://docs.angularjs.org/api/ng.$animate#addClass",
            "!doc": "Adds the provided className CSS class value to the provided element."
          },
          enter: {
            "!type": "fn(element: +Element, parent: +Element, after: +Element, done?: fn()) -> !this",
            "!url": "http://docs.angularjs.org/api/ng.$animate#enter",
            "!doc": "Inserts the element into the DOM either after the after element or within the parent element."
          },
          leave: {
            "!type": "fn(element: +Element, done?: fn()) -> !this",
            "!url": "http://docs.angularjs.org/api/ng.$animate#leave",
            "!doc": "Removes the element from the DOM."
          },
          move: {
            "!type": "fn(element: +Element, parent: +Element, after: +Element, done?: fn()) -> !this",
            "!url": "http://docs.angularjs.org/api/ng.$animate#move",
            "!doc": "Moves element to be placed either after the after element or inside of the parent element."
          },
          removeClass: {
            "!type": "fn(element: +Element, className: string, done?: fn()) -> !this",
            "!url": "http://docs.angularjs.org/api/ng.$animate#removeClass",
            "!doc": "Removes the provided className CSS class value from the provided element."
          }
        },
        $cacheFactory: {
          "!type": "fn(cacheId: string, options?: ?) -> cacheObj",
          "!url": "http://docs.angularjs.org/api/ng.$cacheFactory",
          "!doc": "Factory that constructs cache objects and gives access to them."
        },
        $compile: {
          "!type": "fn(element: +Element, transclude: fn(scope: ?), maxPriority: number)",
          "!url": "http://docs.angularjs.org/api/ng.$compile",
          "!doc": "Compiles a piece of HTML string or DOM into a template and produces a template function."
        },
        $controller: {
          "!type": "fn(controller: fn(), locals: ?) -> ?",
          "!url": "http://docs.angularjs.org/api/ng.$controller",
          "!doc": "Instantiates controllers."
        },
        $document: {
          "!type": "jQuery.fn",
          "!url": "http://docs.angularjs.org/api/ng.$document",
          "!doc": "A jQuery (lite)-wrapped reference to the browser's window.document element."
        },
        $exceptionHandler: {
          "!type": "fn(exception: +Error, cause?: string)",
          "!url": "http://docs.angularjs.org/api/ng.$exceptionHandler",
          "!doc": "Any uncaught exception in angular expressions is delegated to this service."
        },
        $filter: {
          "!type": "fn(name: string) -> fn(input: string) -> string",
          "!url": "http://docs.angularjs.org/api/ng.$filter",
          "!doc": "Retrieve a filter function."
        },
        $http: {
          "!type": "fn(config: ?) -> service.$q",
          "!url": "http://docs.angularjs.org/api/ng.$http",
          "!doc": "Facilitates communication with remote HTTP servers.",
          "delete": "fn(url: string, config?: ?) -> +Promise",
          get: "fn(url: string, config?: ?) -> +Promise",
          head: "fn(url: string, config?: ?) -> +Promise",
          jsonp: "fn(url: string, config?: ?) -> +Promise",
          post: "fn(url: string, data: ?, config?: ?) -> +Promise",
          put: "fn(url: string, data: ?, config?: ?) -> +Promise"
        },
        $interpolate: {
          "!type": "fn(text: string, mustHaveExpression?: bool, trustedContext?: string) -> fn(context: ?) -> string",
          "!url": "http://docs.angularjs.org/api/ng.$interpolate",
          "!doc": "Compiles a string with markup into an interpolation function."
        },
        $locale: {
          "!url": "http://docs.angularjs.org/api/ng.$locale",
          id: "string"
        },
        $location: {
          "!url": "http://docs.angularjs.org/api/ng.$location",
          "!doc": "Parses the URL in the browser address bar.",
          absUrl: {
            "!type": "fn() -> string",
            "!url": "http://docs.angularjs.org/api/ng.$location#absUrl",
            "!doc": "Return full url representation."
          },
          hash: {
            "!type": "fn(value?: string) -> string",
            "!url": "http://docs.angularjs.org/api/ng.$location#hash",
            "!doc": "Get or set the hash fragment."
          },
          host: {
            "!type": "fn() -> string",
            "!url": "http://docs.angularjs.org/api/ng.$location#host",
            "!doc": "Return host of current url."
          },
          path: {
            "!type": "fn(value?: string) -> string",
            "!url": "http://docs.angularjs.org/api/ng.$location#path",
            "!doc": "Get or set the URL path."
          },
          port: {
            "!type": "fn() -> number",
            "!url": "http://docs.angularjs.org/api/ng.$location#port",
            "!doc": "Returns the port of the current url."
          },
          protocol: {
            "!type": "fn() -> string",
            "!url": "http://docs.angularjs.org/api/ng.$location#protocol",
            "!doc": "Return protocol of current url."
          },
          replace: {
            "!type": "fn()",
            "!url": "http://docs.angularjs.org/api/ng.$location#replace",
            "!doc": "Changes to $location during current $digest will be replacing current history record, instead of adding new one."
          },
          search: {
            "!type": "fn(search: string, paramValue?: string) -> string",
            "!url": "http://docs.angularjs.org/api/ng.$location#search",
            "!doc": "Get or set the URL query."
          },
          url: {
            "!type": "fn(url: string, replace?: string) -> string",
            "!url": "http://docs.angularjs.org/api/ng.$location#url",
            "!doc": "Get or set the current url."
          }
        },
        $log: {
          "!url": "http://docs.angularjs.org/api/ng.$log",
          "!doc": "Simple service for logging.",
          debug: {
            "!type": "fn(message: string)",
            "!url": "http://docs.angularjs.org/api/ng.$log#debug",
            "!doc": "Write a debug message."
          },
          error: {
            "!type": "fn(message: string)",
            "!url": "http://docs.angularjs.org/api/ng.$log#error",
            "!doc": "Write an error message."
          },
          info: {
            "!type": "fn(message: string)",
            "!url": "http://docs.angularjs.org/api/ng.$log#info",
            "!doc": "Write an info message."
          },
          log: {
            "!type": "fn(message: string)",
            "!url": "http://docs.angularjs.org/api/ng.$log#log",
            "!doc": "Write a log message."
          },
          warn: {
            "!type": "fn(message: string)",
            "!url": "http://docs.angularjs.org/api/ng.$log#warn",
            "!doc": "Write a warning message."
          }
        },
        $parse: {
          "!type": "fn(expression: string) -> fn(context: ?, locals: ?) -> ?",
          "!url": "http://docs.angularjs.org/api/ng.$parse",
          "!doc": "Converts Angular expression into a function."
        },
        $q: {
          "!type": "fn(executor: fn(resolve: fn(value: ?) -> +Promise, reject: fn(value: ?) -> +Promise)) -> +Promise",
          "!url": "http://docs.angularjs.org/api/ng.$q",
          "!doc": "A promise/deferred implementation.",
          all: {
            "!type": "fn(promises: [+Promise]) -> +Promise",
            "!url": "http://docs.angularjs.org/api/ng.$q#all",
            "!doc": "Combines multiple promises into a single promise."
          },
          defer: {
            "!type": "fn() -> +Deferred",
            "!url": "http://docs.angularjs.org/api/ng.$q#defer",
            "!doc": "Creates a Deferred object which represents a task which will finish in the future."
          },
          reject: {
            "!type": "fn(reason: ?) -> +Promise",
            "!url": "http://docs.angularjs.org/api/ng.$q#reject",
            "!doc": "Creates a promise that is resolved as rejected with the specified reason."
          },
          when: {
            "!type": "fn(value: ?) -> +Promise",
            "!url": "http://docs.angularjs.org/api/ng.$q#when",
            "!doc": "Wraps an object that might be a value or a (3rd party) then-able promise into a $q promise."
          }
        },
        $rootElement: {
          "!type": "+Element",
          "!url": "http://docs.angularjs.org/api/ng.$rootElement",
          "!doc": "The root element of Angular application."
        },
        $rootScope: {
          "!url": "http://docs.angularjs.org/api/ng.$rootScope",
          $apply: {
            "!type": "fn(expression: string)",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$apply",
            "!doc": "Execute an expression in angular from outside of the angular framework."
          },
          $broadcast: {
            "!type": "fn(name: string, args?: ?) -> eventObj",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$broadcast",
            "!doc": "Dispatches an event name downwards to all child scopes."
          },
          $destroy: {
            "!type": "fn()",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$destroy",
            "!doc": "Removes the current scope (and all of its children) from the parent scope."
          },
          $digest: {
            "!type": "fn()",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$digest",
            "!doc": "Processes all of the watchers of the current scope and its children."
          },
          $emit: {
            "!type": "fn(name: string, args?: ?) -> eventObj",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$emit",
            "!doc": "Dispatches an event name upwards through the scope hierarchy."
          },
          $eval: {
            "!type": "fn(expression: string) -> ?",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$eval",
            "!doc": "Executes the expression on the current scope and returns the result."
          },
          $evalAsync: {
            "!type": "fn(expression: string)",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$evalAsync",
            "!doc": "Executes the expression on the current scope at a later point in time."
          },
          $new: {
            "!type": "fn(isolate: bool) -> service.$rootScope",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$new",
            "!doc": "Creates a new child scope."
          },
          $on: {
            "!type": "fn(name: string, listener: fn(event: ?)) -> fn()",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$on",
            "!doc": "Listens on events of a given type."
          },
          $watch: {
            "!type": "fn(watchExpression: string, listener?: fn(), objectEquality?: bool) -> fn()",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$watch",
            "!doc": "Registers a listener callback to be executed whenever the watchExpression changes."
          },
          $watchCollection: {
            "!type": "fn(obj: string, listener: fn()) -> fn()",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$watchCollection",
            "!doc": "Shallow watches the properties of an object and fires whenever any of the properties."
          },
          $id: {
            "!type": "number",
            "!url": "http://docs.angularjs.org/api/ng.$rootScope.Scope#$id",
            "!doc": "Unique scope ID."
          }
        },
        $sce: {
          HTML: "string",
          CSS: "string",
          URL: "string",
          RESOURCE_URL: "string",
          JS: "string",
          getTrusted: "fn(type: string, maybeTrusted: ?) -> !1",
          getTrustedCss: "fn(maybeTrusted: ?) -> !0",
          getTrustedHtml: "fn(maybeTrusted: ?) -> !0",
          getTrustedJs: "fn(maybeTrusted: ?) -> !0",
          getTrustedResourceUrl: "fn(maybeTrusted: ?) -> !0",
          getTrustedUrl: "fn(maybeTrusted: ?) -> !0",
          parse: "fn(type: string, expression: string) -> fn(context: ?, locals: ?) -> ?",
          parseAsCss: "fn(expression: string) -> fn(context: ?, locals: ?) -> ?",
          parseAsHtml: "fn(expression: string) -> fn(context: ?, locals: ?) -> ?",
          parseAsJs: "fn(expression: string) -> fn(context: ?, locals: ?) -> ?",
          parseAsResourceUrl: "fn(expression: string) -> fn(context: ?, locals: ?) -> ?",
          parseAsUrl: "fn(expression: string) -> fn(context: ?, locals: ?) -> ?",
          trustAs: "fn(type: string, value: ?) -> !1",
          trustAsHtml: "fn(value: ?) -> !0",
          trustAsJs: "fn(value: ?) -> !0",
          trustAsResourceUrl: "fn(value: ?) -> !0",
          trustAsUrl: "fn(value: ?) -> !0",
          isEnabled: "fn() -> bool"
        },
        $templateCache: {
          "!url": "https://docs.angularjs.org/api/ng/service/$templateCache",
          "!doc": "The first time a template is used, it is loaded in the template cache for quick retrieval. You can load templates directly into the cache in a script tag, or by consuming the $templateCache service directly.",
          "!proto": "cacheObj"
        },
        $timeout: {
          "!type": "fn(fn: fn(), delay?: number, invokeApply?: bool) -> +Promise",
          "!url": "http://docs.angularjs.org/api/ng.$timeout",
          "!doc": "Angular's wrapper for window.setTimeout.",
          cancel: "fn(promise: +Promise)"
        },
        $window: "<top>",
        $injector: {
          "!url": "http://docs.angularjs.org/api/AUTO.$injector",
          "!doc": "Retrieve object instances as defined by provider.",
          annotate: {
            "!type": "fn(f: fn()) -> [string]",
            "!url": "http://docs.angularjs.org/api/AUTO.$injector#annotate",
            "!doc": "Returns an array of service names which the function is requesting for injection."
          },
          get: {
            "!type": "fn(name: string) -> ?",
            "!url": "http://docs.angularjs.org/api/AUTO.$injector#get",
            "!doc": "Return an instance of a service."
          },
          has: {
            "!type": "fn(name: string) -> bool",
            "!url": "http://docs.angularjs.org/api/AUTO.$injector#has",
            "!doc": "Allows the user to query if the particular service exist."
          },
          instantiate: {
            "!type": "fn(type: fn(), locals?: ?) -> +!0",
            "!url": "http://docs.angularjs.org/api/AUTO.$injector#instantiate",
            "!doc": "Create a new instance of JS type."
          },
          invoke: {
            "!type": "fn(type: fn(), self?: ?, locals?: ?) -> !0.!ret",
            "!url": "http://docs.angularjs.org/api/AUTO.$injector#invoke",
            "!doc": "Invoke the method and supply the method arguments from the $injector."
          }
        },
        $provide: {
          "!url": "https://docs.angularjs.org/api/auto/service/$provide",
          "!doc": "Use $provide to register new providers with the $injector.",
          constant: {
            "!type": "fn(name: string, value: ?) -> !this",
            "!effects": ["custom angular_regField"],
            "!url": "https://docs.angularjs.org/api/auto/service/$provide#constant",
            "!doc": "Register a constant service, such as a string, a number, an array, an object or a function, with the $injector. Unlike value it can be injected into a module configuration function (see angular.Module) and it cannot be overridden by an Angular decorator."
          },
          decorator: {
            "!type": "fn(name: string, decorator: fn())",
            "!effects": ["custom angular_regFieldCall"],
            "!url": "http://docs.angularjs.org/api/AUTO.$provide#decorator",
            "!doc": "Decoration of service, allows the decorator to intercept the service instance creation."
          },
          factory: {
            "!type": "fn(name: string, providerFunction: fn()) -> !this",
            "!effects": ["custom angular_callFactory"],
            "!url": "http://docs.angularjs.org/api/AUTO.$provide#factory",
            "!doc": "A short hand for configuring services if only $get method is required."
          },
          provider: {
            "!type": "fn(name: string, providerType: fn()) -> !this",
            "!effects": ["custom angular_callProvider"],
            "!url": "http://docs.angularjs.org/api/AUTO.$provide#provider",
            "!doc": "Register a provider function with the $injector. Provider functions are constructor functions, whose instances are responsible for 'providing' a factory for a service."
          },
          service: {
            "!type": "fn(name: string, constructor: fn()) -> !this",
            "!effects": ["custom angular_callService"],
            "!url": "http://docs.angularjs.org/api/AUTO.$provide#provider",
            "!doc": "Register a provider for a service."
          },
          value: {
            "!type": "fn(name: string, object: ?) -> !this",
            "!effects": ["custom angular_regField"],
            "!url": "http://docs.angularjs.org/api/AUTO.$providevalue",
            "!doc": "A short hand for configuring services if the $get method is a constant."
          }
        },
        $cookies: {
          "!url": "http://docs.angularjs.org/api/ngCookies.$cookies",
          "!doc": "Provides read/write access to browser's cookies.",
          text: "string"
        },
        $resource: {
          "!type": "fn(url: string, paramDefaults?: ?, actions?: ?) -> +Resource",
          "!url": "http://docs.angularjs.org/api/ngResource.$resource",
          "!doc": "Creates a resource object that lets you interact with RESTful server-side data sources."
        },
        $route: {
          "!url": "http://docs.angularjs.org/api/ngRoute.$route",
          "!doc": "Deep-link URLs to controllers and views.",
          reload: {
            "!type": "fn()",
            "!url": "http://docs.angularjs.org/api/ngRoute.$route#reload",
            "!doc": "Reload the current route even if $location hasn't changed."
          },
          current: {
            "!url": "http://docs.angularjs.org/api/ngRoute.$route#current",
            "!doc": "Reference to the current route definition.",
            controller: "?",
            locals: "?"
          },
          routes: "[?]"
        },
        $sanitize: {
          "!type": "fn(string) -> string",
          "!url": "http://docs.angularjs.org/api/ngSanitize.$sanitize",
          "!doc": "Sanitize HTML input."
        },
        $swipe: {
          "!url": "http://docs.angularjs.org/api/ngTouch.$swipe",
          "!doc": "A service that abstracts the messier details of hold-and-drag swipe behavior.",
          bind: {
            "!type": "fn(element: +Element, handlers: ?)",
            "!url": "http://docs.angularjs.org/api/ngTouch.$swipe#bind",
            "!doc": "Abstracts the messier details of hold-and-drag swipe behavior."
          }
        }
      },
      provider: {
        $anchorScrollProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$anchorScrollProvider",
          "!doc": "Use $anchorScrollProvider to disable automatic scrolling whenever $location.hash() changes.",
          disableAutoScrolling: {
            "!type": "fn()",
            "!doc": "By default, $anchorScroll() will automatically will detect changes to $location.hash() and scroll to the element matching the new hash.\nUse this method to disable automatic scrolling.",
            "!url": "https://docs.angularjs.org/api/ngRoute/provider/$anchorScrollProvider#disableAutoScrolling"
          }
        },
        $animateProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$animateProvider",
          "!doc": "Default implementation of $animate that doesn't perform any animations, instead just synchronously performs DOM updates and calls done() callbacks.",
          register: {
            "!type": "fn(name: string, factory: fn())",
            "!doc": "Registers a new injectable animation factory function. The factory function produces the animation object which contains callback functions for each event that is expected to be animated.",
            "!url": "https://docs.angularjs.org/api/ngRoute/provider/$animateProvider#register"
          },
          classNameFilter: {
            "!type": "fn(expression?: +RegExp)",
            "!doc": "Sets and/or returns the CSS class regular expression that is checked when performing an animation. Upon bootstrap the classNameFilter value is not set at all and will therefore enable $animate to attempt to perform an animation on any element. When setting the classNameFilter value, animations will only be performed on elements that successfully match the filter expression. This in turn can boost performance for low-powered devices as well as applications containing a lot of structural operations.",
            "!url": "https://docs.angularjs.org/api/ngRoute/provider/$animateProvider#classNameFilter"
          }
        },
        $compileProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$compileProvider",
          directive: {
            "!type": "fn(name: string, directiveFactory: []|fn() -> directiveObj) -> !this",
            "!effects": ["custom angular_directive", "custom angular_templateUrl 1"],
            "!url": "http://docs.angularjs.org/api/ng.$compileProvider#directive",
            "!doc": "Register a new directive with the compiler."
          },
          aHrefSanitizationWhitelist: {
            "!type": "fn(regexp?: +RegExp)",
            "!url": "http://docs.angularjs.org/api/ng.$compileProvider#aHrefSanitizationWhitelist",
            "!doc": "Retrieves or overrides the default regular expression that is used for whitelisting of safe urls during a[href] sanitization."
          },
          imgSrcSanitizationWhitelist: {
            "!type": "fn(regexp?: +RegExp)",
            "!url": "http://docs.angularjs.org/api/ng.$compileProvider#imgSrcSanitizationWhitelist",
            "!doc": "Retrieves or overrides the default regular expression that is used for whitelisting of safe urls during img[src] sanitization."
          },
          debugInfoEnabled: {
            "!type": "fn(enabled?: bool)",
            "!url": "http://docs.angularjs.org/api/ng.$compileProvider#debugInfoEnabled",
            "!doc": "Call this method to enable/disable various debug runtime information in the compiler such as adding binding information and a reference to the current scope on to DOM elements."
          }
        },
        $controllerProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$controllerProvider",
          "!doc": "The $controller service is used by Angular to create new controllers. This provider allows controller registration via the register method.",
          register: {
            "!type": "fn(name: string, constructor: fn()|[]) -> !this",
            "!effects": ["custom angular_controller"],
            "!url": "https://docs.angularjs.org/api/ng/provider/$controllerProvider#register",
            "!doc": "This provider allows controller registration via the register method."
          },
          allowGlobals: {
            "!type": "fn()",
            "!url": "https://docs.angularjs.org/api/ng/provider/$controllerProvider#allowGlobals",
            "!doc": "If called, allows $controller to find controller constructors on window"
          }
        },
        $filterProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$filterProvider",
          "!doc": "Filters are just functions which transform input to an output. However filters need to be Dependency Injected. To achieve this a filter definition consists of a factory function which is annotated with dependencies and is responsible for creating a filter function.",
          register: {
            "!type": "fn(name: string, factory: fn())",
            "!url": "https://docs.angularjs.org/api/ng/provider/$filterProvider#register"
          }
        },
        $httpProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$httpProvider",
          "!doc": "Use $httpProvider to change the default behavior of the $http service.",
          useApplyAsync: {
            "!type": "fn(value?: bool) -> !this",
            "!doc": "Configure $http service to combine processing of multiple http responses received at around the same time via $rootScope.$applyAsync. This can result in significant performance improvement for bigger applications that make many HTTP requests concurrently (common during application bootstrap).",
            "!url": "https://docs.angularjs.org/api/ng/provider/$httpProvider#useApplyAsync"
          },
          defaults: {
            "!type": "?",
            "!doc": "Object containing default values for all $http requests.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$httpProvider#defaults"
          }
        },
        $interpolateProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$interpolateProvider",
          "!doc": "Used for configuring the interpolation markup. Defaults to {{ and }}.",
          startSymbol: {
            "!type": "fn(value?: string) -> !this",
            "!doc": "Symbol to denote start of expression in the interpolated string. Defaults to {{.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$interpolateProvider#startSymbol"
          },
          endSymbol: {
            "!type": "fn(value?: string) -> !this",
            "!doc": "Symbol to denote the end of expression in the interpolated string. Defaults to }}.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$interpolateProvider#endSymbol"
          }
        },
        $locationProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$locationProvider",
          "!doc": "Use the $locationProvider to configure how the application deep linking paths are stored.",
          hashPrefix: {
            "!type": "fn(prefix?: string) -> !this",
            "!url": "https://docs.angularjs.org/api/ng/provider/$locationProvider#hashPrefix"
          },
          html5Mode: {
            "!type": "fn(mode?: boolean) -> !this",
            "!doc": "Symbol to denote the end of expression in the locationd string. Defaults to }}.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$locationProvider#html5Mode"
          }
        },
        $logProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$logProvider",
          "!doc": "Use the $logProvider to configure how the application logs messages",
          debugEnabled: {
            "!type": "fn(flag?: bool)",
            "!url": "https://docs.angularjs.org/api/ng/provider/$logProvider#debugEnabled"
          }
        },  
        $parseProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$parseProvider",
          "!doc": "$parseProvider can be used for configuring the default behavior of the $parse service."
        },
        $rootScopeProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$rootScopeProvider",
          "!doc": "Provider for the $rootScope service.",
          digestTtl: {
            "!type": "fn(limit: number)",
            "!doc": "Sets the number of $digest iterations the scope should attempt to execute before giving up and assuming that the model is unstable. The current default is 10 iterations.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$rootScopeProvider#digestTtl"
          }
        },
        $sceDelegateProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$sceDelegateProvider",
          "!doc": "The $sceDelegateProvider provider allows developers to configure the $sceDelegate service. This allows one to get/set the whitelists and blacklists used to ensure that the URLs used for sourcing Angular templates are safe. Refer $sceDelegateProvider.resourceUrlWhitelist and $sceDelegateProvider.resourceUrlBlacklist",
          resourceUrlWhitelist: {
            "!type": "fn(whitelist?: [?]) -> [?]",
            "!doc": "Sets/Gets the whitelist of trusted resource URLs.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$sceDelegateProvider#resourceUrlWhitelist"
          },
          resourceUrlBlacklist: {
            "!type": "fn(blacklist?: [?]) -> [?]",
            "!doc": "Sets/Gets the blacklist of trusted resource URLs.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$sceDelegateProvider#resourceUrlBlacklist"
          }
        },
        $sceProvider: {
          "!url": "https://docs.angularjs.org/api/ng/provider/$sceProvider",
          "!doc": "The $sceProvider provider allows developers to configure the $sce service.",
          enabled: {
            "!type": "fn(value?: bool) -> bool",
            "!doc": "Enables/disables SCE and returns the current value.",
            "!url": "https://docs.angularjs.org/api/ng/provider/$sceProvider#enabled"
          }
        },         
        $routeProvider: {
          "!data": {
            "instance": true
          },
          prototype: {
            "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider",
            "!doc": "Checks current value of $location.hash() and scroll to related element.",
            when: {
              "!type": "fn(path: string, route: routeObj) -> !this",
              "!doc": "Adds a new route definition to the $route service.",
              "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider#when",
              "!effects": ["custom angular_templateUrl 1"]
            },
            otherwise: {
              "!type": "fn(params: string) -> !this",
              "!doc": "Sets route definition that will be used on route change when no other route definition is matched.",
              "!url": "https://docs.angularjs.org/api/ngRoute/provider/$routeProvider#otherwise"
            }
          }
        }  
      }
    },
    angular: {
      bind: {
        "!type": "fn(self: ?, fn: fn(), args?: ?) -> !custom:angular_bind",
        "!url": "http://docs.angularjs.org/api/angular.bind",
        "!doc": "Returns a function which calls function fn bound to self."
      },
      bootstrap: {
        "!type": "fn(element: +Element, modules?: [string]) -> service.$injector",
        "!url": "http://docs.angularjs.org/api/angular.bootstrap",
        "!doc": "Use this function to manually start up angular application."
      },
      copy: {
        "!type": "fn(source: ?, target?: ?) -> !0",
        "!url": "http://docs.angularjs.org/api/angular.copy",
        "!doc": "Creates a deep copy of source, which should be an object or an array."
      },
      element: {
        "!type": "fn(element: +Element) -> jQuery.fn",
        "!url": "http://docs.angularjs.org/api/angular.element",
        "!doc": "Wraps a raw DOM element or HTML string as a jQuery element."
      },
      equals: {
        "!type": "fn(o1: ?, o2: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.equals",
        "!doc": "Determines if two objects or two values are equivalent."
      },
      extend: {
        "!type": "fn(dst: ?, src: ?) -> !0",
        "!url": "http://docs.angularjs.org/api/angular.extend",
        "!doc": "Extends the destination object dst by copying all of the properties from the src object(s) to dst."
      },
      forEach: {
        "!type": "fn(obj: ?, iterator: fn(value: ?, key: ?), context?: ?) -> !0",
        "!effects": ["call !1 this=!2 !0.<i> number"],
        "!url": "http://docs.angularjs.org/api/angular.forEach",
        "!doc": "Invokes the iterator function once for each item in obj collection, which can be either an object or an array."
      },
      fromJson: {
        "!type": "fn(json: string) -> ?",
        "!url": "http://docs.angularjs.org/api/angular.fromJson",
        "!doc": "Deserializes a JSON string."
      },
      identity: {
        "!type": "fn(val: ?) -> !0",
        "!url": "http://docs.angularjs.org/api/angular.identity",
        "!doc": "A function that returns its first argument."
      },
      injector: {
        "!type": "fn(modules: [string]) -> service.$injector",
        "!url": "http://docs.angularjs.org/api/angular.injector",
        "!doc": "Creates an injector function"
      },
      isArray: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isArray",
        "!doc": "Determines if a reference is an Array."
      },
      isDate: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isDate",
        "!doc": "Determines if a reference is a date."
      },
      isDefined: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isDefined",
        "!doc": "Determines if a reference is defined."
      },
      isElement: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isElement",
        "!doc": "Determines if a reference is a DOM element."
      },
      isFunction: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isFunction",
        "!doc": "Determines if a reference is a function."
      },
      isNumber: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isNumber",
        "!doc": "Determines if a reference is a number."
      },
      isObject: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isObject",
        "!doc": "Determines if a reference is an object."
      },
      isString: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isString",
        "!doc": "Determines if a reference is a string."
      },
      isUndefined: {
        "!type": "fn(val: ?) -> bool",
        "!url": "http://docs.angularjs.org/api/angular.isUndefined",
        "!doc": "Determines if a reference is undefined."
      },
      lowercase: {
        "!type": "fn(val: string) -> string",
        "!url": "http://docs.angularjs.org/api/angular.lowercase",
        "!doc": "Converts the specified string to lowercase."
      },
      module: {
        "!type": "fn(name: string, deps: [string]) -> !custom:angular_module",
        "!url": "http://docs.angularjs.org/api/angular.module",
        "!doc": "A global place for creating, registering and retrieving Angular modules."
      },
      Module: "Module",
      noop: {
        "!type": "fn()",
        "!url": "http://docs.angularjs.org/api/angular.noop",
        "!doc": "A function that performs no operations."
      },
      toJson: {
        "!type": "fn(val: ?) -> string",
        "!url": "http://docs.angularjs.org/api/angular.toJson",
        "!doc": "Serializes input into a JSON-formatted string."
      },
      uppercase: {
        "!type": "fn(string) -> string",
        "!url": "http://docs.angularjs.org/api/angular.uppercase",
        "!doc": "Converts the specified string to uppercase."
      },
      version: {
        "!url": "http://docs.angularjs.org/api/angular.version",
        full: "string",
        major: "number",
        minor: "number",
        dot: "number",
        codename: "string"
      }
    }
  };
  
  // Angular query type.
  
  var querySubTypes = {
    completions: {
      run: findCompletionsEL
    },
    definition: {
      run: findDef
    },
    type: {
      run: findType
    }
  }
  
  tern.defineQueryType("angular", {
    run : function(server, query) {
      var subtype = query.subtype;
      if (subtype == null) throw ternError("missing .query.subtype field");
      var angularTypes = query.angularTypes;
      if (angularTypes == null) throw ternError("missing .query.angularTypes field");
      var expression = query.expression;
      if (expression == null) throw ternError("missing .query.expression field");
      var scope = query.scope;
      var _angular = server.cx.parent.mod.angular;
      if (_angular == null) throw ternError("missing server.cx.parent._angular");
      
      return querySubTypes[subtype].run(_angular, expression, scope,
          angularTypes, query);
    }
  });
  
  // Utils
  
  function startsWithString(str, token) {
    return str.slice(0, token.length).toUpperCase() == token.toUpperCase();
  }
  
  function getType(elt, name, isArray) {
    if (elt.props && elt.props[name]) {
      var obj = elt.props[name];
      var type = obj.getType(true);
      if (type) {
        if (isArray) {
          if (type.name == 'Array') {
            return type.getProp("<i>").getType();
          }
        } else return type;
      }
    } else if (elt.getType && elt.getType()) {
      var type = elt.getType().getProp(name);
      if (type) {
        if (isArray) {
          return type.getProp("<i>").getType();          
        } else return type;
      }
    }
    var forward = elt.forward;
    if (forward) {
      for ( var i = 0; i < forward.length; i++) {
        var f = forward[i];
        var prop = f.prop;
        if (prop === name) {
          var type = f.type;
          if (type) {
            if (isArray) {
              if (type.name == 'Array') {
                var itemType = type.getProp("<i>").getType();
                if (itemType) return itemType;
              }
            } else return type;
          }
        }
      }
    }
  }

  function getExpressionType(root, controllerAs, context, index, scopeProps, isArray) {
    var obj = root, prop = context[index];
    if (index == 0) {
      var ngRepeat = scopeProps && scopeProps[prop] && scopeProps[prop].ngRepeat;
      if (ngRepeat) {
        obj = getExpressionType(root, controllerAs, ngRepeat.split("."), 0, null, true); 
        index++;
      } else if (controllerAs) {
        index++;
        if(controllerAs != prop) obj = null;
      }
    }
    if (obj) {
      for ( var i = index; i < context.length; i++) {
        var prop = context[i];
        if (obj) obj = getType(obj, prop, isArray);
      }
    }
    return obj;
  }
  
  // Angular Modules query
  
  function findModule(_angular, moduleName) {
    var module = _angular.modules[moduleName];
    // check if module exists, which is not excluded and matches teh current file.
    if (module && module.excluded != true) return module;      
  }

  function visitModules(_angular, c) {
    for ( var moduleName in _angular.modules) {
      var module = _angular.modules[moduleName];
      // check if module exists, which is not excluded and matches teh current file.
      if (module.excluded != true) {
        if (c(moduleName, module))
          break;
      }
    }
  }  
  
  // Angular Controllers query  

  function getScopeArg(fnType) {
    if (fnType) {
      var argNames = fnType.argNames;
      if (argNames) {
        var args = fnType.args;
        var arg = null;
        for ( var j = 0; j < argNames.length; j++) {
          if (argNames[j] == "$scope") {
            return args[j];
          }
        }
      }
    }
  }

  function getScopeController(_angular, moduleName, controllerName) {
    if (moduleName) {
      var module = findModule(_angular, moduleName);
      if (module) {
        var fields = module.injector.fields, field = fields[controllerName];
        if (field && field.type === "controller") {
          var fnType = field.fnType;
          var scopeArg = getScopeArg(fnType);
          if (scopeArg) return scopeArg
          var result = new infer.AVal;
          var self = new infer.AVal;
          fnType.propagate(new infer.IsCtor(self));
          self.propagate(result, 90);
          fnType.propagate(new infer.IsCallee(self, [], null, new infer.IfObj(result)));
          return result;
        }
      }
    } else {
      var topScope = infer.cx().topScope, props = topScope.props;
      if (props) {
        var item = props[controllerName];
        if (item && item.types && item.types.length > 0) {
          for ( var i = 0; i < item.types.length; i++) {
            var fnType = item.types[i], scopeArg = getScopeArg(fnType);
            if (scopeArg) return scopeArg;            
          }          
        }
      }
    }
    return null;
  }
  
  function visitModuleControllers(_angular, moduleName, c) {
    var found = false;
    var module = findModule(_angular, moduleName);
    if (module) {
      var fields = module.injector.fields;
      for ( var fieldName in fields) {
        var field = fields[fieldName];
        if (field.type === "controller") {
          var fnType = field.fnType;
          var scopeArg = getScopeArg(fnType);
          //if (scopeArg) {
            found = true;
            if (c(fieldName, field.originNode, fnType, scopeArg)) break;
          //}
        }
      }
    }
    return found;
  }
  
  function visitGlobalControllers(_angular, c) {
    var topScope = infer.cx().topScope, stop = false, props = topScope.props;
    if (props) {
      for ( var prop in props) {
        if (prop != "<i>") {
          if (stop)
            break;
          var item = props[prop];
          if (item.types && item.types.length > 0) {
            for ( var i = 0; i < item.types.length; i++) {
              if (stop)
                break;
              var fnType = item.types[i];
              var scopeArg = getScopeArg(fnType);
              if (scopeArg) {
                stop = (c(fnType.name, fnType.originNode.id, fnType,
                    scopeArg));
              }
            }
          }
        }
      }
    }
  }

  function visitControllers(_angular, moduleName, c) {
    var found = false;
    if (moduleName) {
      // find controllers of given module
      found = visitModuleControllers(_angular, moduleName, c);
    } 
    if (!found) {
      // find global controllers of the given file
      visitGlobalControllers(_angular, c);
    }
  }

  // Angular directive query

  function visitDirectives(_angular, moduleName, c) {
    if (moduleName) {
      var module = findModule(_angular, moduleName);
      if (module) {
        var directives = module.directives;
        if (directives) {
          for ( var name in directives) {
            var directive = directives[name];
            if (c(name, directive)) break;
          }
        }
      }
    }    
  }
  
  // Angular filter query

  function visitFilters(_angular, moduleName, c) {
    if (moduleName) {
      var module = findModule(_angular, moduleName);
      if (module) {
        var filters = module.filters;
        if (filters) {
          for ( var name in filters) {
            var filter = filters[name];
            if (c(name, filter.originNode, filter.type)) break;
          }
        }
      }
    }    
  }

  // Angular factory query

  function visitFactories(_angular, moduleName, c) {
    if (moduleName) {
      var module = findModule(_angular, moduleName);
      if (module) {
        var factories = module.factories;
        if (factories) {
          for ( var name in factories) {
            var factory = factories[name];
            if (c(name, factory.originNode, factory.type)) break;
          }
        }
      }
    }    
  }

  // Angular provider query

  function visitProviders(_angular, moduleName, c) {
    if (moduleName) {
      var module = findModule(_angular, moduleName);
      if (module) {
        var providers = module.providers;
        if (providers) {
          for ( var name in providers) {
            var provider = providers[name];
            if (c(name, provider.originNode, provider.type)) break;
          }
        }
      }
    }    
  }

  // Angular service query

  function visitServices(_angular, moduleName, c) {
    if (moduleName) {
      var module = findModule(_angular, moduleName);
      if (module) {
        var services = module.services;
        if (services) {
          for ( var name in services) {
            var service = services[name];
            if (c(name, service.originNode, service.type)) break;
          }
        }
      }
    }    
  }
  // Angular model query
  
  function findModels(scopeCtrl, c) {
          if (scopeCtrl) {
                  var forward = scopeCtrl.forward;
                  if (forward) {
                          for ( var i = 0; i < forward.length; i++) {
                                if (c(forward[i])) break;                               
                        }
                  }
          }
  }  
  
  function maybeSet(obj, prop, val) {
    if (val != null) obj[prop] = val;
  }
  
  function createContext(expression, end) {
    var word = '', current = '', context = null;
    var length = end ? end : expression.length;
    for (var i = length - 1; i >= 0; i--) {
      if (acorn.isIdentifierChar(expression.charCodeAt(i)))
        current = expression.charAt(i) + current;
      else if (expression.charAt(i) === '.') {
        if (context)
          context.unshift(current);
        else {
          word = current;
          context = [];
        }
        current = '';
      } else {
        break;
      }
    }
    if (context)
      context.unshift(current);
    else
      word = current;
    if (end && expression.length > end) {
      for (var i = end; i  < expression.length; i++) {
        if (acorn.isIdentifierChar(expression.charCodeAt(i))) {
          word+=expression.charAt(i);
        } else {
          break;
        }
      }
    }
    return {"word": word, "context": context};    
  }
  
  // angular "compeltions" query type
  
  function findCompletionsEL(_angular, expression, scope, angularTypes,
      query) {
    var completions = [];
    var result = {
      "completions" : completions
    }
    var cxt = createContext(expression), word = cxt.word, context = cxt.context;
    var end = expression.length, start = end - word.length;
    result.start = start;
    result.end = end;

    if (query.caseInsensitive) word = word.toLowerCase();
    var wrapAsObjs = true;//query.types || query.depths || query.docs || query.urls || query.origins;
    
    function createCompletionIfMatch(prop, obj, module, angularType) {
      if (startsWithString(prop, word)) {
        var completion = createCompletion(prop, obj, scope, query, module, angularType);
        completions.push(completion);
        return completion;
      }
    }

    function completionDirectives(_angular, moduleName) {
      visitDirectives(_angular, moduleName, function(name, directive) {
        var fnType = directive.fnType, objType = directive.getRetObjType(), completion = createCompletionIfMatch(name, fnType, moduleName, 'directive');        
        if (completion && objType) {
          var properties = objType.originNode.properties;
          for ( var i = 0; i < properties.length; i++) {
            var p = properties[i];
            if (p.key.name === 'restrict' && p.value.type === 'Literal') {
              completion.restrict = p.value.value;
            }
          }
        }
      });
    }
    var moduleName = scope ? scope.module : null, controllerName;
    
    function gather(prop, obj, depth, useObjAsVal) {
      // 'hasOwnProperty' and such are usually just noise, leave them
      // out when no prefix is provided.
      //if (query.omitObjectPrototype !== false && obj == srv.cx.protos.Object && !word) return;
      if (query.filter !== false && word &&
          (query.caseInsensitive ? prop.toLowerCase() : prop).indexOf(word) != 0) return;

      var val = null;
      if (obj) val =  useObjAsVal ? obj : obj.props[prop];
      if (!val) val = infer.ANull;

      for (var i = 0; i < completions.length; ++i) {
        var c = completions[i];
        if ((wrapAsObjs ? c.name : c) == prop) {
          if (c.type === '?' || c.type === '[?]') {
            infer.resetGuessing();
            var type = val.getType();            
            //if (query.types)
            c.type= infer.toString(type);
          }
          return;
        }
      }
      var rec = wrapAsObjs ? {name: prop} : prop;
      completions.push(rec);

      //if (query.types || query.docs || query.urls || query.origins) {
        infer.resetGuessing();
        var type = val.getType();
        rec.guess = infer.didGuess();
        //if (query.types)
          rec.type = infer.toString(type);
        //if (query.docs)
          maybeSet(rec, "doc", val.doc || type && type.doc);
        //if (query.urls)
          maybeSet(rec, "url", val.url || type && type.url);
        //if (query.origins)
          maybeSet(rec, "origin", val.origin || type && type.origin);
      //}
      if (query.depths) rec.depth = depth;
      if (moduleName) rec.module = moduleName;
      if (controllerName) rec.controller = controllerName;
    }

   for ( var i = 0; i < angularTypes.length; i++) {
    var angularType = angularTypes[i];
 
      switch (angularType) {
      case 'module':
        // find modules
        visitModules(_angular, function(moduleName, module) {
          createCompletionIfMatch(moduleName, module, moduleName, 'module')
        });
        break;
      case 'controller':
        // find controller
        visitControllers(_angular, moduleName, function(name, node,
            fnType, scopeArg) {
          createCompletionIfMatch(name, fnType, moduleName, 'controller')
        });
        break;
      case 'directive':
        // find directives for a module
        completionDirectives(_angular, moduleName);
        break;
      case 'directives':
        // find directives for the all modules.
        for (var moduleName in _angular.modules) {
          if (_angular.modules[moduleName].excluded != true) completionDirectives(_angular, moduleName);
        }
        break;
      case 'filter':
        // find filters for a module
        visitFilters(_angular, moduleName, function(name, node,
            fnType) {
          createCompletionIfMatch(name, fnType, moduleName, 'filter')
        });
        break;  
      case 'factory':
        // find factories for a module
        visitFactories(_angular, moduleName, function(name, node,
            fnType) {
          createCompletionIfMatch(name, fnType, moduleName, 'factory')
        });
        break;   
      case 'provider':
        // find providers for a module
        visitProviders(_angular, moduleName, function(name, node,
            fnType) {
          createCompletionIfMatch(name, fnType, moduleName, 'provider')
        });
        break;
      case 'service':
        // find services for a module
        visitServices(_angular, moduleName, function(name, node,
            fnType) {
          createCompletionIfMatch(name, fnType, moduleName, 'service')
        });
        break;                   
      default:
  
        var controllers = scope.controllers, scopeProps = scope.props;
        if (controllers) {
          for ( var j = 0; j < controllers.length; j++) {
            var controller = getControllerInfo(controllers[j]);
            controllerName = controller.name;
            var controllerAs = controller.as;
            var scopeCtrl = getScopeController(_angular, moduleName,
                controllerName);
            if (scopeCtrl) {
              // $scope exists.
              if (context) {
                // expression with '.'
                var root  = getExpressionType(scopeCtrl, controllerAs, context, 0, scopeProps);                
                if (root) {
                  if (root === scopeCtrl) {
                    // properties/methods of $scope
                    forAllPropertiesOfScope(scopeCtrl, 'type', gather);
                  } else {
                    infer.forAllPropertiesOf(root, gather);
                  }
                }
              } else {
                // simple expression                
                if (scopeProps) {
                  for ( var prop in scopeProps) {
                    if (startsWithString(prop, word)) {
                      var obj = null;
                      var ngRepeat = scopeProps && scopeProps[prop] && scopeProps[prop].ngRepeat;
                      if (ngRepeat) {
                        // case when ngRepeat;
                        obj = getExpressionType(scopeCtrl, controllerAs, ngRepeat.split("."), 0, scopeProps, true);                   
                      }
                      gather(prop, obj, null, true);
                    }
                  }
                }
                
                if (controllerAs) {
                  gather(controllerAs, scopeCtrl, null, true);
                } else {
                  // properties/methods of $scope
                  forAllPropertiesOfScope(scopeCtrl, 'type', gather);
                }
              }
            }
          }
        }
        
        if (!context && scopeProps) {
          // case when ngModel defines a simple variable (which cannot be defined in the $scope).
          for ( var prop in scopeProps) {
              if (!scopeProps[prop].ngRepeat) gather(prop, null, null, true);
          }
        }
        // $rootScope of module
        if (moduleName) {
          var module = findModule(_angular, moduleName)
          if (module && module.rootScope) {
            infer.forAllPropertiesOf(module.rootScope, gather);
            module.rootScope.guessProperties(gather);
          }
        }
        break;
      }
    }
    return result;
  }
  
  function forAllPropertiesOfScope(scopeCtrl, forwardProp, gather) {
    var scopeType = scopeCtrl.getType(true);
    if (scopeType) infer.forAllPropertiesOf(scopeType, gather);
    else {
      findModels(scopeCtrl, function(forward) {
        var prop = forward.prop;
        if (prop && forward[forwardProp]) {
          if (gather(prop, forward[forwardProp], null, true)) return true;
        }
      });
    }
  }
  
  function getControllerInfo(nameAndAs) {
    var name = nameAndAs, as = null, index = nameAndAs.indexOf(' as');
    if (index != -1) {
      name = nameAndAs.substring(0, index);
      as = nameAndAs.substring(index + 3, nameAndAs.length).trim();
    }
    return {"name" : name, "as" : as};
  }
  
  function createCompletion(name, node, scope, query, module, angularType) {
          var completion = {"name" : name};
          if (node) {
                  var type = infer.toString(node);
                  if (type) completion.type = type;
                  var origin = node.origin;
                  if (origin) completion.origin = origin;
          } else {
                  completion.type = "?";
          }
          if (module) completion.module = module;
          if (angularType) completion.angularType = angularType;     
          return completion;
  }
  
  function findDef(_angular, expression, scope, angularTypes, query) {
          var angularType = angularTypes[0], context = null;
          var node = null;
          var cxt = createContext(expression, query.end), word = cxt.word, context = cxt.context;
          var moduleName = scope ? scope.module : null, controllerName;
          
          function gather(prop, obj, depth, useObjAsVal) {
            if (prop === word) {
              var val = null;
              if (obj) val =  useObjAsVal ? obj : obj.props[prop];
              if (val) node = (val.originNode) ? val.originNode : val;
              return node != null;
            }
          }
          
          switch (angularType) {
                case 'module':
                        // find modules
                        visitModules(_angular, function(moduleName, module) {
                                if (moduleName == expression) {
                                        node = module.originNode;
                                        return true;
                                }
                        });               
                        break;
                case 'controller':
                  var moduleName = scope ? scope.module : null;
                        visitControllers(_angular, moduleName, function(name, n, fnType, scopeArg) {
                                if (name == expression) {
                                        node = n;
                                        return true;
                                }
                        });
                        break;
                case 'directive':
                  var moduleName = scope ? scope.module : null;
                  visitDirectives(_angular, moduleName, function(name, directive) {
                    if (name == expression) {
                      node = directive.originNode;
                      return true;
                    }
                  });
                  break; 
                case 'filter':
                  var moduleName = scope ? scope.module : null;
                  visitFilters(_angular, moduleName, function(name, n, fnType) {
                    if (name == expression) {
                      node = n;
                      return true;
                    }
                  });
                  break;  
                case 'factory':
                  var moduleName = scope ? scope.module : null;
                  visitFactories(_angular, moduleName, function(name, n, fnType) {
                    if (name == expression) {
                      node = n;
                      return true;
                    }
                  });
                  break;
                case 'provider':
                  var moduleName = scope ? scope.module : null;
                  visitProviders(_angular, moduleName, function(name, n, fnType) {
                    if (name == expression) {
                      node = n;
                      return true;
                    }
                  });
                  break;       
                case 'service':
                  var moduleName = scope ? scope.module : null;
                  visitServices(_angular, moduleName, function(name, n, fnType) {
                    if (name == expression) {
                      node = n;
                      return true;
                    }
                  });
                  break;                  
                default:
                  
                  var controllers = scope.controllers, scopeProps = scope.props;
                  if (controllers) {
                    for ( var j = 0; j < controllers.length; j++) {
                      var controller = getControllerInfo(controllers[j]), controllerName = controller.name;
                      var controllerAs = controller.as;
                      var scopeCtrl = getScopeController(_angular, moduleName,
                          controllerName);
                      if (scopeCtrl) {
                        // $scope exists.
                        if (context) {
                          // expression with '.'
                          var root  = getExpressionType(scopeCtrl, controllerAs, context, 0, scopeProps);                
                          if (root) {
                              // properties/methods of $scope
                              forAllPropertiesOfScope(root, 'originNode', gather);                            
                          }
                        } else {
                          // simple expression                
                          if (scopeProps) {
                            for ( var prop in scopeProps) {
                              if (prop ===  word) {
                                var obj = null;
                                var ngRepeat = scopeProps && scopeProps[prop] && scopeProps[prop].ngRepeat;
                                if (ngRepeat) { 
                                  // case when ngRepeat;
                                  obj = getExpressionType(scopeCtrl, controllerAs, ngRepeat.split("."), 0, scopeProps, true);                   
                                }
                                gather(prop, obj, null, true);
                              }
                            }
                          }
                          
                          if (!node) {
                            if (controllerAs) {
                              gather(controllerAs, scopeCtrl, null, true);
                            } else {
                              // properties/methods of $scope
                              forAllPropertiesOfScope(scopeCtrl, 'originNode', gather);
                            }
                          }
                        }
                      }
                    }
                  }
                        break;
          }
          if (node && node.sourceFile) {
                  return {file: node.sourceFile.name, start: node.start, end: node.end};
          }
          return {};
  }
  


  function findType(_angular, expression, scope, angularTypes, query) {
    var angularType = angularTypes[0];
    var type, name, origin, mod = null;
    var cxt = createContext(expression, query.end), word = cxt.word, context = cxt.context;
    var moduleName = scope ? scope.module : null, controllerName;

    function gather(prop, obj, depth, useObjAsVal) {
      if (prop === word) {
        var val = null;
        if (obj) val =  useObjAsVal ? obj : obj.props[prop];
        if (val) type = val.getType();
        if (type) {
          mod = moduleName;
          name = prop;
        }
        return type != null;
      }
    }
    
    switch (angularType) {
      case 'module':
          // find modules
          visitModules(_angular, function(moduleName, module) {
            if (moduleName == expression) {
              name = moduleName;
              type = module;
              mod = moduleName;
              return true;
            }
          });
          break;
        case 'controller':
          var moduleName = scope.module;
          visitControllers(_angular, moduleName, function(n, node,
              fnType, scopeArg) {
            if (n == expression) {
              name = n;
              type = fnType;
              mod = moduleName;
              return true;
            }
          });
          break;
        case 'directive':
          var moduleName = scope.module;
          visitDirectives(_angular, moduleName, function(n, directive) {
            if (n == expression) {
              name = n;
              // TODO type = fnType;
              mod = moduleName;
              return true;
            }
          });
          break;
          
      default:
        var controllers = scope.controllers, scopeProps = scope.props;
        if (controllers) {
          for ( var j = 0; j < controllers.length; j++) {
            var controller = getControllerInfo(controllers[j]), controllerName = controller.name;
            var controllerAs = controller.as;
            var scopeCtrl = getScopeController(_angular, moduleName,
                controllerName);
            if (scopeCtrl) {
              // $scope exists.
              if (context) {
                // expression with '.'
                var root  = getExpressionType(scopeCtrl, controllerAs, context, 0, scopeProps);                
                if (root) {
                    // properties/methods of $scope
                    forAllPropertiesOfScope(root, 'type', gather);                            
                }
              } else {
                // simple expression                
                if (scopeProps) {
                  for ( var prop in scopeProps) {
                    if (prop ===  word) {
                      var obj = null, ngRepeat = scopeProps && scopeProps[prop] && scopeProps[prop].ngRepeat;
                      if (ngRepeat) obj = getExpressionType(scopeCtrl, controllerAs, ngRepeat.split("."), 0, scopeProps, true);                                         
                      gather(prop, obj, null, true);
                    }
                  }
                }
                
                if (!type) {
                  if (controllerAs) {
                    gather(controllerAs, scopeCtrl, null, true);
                  } else {
                    // properties/methods of $scope
                    forAllPropertiesOfScope(scopeCtrl, 'type', gather);
                  }
                }
              }
            }
          }
        }
          break;
        }
        if (type) {
          var result = {
            type : infer.toString(type),
            name : name,
            origin : type.origin,
            angularType : angularType
          }
          if (mod) result.module = mod;
          return result;
        }
        return {};
      }

  // angular "outline" query type
  
  function createOutline(server) {
    var angular = server.mod.angular, mods = angular.modules, outline = [];
    for (var name in mods) mods[name].toJSON(outline);
    return {outline: outline};
  }

  tern.defineQueryType("angular-outline", {
    run : function(server, query) {
      return createOutline(server);
    }    
  });
  
  function ternError(msg) {
    var err = new Error(msg);
    err.name = "TernError";
    return err;
  }
  
});
