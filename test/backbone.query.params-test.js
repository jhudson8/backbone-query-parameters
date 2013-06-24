$(document).ready(function() {

  var router = null;
  var location = null;
  var lastRoute = null;
  var lastArgs = [];

  function onRoute(router, route, args) {
    lastRoute = route;
    lastArgs = args;
  }

  var Location = function(href) {
    this.replace(href);
  };

  _.extend(Location.prototype, {

    replace: function(href) {
      _.extend(this, _.pick($('<a></a>', {href: href})[0],
        'href',
        'hash',
        'host',
        'search',
        'fragment',
        'pathname',
        'protocol'
      ));
      // In IE, anchor.pathname does not contain a leading slash though
      // window.location.pathname does.
      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
    },

    toString: function() {
      return this.href;
    }

  });

  module("Backbone.QueryParams", {

    setup: function() {
      location = new Location('http://example.com');
      Backbone.history = _.extend(new Backbone.History, {location: location});
      router = new Router({testing: 101});
      Backbone.history.interval = 9;
      Backbone.history.start({pushState: false});
      lastRoute = null;
      lastArgs = [];
      Backbone.history.on('route', onRoute);
    },

    teardown: function() {
      Backbone.history.stop();
      Backbone.history.off('route', onRoute);
    }

  });

  var Router = Backbone.Router.extend({

    count: 0,

    routes: {
      "noCallback":                 "noCallback",
      "counter":                    "counter",
      "search/:query":              "search",
      "search/:query/p:page":       "search",
      "contacts":                   "contacts",
      "contacts/new":               "newContact",
      "contacts/:id":               "loadContact",
      "optional(/:item)":           "optionalItem",
      "named/optional/(y:z)":       "namedOptional",
      "splat/*args/end":            "splat",
      "*first/complex-:part/*rest": "complex",
      ":entity?*args":              "query",
      "*anything":                  "anything"
    },

    initialize : function(options) {
      this.testing = options.testing;
      this.route('implicit', 'implicit');
    },

    counter: function() {
      this.count++;
    },

    implicit: function() {
      this.count++;
    },

    search : function(query, page, queryParams) {
      this.query = query;
      this.page = page;
      this.queryParams = queryParams;
    },

    contacts: function(){
      this.contact = 'index';
    },

    newContact: function(){
      this.contact = 'new';
    },

    loadContact: function(){
      this.contact = 'load';
    },

    optionalItem: function(arg){
      this.arg = arg != void 0 ? arg : null;
    },

    splat: function(args) {
      this.args = args;
    },

    complex: function(first, part, rest) {
      this.first = first;
      this.part = part;
      this.rest = rest;
    },

    query: function(entity, args) {
      this.entity    = entity;
      this.queryArgs = args;
    },

    anything: function(whatever) {
      this.anything = whatever;
    },

    namedOptional: function(z) {
      this.z = z;
    }

  });

  test("Route callback gets passed DECODED values.", 3, function() {
    var route = 'has%2Fslash/complex-has%23hash/has%20space';
    Backbone.history.navigate(route, {trigger: true});
    strictEqual(router.first, 'has/slash');
    strictEqual(router.part, 'has#hash');
    strictEqual(router.rest, 'has space');
  });

  test("routes (two part - encoded reserved char)", 2, function() {
    var route = 'search/nyc/pa%2Fb';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, 'a/b');
  });

  test("routes (two part - query params)", 3, function() {
    var route = 'search/nyc/p10?a=b';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
    equal(router.queryParams.a, 'b');
  });

  test("routes (two part - query params - hash and list - location)", 12, function() {
    var route = 'search/nyc/p10?a=b&a2=x&a2=y&a3=x&a3=y&a3=z&b.c=d&b.d=e&b.e.f=g&array1=|a&array2=a|b&array3=|c|d&array4=|e%7C';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
    equal(router.queryParams.a, 'b');
    deepEqual(router.queryParams.a2, ['x', 'y']);
    deepEqual(router.queryParams.a3, ['x', 'y', 'z']);
    equal(router.queryParams.b.c, 'd');
    equal(router.queryParams.b.d, 'e');
    equal(router.queryParams.b.e.f, 'g');
    deepEqual(router.queryParams.array1, ['a']);
    deepEqual(router.queryParams.array2, ['a', 'b']);
    deepEqual(router.queryParams.array3, ['c', 'd']);
    deepEqual(router.queryParams.array4, ['e|']);
  });

  test("routes (two part - query params)", 3, function() {
    var route = 'search/nyc/p10?a=b';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
    equal(router.queryParams.a, 'b');
  });

  test("routes (two part - query params - hash and list - navigate)", 10, function() {
    var route = router.toFragment('search/nyc/p10', {
      a:'l', b:{c: 'n', d:'m', e:{f: 'o'}}, array1:['p'], array2:['q', 'r'], array3:['s','t','|'], array4:[5, 6, 8, 9]
    });
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
    equal(router.queryParams.a, 'l');
    equal(router.queryParams.b.c, 'n');
    equal(router.queryParams.b.d, 'm');
    equal(router.queryParams.b.e.f, 'o');
    deepEqual(router.queryParams.array1, ['p']);
    deepEqual(router.queryParams.array2, ['q', 'r']);
    deepEqual(router.queryParams.array3, ['s','t','|']);
    deepEqual(router.queryParams.array4, ['5', '6', '8', '9']);
  });

  test("routes (decoding with 2 repeated values)", 3, function() {
    var route = 'search/nyc/p10?f.foo.bar=foo%20%2B%20bar&f.foo.bar=hello%20qux';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
    deepEqual(router.queryParams.f.foo.bar, ['foo + bar', 'hello qux']);
  });

  test("routes (decoding with 3 repeated values)", 3, function() {
    var route = 'search/nyc/p10?f.foo.bar=foo%20%2B%20bar&f.foo.bar=hello%20qux&f.foo.bar=baz%20baz';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
    deepEqual(router.queryParams.f.foo.bar, ['foo + bar', 'hello qux', 'baz baz']);
  });

  test("named parameters (defined statically)", 3, function() {
    Backbone.Router.namedParameters = true;
    var route = 'search/nyc/p10?a=b';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    // only 1 param in this case populated with query parameters and route vars keyd with their associated name
    var data = router.query;
    equal(data.query, 'nyc');
    equal(data.page, '10');
    equal(data.a, 'b');
    Backbone.Router.namedParameters = false;
  });

  test("named parameters (defined on router instance)", 3, function() {
    var Router = Backbone.Router.extend({
      namedParameters: true,
      routes: {
        "search2/:query/p:page":       "search"
      },
      search : function(query, page, queryParams) {
        this.query = query;
        this.page = page;
        this.queryParams = queryParams;
      }
    });
    var router = new Router();
    var route = 'search2/nyc/p10?a=b';
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    // only 1 param in this case populated with query parameters and route vars keyd with their associated name
    var data = router.query;
    equal(data.query, 'nyc');
    equal(data.page, '10');
    equal(data.a, 'b');
  });
});
