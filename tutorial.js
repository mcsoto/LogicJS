logic = require('./logic.js')

//1. intro
var or = logic.or,
	and = logic.and,
	eq = logic.eq,
	run = logic.run,
	lvar = logic.lvar,
	between = logic.between
	
//creates two unique logic variables
var x = lvar(),
  y = lvar()
  
//creates a 'goal'
g1 = or(
  and(eq(x,2), eq(y,3)),
  and(eq(x,y), eq(y,'dog'))
)
	
//runs goal asking for the possible values of x and y
run(g1, x) //[2, 'dog']
run(g1, y) //[3, 'dog']
run(g1, [x,y]) //[ [2, 3], ['dog', 'dog'] ]

//a goal is a sequence of assertions
//here, we assert that x is a value from 1 to 3
//and that y is either 1 or 2
g2 = and(
	between(1,3,x),
	or(eq(1,y), 
		eq(2,y))
)

//get only the first 2 values 
run(g2, [x,y], 2) //[ [1, 1], [1, 2] ]
//get all values
run(g2, [x,y]) //[ [1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 1] ]

//2. goals

function father(x,y) {
	//mcbob is father of bob
	//bob is father of bill
	return or(
		and(eq(x,'mcbob'), eq(y,'bob'))
		,and(eq(x,'bob'), eq(y,'bill'))
	)
}

function grandfather(x,y) {
	var z = lvar() //dummy variable
	return and(father(x,z), father(z,y))
}

//who is father of bob?
run(father(x,'bob'), x) //[mcbob]
//who is grandfather of who?
run(grandfather(x,y), [x,y]) //[[mcbob, bill]]


//3. pattern matching
var x = lvar(), 
	y = lvar(),
	z = lvar()
	
g1 = eq({x:x}, {x:3})

run(g1, x) //[3]

g2 = eq(
	{name:'bob', city:'dinamarca', gifts:['cake',z] }, 
	{name:x, gifts:[y,'bread']})

run(g2, [x,y,z]) //[[bob, 'cake', 'bread']]

g3 = eq(
	{name:'bob', city:'dinamarca', gifts:['cake',z] }, 
	{name:x, gifts:[z,'bread']})
	
run(g3, [x,y,z]) //[] //cannot match

