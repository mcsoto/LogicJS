(function() {

//utils
function assert(x,str) {
	if (x===false) throw new Error(str)
}

inherit = function (P,Q){
	P.prototype = new Q()
	P.prototype.constructor = P
}

var logic = {}

/*
	lists
*/

function List(a,b) {
	this.first = a
	this.rest = b
	this.type = 'list'
}

List.prototype = {
	is_empty : function () {
		var s = this
		return typeof s.rest === 'undefined'
	}
	,append : function (s2) {
		var s1 = this
		if (s1.is_empty()) 
			return s2
		else 
			return logic.make_list(s1.first, s1.append(s2));
	}
	,interleave : function (s2) {
		var s1 = this
		if (s1.is_empty())
			return s2
		else
			return logic.make_list(s1.first, s2.interleave(s1.rest));
	}
	,forEach : function (f) {
		var s = this
		if(s.is_empty()) return;
		else {
			f(s.first)
			s.rest.forEach(f)
		}
	}
	,foldr : function (f, initial) {
		var s=this
		if (s.is_empty()) {
			return initial
		}
		else {
			return f(s.first, s.rest.foldr(f, initial))
		}
	}
	,map : function (f) {
		var s=this
		if(s.is_empty())
			return EMPTY_STREAM
		else {
			var _rest = s.rest.map(f)
			return logic.make_list(f(s.first), _rest);
		}
	 }
	,extend : function (val) {
		return logic.make_list(val, this)
	}
	,toString : function() {
		var str = '|'
		var s=this
		while(!s.is_empty()) {
			str += s.first.toString()+(s.rest.is_empty()?'':'; ')
			s=s.rest
		}
		str+='|'
		return str
	}
	,write : function () {
		write(this.toString())
	}
}


/*
	packages hold a **frame** and a **constraint store**
*/

function Package(f, cs) {
	this.frame = f
	this.store = cs
	this.type = 'package'
}

Package.prototype.lookup_binding_helper = function (frame, variable) {
	if(frame===EMPTY_LIST) return false
	else if(frame.first.variable===variable) return frame.first
	else return this.lookup_binding_helper(frame.rest, variable)
}

Package.prototype.lookup_binding = function (variable) {
	return this.lookup_binding_helper(this.frame, variable)
}

Package.prototype.is_empty = function (arguments) {
	return this.frame.is_empty(arguments)
}

Package.prototype.extend_frame = function (f) {
	return logic.make_package(f, this.store)
}

Package.prototype.extend_store = function (cs) {
	return logic.make_package(this.frame, cs)
}

Package.prototype.extend = function (arguments) {
	return logic.make_package(this.frame.extend(arguments), this.store)
}

Package.prototype.toString = function() {
	var str = '{'+this.frame.toString()+', '+this.store+'}'
	return str
}

Package.prototype.write = function () {
	write(this.toString())
}

/*
	streams
*/

function Stream(a,b) {
	this.first = a
	this.rest = b
	this.type = 'stream'
}

Stream.prototype = {
	is_empty : function () {
		var s = this
		return typeof s.rest === 'undefined'
	}
	,iterate : function (f, j, i) {
		var s = this
		i = i||0
		if(i>=j || s.is_empty()) return;
		else {
			f(s.first)
			s.rest().iterate(f,j,i+1)
		}
	}
	,forEach : function (f) {
		var s = this
		if(s.is_empty()) return;
		else {
			f(s.first)
			s.rest().iterate(f)
		}
	}
	,foldr : function (f, initial) {
		var s=this
		if (s.is_empty()) {
			return initial
		}
		else {
			return f(s.first, s.rest().foldr(f, initial))
		}
	}
	,map : function (f) {
		var s=this
		if(s.is_empty())
			return EMPTY_STREAM
		else {
			var _rest = s.rest().map(f)
			return logic.make_stream(f(s.first), function() { return _rest; });
		}
	 }
	 ,flatten : function () {
		var s = this
		if (s.is_empty())
			return s
		else if(logic.is_stream(s.first)) {
			var s1 = s.first
				,s2 = s.rest()
			return (s1).append(s2.flatten());
		}
		else
			return logic.make_stream(s.first).append(s.rest().flatten())
	}
	,append : function (s2) {
		var s1 = this
		if (s1.is_empty()) 
			return s2
		else
			return logic.make_stream(s1.first, function() { return s1.rest().append(s2); });
	}
	,interleave : function (s2) {
		var s1 = this
		if (s1.is_empty())
			return s2
		else
			return logic.make_stream(s1.first, function() { 
				return s2.interleave(s1.rest());
			});
	}
	,extend : function (val) {
		var frame=this
		return logic.make_stream(val, function() { return frame; });
	}
	,toString : function() {
		var str = '('
		var s=this
		while(!s.is_empty()) {
			str += s.first.toString()+(s.rest().is_empty()?'':', ')
			s=s.rest()
		}
		str+=')'
		return str
	}
	,write : function () {
		write(this.toString())
	}
}

/*
	bindings
*/

function Binding(variable, val) {
	//frame is a list of bindings
	this.variable = variable
	this.val = val
	this.type = 'binding'
}

Binding.prototype.toString = function () { return (typeof this.variable.name!=='undefined'?this.variable.name:'_') + '=' + this.val.toString() }

/*
	types
*/

var EMPTY_STREAM = new Stream(undefined, undefined)
var EMPTY_LIST = new List(undefined, undefined)
var EMPTY_PACKAGE = new Package(EMPTY_LIST, EMPTY_LIST)

logic.nil = EMPTY_PACKAGE //a goal needs a package; therefore it initially receives 'nil' (the first package)
logic.EMPTY_STREAM = EMPTY_STREAM
logic.EMPTY_LIST = EMPTY_LIST

function has_type(obj, type) {
	return (typeof obj==='object') && (typeof obj.type!=='undefined') && obj.type===type
}

logic.is_stream = function (v) {
	return has_type(v, 'stream')
}

logic.is_list = function (v) {
	return has_type(v, 'list')
}

logic.is_package = function (v) {
	return has_type(v, 'package')
}

logic.is_binding = function (v) {
	return has_type(v, 'binding')
}

logic.is_lvar = function (v) {
	return has_type(v, 'lvar')
}

logic.is_array = function (v) {
	return Object.prototype.toString.call( v ) === '[object Array]'
}

logic.is_object = function (v) {
	return Object.prototype.toString.call( v ) === '[object Object]'
}

logic.lvar = function (name) { //name is optional (for debugging)
	return {type : 'lvar', name : name} 
}

logic.make_binding = function (variable, val, name) {
	var b = new Binding(variable, val)
	return b
}

logic.make_stream = function (a,b) {
	if(typeof b==='undefined') b = function() { return EMPTY_STREAM; }
	assert(typeof b==='function', '#2 argument must be function.')
	return new Stream(a,b)
}

logic.make_list = function (a,b) {
	if(typeof b==='undefined') b = EMPTY_LIST
	assert(typeof b==='object', '#2 argument must be object.')
	return new List(a,b)
}

logic.make_package = function (f, cs) {
	assert(logic.is_list(f) && logic.is_list(cs), "#1 and #2 arguments of package must be list")
	return new Package(f,cs)
}

logic.unify = function (a, b, frame) {
	if(frame===false) 
		return false
	a = walk(a, frame)	
	b = walk(b, frame)
	if(a===b) 
		return frame
	else if(logic.is_lvar(a)) { //is variable
		return frame.extend(logic.make_binding(a,b))
	}
	else if(logic.is_lvar(b)) //is variable
		return frame.extend(logic.make_binding(b,a)) 
	else if(typeof a === 'object') {
		if(logic.is_array(a) && logic.is_array(b)) {
			//match two arrays
			if(a.length!==b.length) return false;
			for(var i=0;i<a.length;++i)
				frame = logic.unify(a[i], b[i], frame)
			return frame
		}
		else if(logic.is_object(a) && logic.is_object(b)) {
			//match two objects
			for(var prop in a) {
				if(a.hasOwnProperty(prop))
					if(typeof b[prop]!=='undefined') frame = logic.unify(a[prop], b[prop], frame)
			}
			for(var prop in b) {
				if(b.hasOwnProperty(prop))
					if(typeof a[prop]!=='undefined') frame = logic.unify(b[prop], a[prop], frame)
			}
			return frame
		}
		else 
			return false
	}
	else return false
}

function walk(variable, frame) {
	//finds out what value a variable is associated with, e.g.
	//walk(x, |x=2|) ==> 2
	//walk(x, |x=y|) ==> y
	//walk(x, |x=y;y=w;w=2|) ==> 2
	//walk(x, |w=y|) ==> x
	var frame0 = frame
	if(logic.is_lvar(variable)) {
		while(!frame.is_empty()) {
			var binding = frame.first
			if(binding.variable===variable) {
				return walk(binding.val, frame0)
			}
			frame = frame.rest
		}
		return variable
	}
	else
		return variable
}

logic.walk = walk

/*
	a goal/relation takes a package and returns a stream of packages (an empty stream stands for a 'fail'/'false' goal)
*/

logic.eq = function (a, b) { //'goal' version of unify
	return function(p) {
		var f = p.frame
		var f2 = logic.unify(a, b, f)
		if(f2) 
			return logic.win(p.extend_frame(f2))
		else 
			return logic.fail()
	}
}

logic.win = function (pack) { return logic.make_stream(pack||logic.nil) }
logic.fail = function (pack) { return EMPTY_STREAM }

/*
	some functions that operate on goals
*/

logic.disj = function (g1, g2) {
	return function(f) {
		return g1(f).append(g2(f))
	}
}
logic.or = logic.disj

logic.conj = function (g1, g2) {
	return function(f) {
		var s1 = g1(f)
		return s1.map(function(f) {
			return g2(f)
		}).flatten();
	}
}
logic.and = logic.conj

/*
	non-fundamental goals
*/

var _between = function (a,b,x) {
	if(a>b) 
		return logic.fail
	else
		return logic.disj(logic.eq(x,a), logic.between(a+1,b,x))
}

logic.between = function (a,b,x) {
	assert(typeof(a) === 'number', '#1 argument of between is number')
	assert(typeof(b) === 'number', '#2 argument of between is number')
	return _between(a,b,x)
}

logic.run = function (g, v, n) {
	//runs goal getting the first n results of variables
	//n is optional (n=n or infinity)
	//v is variable or array of variables
	assert(logic.is_lvar(v) || logic.is_array(v), '#2 must be variable/array')
	n = ((typeof n==='undefined')?(1/0):n)
	var s = g(logic.nil)
		,result = []
	for(var i=0; i<n && !s.is_empty();++i) {
		var pack = s.first
			,frame = pack.frame
		if(logic.is_lvar(v)) { //get variable into result
			var v2 = walk(v, frame)
			var _temp = logic.is_lvar(v2) ? pack.lookup_binding(v).val : v2
			result.push(_temp)
		}
		else { //get array of variables into result
			var vals = []
			for(var j=0;j<v.length;++j) {
				var v2 = walk(v[j], frame)
				var _temp = logic.is_lvar(v2) ? pack.lookup_binding(v2).val : v2
				vals.push(_temp)
			}
			result.push(vals)
		}
		s=s.rest()
	}
	return result
}

//export module to nodejs/browser
if (typeof exports !== 'undefined') {
	if (typeof module !== 'undefined' && module.exports) {
	  exports = module.exports = logic;
	}
	exports.logic = logic;
} 
else {
	this.logic = logic;
}


}).call(this);
