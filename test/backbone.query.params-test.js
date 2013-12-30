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
      if (!/^\//.test(this.pathname)) {
        this.pathname = '/' + this.pathname;
      }
    },

    toString: function() {
      return this.href;
    }

  });

  var History = function(location) {
    this.location = location;
  };
  History.prototype.pushState = function(state, title, href) {
    this.location.replace(href);
  };
  History.prototype.replaceState = function(state, title, href) {
    this.location.replace(href);
  };

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


  function queryParams(wantPushState, hasPushState) {
    module("Backbone.QueryParams" + (wantPushState ? " - wantPushState" : "") + (hasPushState ? " - hasPushState" : ""), {

      setup: function() {
        location = new Location('http://example.com');
        Backbone.history = _.extend(new Backbone.History(), {location: location, history: hasPushState ? new History(location) : {}});
        router = new Router({testing: 101});
        Backbone.history.interval = 9;
        Backbone.history.start({pushState: wantPushState});
        lastRoute = null;
        lastArgs = [];
        Backbone.history.on('route', onRoute);
      },

      teardown: function() {
        Backbone.history.stop();
        Backbone.history.off('route', onRoute);
      }

    });

    test("Route callback gets passed DECODED values.", 3, function() {
      var route = 'has%2Fslash/complex-has%23hash/has+space';
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

    test("routes (two part - query params - hash and list - location)", 24, function() {
      var route = 'search/nyc/p10?a=b&a2=x&a2=y&a3=x&a3=y&a3=z&&a4=x=y=z&b.c=d&b.d=e&b.e.f=g&array1=|a&array2=a|b&array3=|c|d&array4=|e%7C';
      Backbone.history.navigate(route, {trigger: true});
      Backbone.history.checkUrl();
      equal(router.query, 'nyc');
      equal(router.page, '10');
      equal(router.queryParams.a, 'b');
      equal(router.queryParams.a2.length, 2);
      equal(router.queryParams.a2[0], 'x');
      equal(router.queryParams.a2[1], 'y');
      equal(router.queryParams.a3.length, 3);
      equal(router.queryParams.a3[0], 'x');
      equal(router.queryParams.a3[1], 'y');
      equal(router.queryParams.a3[2], 'z');
      equal(router.queryParams.a4, 'x=y=z');
      equal(router.queryParams.b.c, 'd');
      equal(router.queryParams.b.d, 'e');
      equal(router.queryParams.b.e.f, 'g');
      equal(router.queryParams.array1.length, 1);
      equal(router.queryParams.array1[0], 'a');
      equal(router.queryParams.array2.length, 2);
      equal(router.queryParams.array2[0], 'a');
      equal(router.queryParams.array2[1], 'b');
      equal(router.queryParams.array3.length, 2);
      equal(router.queryParams.array3[0], 'c');
      equal(router.queryParams.array3[1], 'd');
      equal(router.queryParams.array4.length, 1);
      equal(router.queryParams.array4[0], 'e|');
    });

    test("routes (two part - query params)", 3, function() {
      var route = 'search/nyc/p10?a=b';
      Backbone.history.navigate(route, {trigger: true});
      Backbone.history.checkUrl();
      equal(router.query, 'nyc');
      equal(router.page, '10');
      equal(router.queryParams.a, 'b');
    });

    test("routes (two part - query params - hash and list - navigate)", 21, function() {
      var route = router.toFragment('search/nyc/p10', {
        a:'l', b:{c: 'n', d:'m', e:{f: 'o'}}, g:'', array1:['p'], array2:['q', 'r'], array3:['s','t','|'], array4:[0, 5, 6, 8, 9]
      });
      Backbone.history.navigate(route, {trigger: true});
      Backbone.history.checkUrl();
      equal(router.query, 'nyc');
      equal(router.page, '10');
      equal(router.queryParams.a, 'l');
      equal(router.queryParams.b.c, 'n');
      equal(router.queryParams.b.d, 'm');
      equal(router.queryParams.b.e.f, 'o');
      equal(router.queryParams.g, '');
      equal(router.queryParams.array1.length, 1);
      equal(router.queryParams.array1[0], 'p');
      equal(router.queryParams.array2.length, 2);
      equal(router.queryParams.array2[0], 'q');
      equal(router.queryParams.array2[1], 'r');
      equal(router.queryParams.array3.length, 3);
      equal(router.queryParams.array3[0], 's');
      equal(router.queryParams.array3[1], 't');
      equal(router.queryParams.array3[2], '|');
      equal(router.queryParams.array4[0], 0);
      equal(router.queryParams.array4[1], 5);
      equal(router.queryParams.array4[2], 6);
      equal(router.queryParams.array4[3], 8);
      equal(router.queryParams.array4[4], 9);
    });

    test("routes (decoding with 2 repeated values)", 4, function() {
      var route = 'search/nyc/p10?f.foo.bar=foo%20%2B%20bar&f.foo.bar=hello%20qux';
      Backbone.history.navigate(route, {trigger: true});
      Backbone.history.checkUrl();
      equal(router.query, 'nyc');
      equal(router.page, '10');
      equal(router.queryParams.f.foo.bar[0], 'foo + bar');
      equal(router.queryParams.f.foo.bar[1], 'hello qux');
    });

    test("routes (decoding with 3 repeated values)", 5, function() {
      var route = 'search/nyc/p10?f.foo.bar=foo%20%2B%20bar&f.foo.bar=hello%20qux&f.foo.bar=baz%20baz';
      Backbone.history.navigate(route, {trigger: true});
      Backbone.history.checkUrl();
      equal(router.query, 'nyc');
      equal(router.page, '10');
      equal(router.queryParams.f.foo.bar[0], 'foo + bar');
      equal(router.queryParams.f.foo.bar[1], 'hello qux');
      equal(router.queryParams.f.foo.bar[2], 'baz baz');
    });

    test("routes (with array[] structure)", 9, function() {
      var route = 'search/nyc/p10?a=b&b[]=x&b[]=y&b[]=z&c=y&d[]=z';
      Backbone.history.navigate(route, {trigger: true});
      Backbone.history.checkUrl();
      equal(router.query, 'nyc');
      equal(router.page, '10');
      equal(router.queryParams.a, 'b');
      equal(router.queryParams.b.length, 3);
      equal(router.queryParams.b[0], 'x');
      equal(router.queryParams.b[1], 'y');
      equal(router.queryParams.b[2], 'z');
      equal(router.queryParams.c, 'y');
      equal(router.queryParams.d, 'z');
    });

    test("routes (optional)", 2, function() {
      Backbone.history.navigate('optional', {trigger: true});
      Backbone.history.checkUrl();
      equal(router.arg, null);

      Backbone.history.navigate('optional/42', {trigger: true});
      Backbone.history.checkUrl();
      equal(router.arg, 42);
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
          "search2/:query/p:page":       "search",
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

    test("getQueryParameters", 2, function() {
      new Backbone.Router();
      deepEqual(Backbone.history.getQueryParameters('?cmpid'), {cmpid: ""});
      deepEqual(Backbone.history.getQueryParameters('?cmpid='), {cmpid: ""});
    });

    test("url parameters decoded", 2, function(){
      var route = 'search/nyc/p10?foo=bar%20%3A+baz&qux=foo',
          params = Backbone.history.getQueryParameters(route);
      equal(params.foo, 'bar : baz');
      equal(params.qux, 'foo');
    });

    test("querystring space decoding", 2, function(){
      var route = '?search=text+%3D%20%22foo+bar%22',
          expectedParams = {search: 'text = "foo bar"'};

      deepEqual(Backbone.history.getQueryParameters(route), expectedParams);

      var Router = Backbone.Router.extend({
        namedParameters: true,
        routes: {
          "": "search",
        },
        search : function(queryParams) {
          this.queryParams = queryParams;
        }
      });
      var router = new Router();
      Backbone.history.navigate(route, {trigger: true});
      deepEqual(router.queryParams, expectedParams);
    });

    test("complex wildcard", function() {
      var regex = Backbone.Router.prototype._routeToRegExp('search/*dest'),
          match = regex.exec('search/foo?bar');
      equal(match[1], 'foo');
      equal(match[2], '?bar');

      match = regex.exec('search/foo');
      equal(match[1], 'foo');
      equal(match[2], undefined);
    });
  }

  queryParams(true, true);
  queryParams(true, false);
  queryParams(false);
});
