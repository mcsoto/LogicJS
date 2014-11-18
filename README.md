LogicJS
=======

LogicJS adds logic programming to JavaScript.

Logic programming is typically known by the language Prolog.

Installation
=======

Download the *logic.js* file and move it to your project.

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
run(g2, [x,y]) //[ [1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 2] ]
```

Goals
-----

Programmers may create their own goals by combining primitive goals such as *or*, *and* and *eq*.

```javascript

function father(x,y) {
	//mcbob is father of bob
	//bob is father of bill
	return or(
		and(eq(x,'mcbob'), eq(y,'bob')),
		and(eq(x,'bob'), eq(y,'bill'))
	)
}

function grandfather(x,y) {
	var z = lvar() //dummy variable
	return and(father(x,z), father(z,y))
}

//who is father of bob?
run(father(x,'bob'), x) //['mcbob']
//who is grandfather of who?
run(grandfather(x,y), [x,y]) //[ ['mcbob', 'bill'] ]
```

The *win* and *fail* goals simply succeed or not succeed. They are analogous to the **true** and **false** constants in logic.

```javascript
run(logic.win, x) //[ undefined ]
run(logic.fail, x) //[]
```

Note that failure means there are no answers (empty array), while success means there is at least one answer (in this case the answer is *undefined*, since we still don't know the value of *x*).

Constraints
-----------

In pure logic programming, it doesn't matter which arguments of a goal have been instantiated.

This works for the arithmetic relations.

```javascript
var add = logic.add, sub = logic.sub, mul = logic.mul, div = logic.div

run(add(x,2,6), x) //[ 4 ]
run(sub(2,x,6), x) //[ -4 ]
run(mul(2,6,x), x) //[ 12 ]
run(div(x,2,6), x) //[ 12 ]
```

When not enough arguments are instantied, some goals will propagate a *constraint* (such as "x+1=y" or "x is less or equal to 2"). When it's still not possible to find a value for the variable, it'll return a *domain* with the possible values of that variable.

```javascript
var less_equal = logic.less_equal
var write = console.log

v = run(and(add(x,y,3), eq(y,1)), x)[0]
write(v) //2

v = run(less_equal(1,2), x)[0]
write(v) //undefined
d = run(less_equal(x,2), x)[0]
write(d.min, d.max) //-inf, 2
d = run(less_equal(2,x), x)[0]
write(d.min, d.max) //2, inf
d = run(less_equal(x,y), x)[0]
write(d.min, d.max) //-inf, inf
```

Unification (done by the goal *logic.eq*) is the most basic kind of constraint. *Constraint logic programming* adds further constraints.

An example of an impure goal included in LogicJS is *between*, which requires the first two arguments to be numbers.


Implementation
==============

The implementation of LogicJS is based on MiniKanren/SICP.

* **Bindings** associate a variable to a value (e.g. X=2).
* **Streams** are similar to lists, but they are evaluated on the fly and thus are potentially infinite.
* **Packages** contain a list of bindings (sometimes called a *frame*) and a list of constraints. Logic programming without support for constraints might only use frames instead of packages.
* **Goals** take a package as input and return a stream of packages (since a goal can have zero or infinite answers).
