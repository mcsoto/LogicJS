LogicJS
=======

LogicJS adds logic programming to JavaScript.

Logic programming is typically known by the language Prolog.

Installation
=======

Download the logic.js file and move it to your project.

Introduction
=======

```javascript
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

//get only the first 2 answers
run(g2, [x,y], 2) //[ [1, 1], [1, 2] ]
//get all answers
run(g2, [x,y]) //[ [1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 1] ]
```

Composite Goals
---------------

Programmers may create their own goals by combining primitive goals such as *or*, *and*, *eq*.

```javascript

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
```

Pattern Matching
---------

LogicJS can pattern match on JavaScript objects and arrays.

```javascript
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
	
run(g3, [x,y,z]) //[] //cannot match this one
```

Implementation
==============

LogicJS is based on MiniKanren/SICP.

* **Bindings** associate a variable to a value (e.g. X=2).
* **Frames** are lists of bindings.
* **Streams** are similar to lists, but they are evaluated on the fly and thus are potentially infinite.
* **Goals** take a frame as input and return a stream (since a goal can have zero or infinite answers).
