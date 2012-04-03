Installation
--------------
Copy backbone.queryparams.js to your environment and include *after* backbone.js.

Query string route syntax
-------------------------
Any route except those ending with a wildcard will automatically accept additional content using the '?' separator. This content is a set of key value pairs using '&' as the pair separator and '=' as the key/value separator - just like the URL query string syntax.

If a query string exists in the route hash, the routing function (defined in the routes hash) will be given an additional parameter (in last ordinal position) containing hash of the key/value data.

	routes: {
		'foo/:bar': 'myRoute'
	}
	...
	myRoute: function(bar, params) {
		// the params attribute will be undefined unless there is a route containing a query string
	}

Example route patterns
----------------------
* #foo/abc -> myRoute( 'abc', undefined )
* #foo/abc?foo=bar -> myRoute( 'abc', {'foo': 'bar'} )

Nested query strings
-----------------------
* Any keys containing '.' will represent a nested structure.
* Any values containing '|' will assume an array structure.
* Non-array values can still contain '|' but it must be URI encoded (%7C).
* A prefix of '|' will ensure an array in case there is only a single value.

		#foo/abc?me.fname=Joe&me.lname=Hudson -> myRoute('abc', {'me': {'fname': 'Joe', 'lname': 'Hudson'}} )

		#foo/abc?animals=cat|dog -> myRoute( 'abc', ['cat', 'dog'] )

		#foo/abc?animals=|cat -> myRoute( 'abc', ['cat'] )


Generating route with query string
----------------------------------
You can create a route string from a route + parameter hash using the router.toFragment(route, parameters) method. It can contain a nested hash structure or arrays. ex:

	var route = router.toFragment('myroute', {
		a:'l', b:{c: 'n', d:'m', e:{f: 'o'}}, array1:['p'], array2:['q', 'r'], array3:['s','t','|']
	});

Parameter-based URI decoding
----------------------------
Current backbone will decode the complete hash value. This requires route parameters to be encoded multiple times if they contain reserved characters ('/' for example).

*This patch moves all decoding to route parameters when they are in parameter form (after the hash has been parsed).*