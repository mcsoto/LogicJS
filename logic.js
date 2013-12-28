(function() {

//utils
function assert(x,str) {
	if (x===false) throw new Error(str)
}

var logic = {}
var write = ((typeof console === 'object') && (typeof console.log !== 'undefined')) ? console.log : function(){}

var inf = 1/0 //we start with a division by zero. this is a good start.
var minus_inf = (-1)*inf

/*
	domains (for clp)
*/

REAL_DOMAIN = make_domain(minus_inf, inf)

function Domain(min, max) {
	this.min=min
	this.max=max
}

Domain.prototype.toString = function() {
	var str = '['+this.min+', '+this.max+']'
	return str
}

Domain.prototype.is_member = function(v) {
	var d1 = this
	return v>=d.min && v<=d.max
}

Domain.prototype.add = function(d2) {
	var d1 = this
	return make_domain(d1.min+d2.min, d1.max+d2.max)
}

Domain.prototype.sub = function(d2) {
	var d1 = this
	return make_domain(d1.min-d2.max, d1.max-d2.min)
}

Domain.prototype.mul = function(d2) {
	var d1 = this
		,obj = [d1.min*d2.min, d1.min*d2.max, d1.max*d2.min, d1.max*d2.max]
		,min = Math.min.apply(null, obj)
		,max = Math.max.apply(null, obj)
	return make_domain(min, max)
}

Domain.prototype.div = function(d2) {
	var d1 = this
	var min, max
	if(d2.min<=0 && d2.max>=0) { //zero is involved.
		if(d2.min===0 && d2.max===0) {
			return false
		}
		else if(d2.min===0) {
			max = inf
			return make_domain(Math.min(d1.min/d2.max, d1.max/d2.max), inf)
		}
		else if(d2.max===0) {
			min = minus_inf
			return make_domain(minus_inf, Math.max(d1.min/d2.min, d1.max/d2.max) )
		}
	}
	if(!(isFinite(d2.min)&&isFinite(d2.max))) { //infinity is involved...
		if(d2.min===minus_inf && d2.max===inf) {
			return REAL_DOMAIN
		}
	}
	var obj = [d1.min/d2.min, d1.min/d2.max, d1.max/d2.min, d1.max/d2.max]
		,min = Math.min.apply(null, obj)
		,max = Math.max.apply(null, obj)
	//write('obj',obj,d1,d2)
	return make_domain(min, max)
}

function make_domain(min, max) {
	return new Domain(min, max)
}

function intersection(d1, d2) {
	var min, max
	min = (d1.min<d2.min) ? d2.min : d1.min;
	max = (d1.max>d2.max) ? d2.max : d1.max;
	if(max<min) return false;
	return make_domain(min, max)
}

function get_domain(pack, x) {
	if(logic.is_lvar(x)) {
		var d = pack.lookup_domain_binding(x)
		if(!d)
			return REAL_DOMAIN
		return d.val
	}
	else {
		return make_domain(x, x)
	}
}

/*
	constraints	

*/

function Constraint(fn, args, name) {
	this.fn = fn
	this.args = args||[]
	this.name = name||''
}

Constraint.prototype.toString = function() {
	var str = '['+this.name+' '+this.args+']'
	return str
}

//calls constraint
//c->proc takes a package and returns a modified package or false 
Constraint.prototype.proc = function(p) {
	var f = this.fn.apply(null, this.args)
	return f(p)
}

function make_constraint(fn, args, name) {
	assert(typeof fn === 'function', '#1 of make-constraint is function')
	assert(typeof args === 'object', '#2 of make-constraint is array')
	return new Constraint(fn, args, name)
}

//this returns false (in case of inconsistency) or a modified package
function run_constraints(store, p0) {
	var p = p0
	var cs = store
	while(!cs.is_empty()) {
		var c = cs.first
		p = c.proc(p)
		if(p===false) 
			return false
		cs = cs.rest
	}
	return p
}

/*
	clp for reals
	
	The clp operations (such +-/* and <=, <, >, >=, !=, dom) create a binding of a variable to a domain, which is added to package->domains after checking for consistency. When eq creates a new binding, we check the variable's domain (if any) for consistency before extending package->frame.
	
*/

function less_equal_c(x,y) {
	return function (p) {
		var wx = p.walk(x), wy = p.walk(y)
			,dx = get_domain(p, wx), dy = get_domain(p, wy)
		var di = intersection(dx, make_domain(minus_inf, dy.max))
		if(di) {
			var di2 = intersection(dy, make_domain(dx.min, inf))
			if(di2) {
				var p1 = p.extend_domain(x, di)
				var p2 = p1.extend_domain(y, di2)
				return p2
			}
			else
				return false
		}
		else
			return false
	}
}

function add_c(x,y,z) {
	//X + Y = Z
	//z=x+y
	//x=z-y
	//y=z-x
	return function (p) {
		var wx = p.walk(x), wy = p.walk(y), wz = p.walk(z)
			,dx = get_domain(p, wx), dy = get_domain(p, wy), dz = get_domain(p, wz)
		dz = intersection(dz, dx.add(dy))
		if(dz) {
			dx = intersection(dx, dz.sub(dy))
			if(dx) {
				dy = intersection(dy, dz.sub(dx))
				if(dy) {
					return p.extend_domain(x,dx).extend_domain(y,dy).extend_domain(z,dz)
				}
			}
		}
		return false
	}
}

function mul_c(x,y,z) {
	//X * Y = Z
	//z=x*y
	//x=z/y
	//y=z/x
	return function (p) {
		var wx = p.walk(x), wy = p.walk(y), wz = p.walk(z)
			,dx = get_domain(p, wx), dy = get_domain(p, wy), dz = get_domain(p, wz)
		dz = intersection(dz, dx.mul(dy))
		if(dz) {
			dx = intersection(dx, dz.div(dy))
			if(dx) {
				dy = intersection(dy, dz.div(dx))
				if(dy) {
					return p.extend_domain(x,dx).extend_domain(y,dy).extend_domain(z,dz)
				}
			}
		}
		return false
	}
}

clpr = {
	dom : function (x, min, max) {
		assert(typeof min==='number' && typeof max==='number', '#2-3 arguments of dom must be number.')
		return function (p) {
			var d = make_domain(min, max)
				,wx = p.walk(x)
				,dx = get_domain(p, x)
				,di = intersection(dx, d)
			//di returns false when it fails
			//in that case, the goal will fail
			if(di)
				return logic.win(p.extend_domain(x, di))
			else
				return logic.fail()
		}
	}
	,add : function (x, y, z) {
		return goal_construct(add_c, [x,y,z], '+')
	}
	,sub : function (x, y, z) {
		return clpr.add(z, y, x) //x-y=z is the same as x=z+y
	}
	,mul : function (x, y, z) {
		return goal_construct(mul_c, [x,y,z], '*')
	}
	,div : function (x, y, z) {
		return clpr.mul(z, y, x) //x/y=z is the same as x=z*y
	}
	,less_equal : function (x, y) {
		return goal_construct(less_equal_c, [x, y], '<=')
	}
	,make_domain : make_domain
	,intersection : intersection
	,get_domain : get_domain
}

//constructs a goal from constraint parameters
function goal_construct(fn, args, name) {
	var c = make_constraint(fn,args,name)
	return function(p) {
		var pc = p.extend_constraint(c)
			,p2 = c.proc(pc)
		if(p2)
			return logic.win(p2)
		else
			return logic.fail()
	}
}

clpr.REAL_DOMAIN = REAL_DOMAIN

logic.dom = clpr.dom
logic.add = clpr.add
logic.sub = clpr.sub
logic.mul = clpr.mul
logic.div = clpr.div
logic.less_equal = clpr.less_equal
logic.clpr = clpr


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

//I'm adding this to class List but 'walk' is only for frames
List.prototype.walk = function (variable) {
	var frame = this
	var frame0 = frame
	if(logic.is_lvar(variable)) {
		while(!frame.is_empty()) {
			var binding = frame.first
			if(binding.variable===variable) {
				return frame0.walk(binding.val)
			}
			frame = frame.rest
		}
		return variable
	}
	else
		return variable
}


/*
	packages hold a **frame**, a **constraint store** and a list of **domains**
*/

function Package(f, cs, d) {
	this.frame = f
	this.store = cs
	this.domains = d
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

Package.prototype.lookup_domain_binding = function (variable) {
	return this.lookup_binding_helper(this.domains, variable)
}

Package.prototype.is_empty = function (arguments) {
	return this.frame.is_empty(arguments)
}

Package.prototype.set_frame = function (f) {
	return logic.make_package(f, this.store, this.domains)
}

/*Package.prototype.set_store = function (cs) {
	return logic.make_package(this.frame, cs, this.domains)
}

Package.prototype.set_domains = function (ds) {
	return logic.make_package(this.frame, this.store, ds)
}*/

Package.prototype.extend_binding = function (variable, val) {
	return logic.make_package(this.frame.extend(logic.make_binding(variable, val), this.store, this.domains), this.store, this.domains)
}

Package.prototype.extend_domain = function (v,d) {
	if(d.min===d.max) {
		if(logic.is_lvar(v))
			return this.extend_binding(v, d.min)
		else
			return this
	}
	return new Package(this.frame, this.store, this.domains.extend(logic.make_binding(v, d)))
}

Package.prototype.extend_constraint = function (c) {
	return logic.make_package(this.frame, this.store.extend(c), this.domains)
}

Package.prototype.extend = function (arguments) {
	return logic.make_package(this.frame.extend(arguments), this.store, this.domains)
}

Package.prototype.toString = function() {
	var str = '{' + (this.frame.is_empty()?'':this.frame.toString()+(this.store.is_empty()?'':', ')) + (this.store.is_empty()?'':this.store+', ') + (this.domains.is_empty()?'':this.domains) + '}'
	return str
}

Package.prototype.write = function () {
	write(this.toString())
}

//finds out what value a variable is associated with, e.g.
//walk(x, |x=2|) ==> 2
//walk(x, |x=y|) ==> y
//walk(x, |x=y;y=w;w=2|) ==> 2
//walk(x, |w=y|) ==> x
Package.prototype.walk = function (variable) {
	return this.frame.walk(variable)
}

Package.prototype.get_value = function (variable) {
	var pack = this
	if(!logic.is_lvar(variable))
		return variable
	var result = pack.lookup_binding(variable).val
	if(typeof result === 'undefined')
		return pack.lookup_domain_binding(variable).val
	else
		return result
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
var EMPTY_PACKAGE = new Package(EMPTY_LIST, EMPTY_LIST, EMPTY_LIST)

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
	return has_type(v, 'logic_var')
}

logic.is_logic_list = function (v) {
	return has_type(v, 'logic_list')
}

logic.is_array = function (v) {
	return Object.prototype.toString.call( v ) === '[object Array]'
}

logic.is_object = function (v) {
	return Object.prototype.toString.call( v ) === '[object Object]'
}

logic.lvar = function (name) { //name is optional (for debugging)
	return {type : 'logic_var', name : name} 
}

logic.list = function () {
	var l = Array.prototype.slice.call(arguments)
	l.type = 'logic_list'
	return l
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

logic.make_package = function (f, cs, ds) {
	assert(logic.is_list(f), '#1 argument of package must be list')
	assert(logic.is_list(cs), '#2 argument of package must be list')
	assert(logic.is_list(ds), '#3 argument of package must be list')
	return new Package(f,cs,ds)
}

logic.unify = function (a, b, frame) {
	if(frame===false)
		return false
	a = frame.walk(a)
	b = frame.walk(b)
	if(a===b)
		return frame
	else if(logic.is_lvar(a)) //is variable
		return frame.extend(logic.make_binding(a,b))
	else if(logic.is_lvar(b)) //is variable
		return frame.extend(logic.make_binding(b,a)) 
	else if(logic.is_logic_list(a) && logic.is_logic_list(b)) { //are both lists
		//match two arrays
		if(a.length!==b.length) return false;
		for(var i=0;i<a.length;++i) {
			frame = logic.unify(a[i], b[i], frame)
		}
		return frame
	}
	else return false
}

/*
	a goal/relation takes a package and returns a stream of packages (an empty stream stands for a 'fail'/'false' goal)
*/

logic.eq = function (a, b) { //'goal' version of unify
	return function(p) {
		var f = p.frame
		var f2 = logic.unify(a, b, f)
		if(f2) {
			//if(f!=f2 && !p.domains.is_empty() && (!intersection(get_domain(p, a), get_domain(p, b)))) //take care of constraints
				//return logic.fail()
			var p2 = p.set_frame(f2)
			if(f==f2 || p.store.is_empty()) 
				return logic.win(p2)
			//check constraints first
			var p3 = run_constraints(p2.store, p2)
			if(p3)
				return logic.win(p3)
			else
				return logic.fail()
		}
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
logic.or = function() {
	args = Array.prototype.slice.call(arguments)
	if(args.length===0) 
		return logic.fail
	if(args.length===1)
		return args[0]
	var g = logic.disj(args[0], logic.or.apply(null, args.slice(1)))
	return g
}


logic.conj = function (g1, g2) {
	return function(f) {
		var s1 = g1(f)
		return s1.map(function(f) {
			return g2(f)
		}).flatten();
	}
}
logic.and = function() {
	args = Array.prototype.slice.call(arguments)
	if(args.length===0) 
		return logic.win
	if(args.length===1)
		return args[0]
	var g = logic.conj(args[0], logic.and.apply(null, args.slice(1)))
	return g
}

logic.implies = function (g1,g2,g3) { //g1 -> g2 ; g3
	return function(p) {
		var s1 = g1(p)
		if(s1.is_empty())
			return g3?g3(p):logic.win(p)
		else
			return s1.map(function(p) {
				return g2(p)
			}).flatten();
	}
}

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
	assert(logic.is_lvar(v) || logic.is_array(v), '#2 of run must be variable/array')
	n = ((typeof n==='undefined')?inf:n)
	var s = g(logic.nil)
		,result = []
	for(var i=0; i<n && !s.is_empty();++i) {
		var pack = s.first
			,frame = pack.frame
		if(logic.is_lvar(v)) { //get variable into result
			var v2 = frame.walk(v)
			var _temp = logic.is_lvar(v2) ? pack.get_value(v) : v2
			result.push(_temp)
		}
		else { //get array of variables into result
			var vals = []
			for(var j=0;j<v.length;++j) {
				var v2 = frame.walk(v[j])
				var _temp = logic.is_lvar(v2) ? pack.get_value(v2) : v2
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
