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
