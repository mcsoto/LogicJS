if(typeof require !== 'undefined') logic = require('./logic.js')

write = console.log

write(logic)

var or=logic.or
	,and=logic.and
	,eq=logic.eq
	,lvar=logic.lvar
	,nil=logic.nil
	,between=logic.between
	,run=logic.run
	,list=logic.list
	,implies=logic.implies

var x = lvar('x')
	,y = lvar('y')
	,z = lvar('z')
	,w = lvar()


//console.log(a.lvar())


range = function (low,high) {
	if(low>high)
		return EMPTY_STREAM
	else
		return logic.make_stream(low,function() { return range(low+1,high); })
}

ones = function () {
	return logic.make_stream(1, ones)
}

twos = function () {
	return logic.make_stream(2, twos)
}

function father(a,b) {
	//mcbob is father of bob
	//bob is father of bill
	return or(
		and(eq(a,'mcbob'), eq(b,'bob'))
		,and(eq(a,'bob'), eq(b,'bill'))
	)
}

function grandfather(x,y) {
	var z = lvar()
	return and(father(x,z), father(z,y))
}

write('---tests')
write('win:',logic.win)
write('fail:',logic.fail)

write('X=a:',eq(x,'a')(nil))
write('X=Y:',eq(x,y)(nil))

g1 = or(eq(x,'mcbob'), eq(y,'bob'))
s1 = g1(nil)
g2 = and(eq(z,2),eq(w,3))
s2 = g2(nil)
write('--streams')
write('s1')
s1.write()
write('s2')
s2.write()
write('s3')
s3 = s1.map(function(f) {
	return g2(f)
});
s3.write()
s3 = s3.flatten()
s3.write()

write('--relations')
s = father(x,y)(nil)
s.write()
grandfather(x,y)(nil).write()

write('--ranges')
between(1,5,x)(nil).write()
and(
	between(1,5,x)
	,between(1,2,x)
)(nil).write()
and(
	between(1,5,x)
	,between(3,7,x)
)(nil).write()
or(
	between(1,4,x)
	,between(3,7,x)
)(nil).write()

write('--')
and(eq(x,'a'),eq(x,'a'))(nil).write() //do not extend frame
and(eq(x,'a'),eq(x,'b'))(nil).write()

write('--array match')
s = eq([1,2,y],[1,x,3])(nil)
s.write()

write('--object match')
g1 = eq({x:x},{x:3})
g2 = eq({name:'bob', city:'dinamarca', gifts:['cake',z] }, {name:x, gifts:[y,'bread']})
g3 = eq({name:'bob', city:'dinamarca', gifts:['cake',z] }, {name:x, gifts:[z,'bread']})
write( run(g1, x) )
write( run(g2, [x,y,z]) )
write( run(g3, [x,y,z]) )

write('--eq?')
write(logic.run(eq(x,[1,2,3]), x)[0])

g = and(
	eq(x,[1,y,3])
	,eq(y,2)
)
write(run(g,x)) //should we make this return x = [1,2,3] ? (probably not)

write(run(eq([x,2,z],[y,y,3]), [x,y,z])) //[2, 2, 3]

write('--run')
g = between(1,5,x)
r = logic.run(g, x, 0)
write(r)
r = logic.run(g, x, 3)
write(r)
r = logic.run(g, x)
write(r)
r = logic.run(or(between(2,5,x),between(3,7,x)), x)
write(r)
r = logic.run(and(between(2,5,x),between(3,7,x)), x)
write(r)
r = logic.run(or(between(2,5,x),between(3,7,y)), [x,y])
write(r)
r = logic.run(and(between(2,5,x),between(3,7,y)), [x,y])
write(r)
r = logic.run(and(between(2,5,x),between(6,7,x)), [x,y])
write(r)
r = logic.run(father(x,y), [x,y])
write(r)

var dom = logic.dom
	,add = logic.add
	,sub = logic.sub
	,mul = logic.mul
	,div = logic.div
	,make_domain = logic.clpr.make_domain
	,less_equal = logic.clpr.less_equal
	
write('--')
g = and(dom(x,0,5),dom(x,0,3))
write(run(g,x))

write('--')
g = and(dom(x,0,3),dom(x,0,5))
write(run(g,x))

write('--')
g = or( dom(x, 0, 3), dom(x, 1, 2))
write(run(g,x))
g = and(dom(x, 0, 4.2), dom(x, 1, 5))
write(run(g,x))
g = and(dom(x, 0, 3.4), dom(x, 4, 5))
write(run(g,x))

write('--constraints')
g = less_equal(x,3)
write(run(g,x))
g(nil).write()

g = and(dom(x,2,5), less_equal(x,3))
write(run(g,x))

g = and(less_equal(x,3), eq(x,2))
write(run(g,x))

g = and(less_equal(x,3), eq(x,5))
write(run(g,x))

g = and(eq(x,5), less_equal(x,3))
write(run(g,x))

write('--add')
g = (add(2,1,x))
write(run(g,x))

g = and(add(x,1,z), eq(z,2))
write(run(g,[x,y,z]))

g = or(
	and(add(x,1,z), eq(x,2)),
	or(
		and(sub(x,1,z), eq(x,2)),
		and(sub(x,y,z), and(eq(x,2), eq(y,3)))
	)
)
write(run(g,[x,y,z]))

write('--mul')
g = and(mul(x,y,2), logic.win)//and(eq(x,2), eq(y,3)))
write(run(g,[x,y,z]))

g = and(mul(x,y,z), and(eq(x,2), eq(y,3)))
write(run(g,[x,y,z]))

write('--')
g = or(
	and(mul(x,2.5,z), eq(x,2)),
	or(
		and(div(x,3,z), eq(x,1)),
		and(div(x,y,z), and(eq(x,2), eq(z,3)))
	)
)
write(run(g,[x,y,z]))

g = or(
	and(div(2,3,z), eq(z,1)),
	and(div(x,y,z),logic.win)
)
write(run(g,[x,y,z]))

g = or(
	and(div(2,3,z), less_equal(z,2)),
	and(div(x,y,z), and(less_equal(x,2), less_equal(y,2)))
)
write(run(g,[x,y,z]))

write(run(less_equal(x,2), [x,y,z]))

write(make_domain(2,5).div(make_domain(1, 1/0)))
write(make_domain(2,5).div(make_domain(-1/0, 1/0)))

function writeg(x) {
	return function(p) {
		write(p.get_value(x))
		return logic.win(p)
	}
}

g = and(eq(x,2),writeg(x),eq(y,3))
run( g,x )

write(run(eq(x,2), [x, 3, 'blah']))

write('--and/or')
write( run(and(), [x]) )
write( run(and(eq(x,2)), [x]) )
write( run(and(eq(x,2), eq(y,3)), [x,y]) )
write( run(and(eq(x,2), eq(y,3), eq(z,4)), [x,y,z]) )
write( run(and(eq(x,2), eq(y,3), eq(z,4), eq(w,5)), [x,y,z,w]) )

write( run(or(), x) )
write( run(or(eq(x,2)), x) )
write( run(or(eq(x,2), eq(x,3)), x) )
write( run(or(eq(x,2), eq(x,3), eq(x,4)), x) )
write( run(or(eq(x,2), eq(x,3), eq(x,4), eq(x,5)), x) )

write('--list matching')
l1=list(1,y,3)
l2=list(1,2,x)
l3=list(z,y,w,3,y)
l4=list(2,x,x,w,w)
write( run(eq(l1, x), x) )
write( run(eq(l1, l2), [x,y]) )
write( run(eq(l3, l4), [x,y,z,w]) )
write( run(eq(l1, l3), [x,y,z,w]) )
write( run(and(eq(z,l1), eq(z,l2)), [x,y,z,w]) )

write('--ifs')
g1 = logic.eq(x,0)
g2 = logic.eq(y,1)
g3 = logic.eq(y,2)
write(run(implies(g1,g2,g3), [x,y]))
write(run(implies(logic.fail,g2,g3), [x,y]))
write(run(implies(g1,g2), [x,y]))
write(run(implies(logic.fail,g2), [x,y]))
