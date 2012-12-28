Installation
--------------
Copy backbone.queryparams.js to your environment and include *after* backbone.js.  This has been updated to support backbone 0.9.9.

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

Named route parameters
----------------------
All query parameters can be passed in a single hash using the key referenced from the route definition by setting ```Backbone.Router.namedParameters = true```.

Using the previous example route patterns, the controller function would be
```
myRoute( {bar: 'abc', foo: 'bar'} );
```
Although this is not compatible with backbone, it is very useful to prevent router function parameter overloading where you have to always consider
whether the route query parameters were passed.

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

Regular Expression Routes
-------------------------
If you want to use this plugin with regex routes you'll need to append the query capture component (`([\?]{1}.*)?`) manually.

    router.route(/foo\/([^\/]+)\//, 'foo:event', callback)

should be written

    router.route(/foo\/([^\/]+)\/([\?]{1}.*)?/, 'foo:event', callback)