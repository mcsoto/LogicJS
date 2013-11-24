(function() {

//utils
function assert(x,str) {
	if (x===false) throw new Error(str)
}

var logic = {}

	
/*
	frames
*/

function Frame(a,b) {
	this.first = a
	this.rest = b
	this.type = 'frame'
}

Frame.prototype = {
	is_empty : function () {
		var s = this
		return typeof s.rest === 'undefined'
	}
	,append : function (s2) {
		var s1 = this
		if (s1.is_empty()) 
			return s2
		else 
			return new Frame(s1.first, s1.append(s2));
	}
	,interleave : function (s2) {
		var s1 = this
		if (s1.is_empty())
			return s2
		else
			return logic.make_frame(s1.first, s2.interleave(s1.rest));
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
			return logic.make_frame(f(s.first), _rest);
		}
	 }
	,extend : function (val) {
		return logic.make_frame(val, this)
	}
	,toString : function() {
		var str = '|'
		var s=this
		while(!s.is_empty()) {
			str += s.first.toString()+(s.rest.is_empty()?'':', ')
			s=s.rest
		}
		str+='|'
		return str
	}
	,write : function () {
		write(this.toString())
	}
	,lookup_binding_helper : function (frame, variable) {
		if(frame===EMPTY_FRAME) return false
		else if(frame.first.variable===variable) return frame.first
		else return frame.rest.lookup_binding(variable)
	}
	,lookup_binding : function (variable) {
		return this.lookup_binding_helper(this, variable)
	}
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
var EMPTY_FRAME = new Frame(undefined, undefined)

logic.nil = EMPTY_FRAME
logic.EMPTY_STREAM = EMPTY_STREAM
logic.EMPTY_FRAME = EMPTY_FRAME

logic.is_stream = function (s) {
	return typeof s==='object' && s.type && s.type==='stream'
}

logic.is_frame = function (s) {
	return typeof s==='object' && s.type && s.type==='stream'
}

logic.is_binding = function (s) {
	return typeof s==='object' && s.type && s.type==='binding'
}

logic.is_lvar = function (v) {
	return (typeof v==='object') && (typeof v.type!=='undefined') && v.type==='lvar'
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

logic.make_frame = function (a,b) {
	if(typeof b==='undefined') b = EMPTY_LIST
	assert(typeof b==='object', '#2 argument must be object.')
	return new Frame(a,b)
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
	a goal/relation takes a frame and returns a stream of frames (an empty stream stands for a 'fail'/'false' goal)
*/

logic.eq = function (a, b) { //'goal' version of unify
	return function(f) {
		var f2 = logic.unify(a, b, f)
		if(f2) return logic.win(f2)
		else return logic.fail()
	}
}

logic.win = function (frame) { return logic.make_stream(frame||logic.nil) }
logic.fail = function (frame) { return EMPTY_STREAM }

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
		var frame = s.first
		if(logic.is_lvar(v)) { //get variable into result
			var v2 = walk(v, frame)
			var _temp = logic.is_lvar(v2) ? frame.lookup_binding(v).val : v2
			result.push(_temp)
		}
		else { //get array of variables into result
			var vals = []
			for(var j=0;j<v.length;++j) {
				var v2 = walk(v[j], frame)
				var _temp = logic.is_lvar(v2) ? frame.lookup_binding(v2).val : v2
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
