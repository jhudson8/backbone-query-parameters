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

  module("Backbone.Router", {

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

  test("initialize", 1, function() {
    equal(router.testing, 101);
  });

  test("routes (simple)", 4, function() {
    location.replace('http://example.com#search/news');
    Backbone.history.checkUrl();
    equal(router.query, 'news');
    equal(router.page, void 0);
    equal(lastRoute, 'search');
    equal(lastArgs[0], 'news');
  });

  test("routes (two part)", 2, function() {
    location.replace('http://example.com#search/nyc/p10');
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
  });

  test("routes via navigate", 2, function() {
    Backbone.history.navigate('search/manhattan/p20', {trigger: true});
    equal(router.query, 'manhattan');
    equal(router.page, '20');
  });

  test("routes via navigate for backwards-compatibility", 2, function() {
    Backbone.history.navigate('search/manhattan/p20', true);
    equal(router.query, 'manhattan');
    equal(router.page, '20');
  });

  test("route precedence via navigate", 6, function(){
    // check both 0.9.x and backwards-compatibility options
    _.each([ { trigger: true }, true ], function( options ){
      Backbone.history.navigate('contacts', options);
      equal(router.contact, 'index');
      Backbone.history.navigate('contacts/new', options);
      equal(router.contact, 'new');
      Backbone.history.navigate('contacts/foo', options);
      equal(router.contact, 'load');
    });
  });

  test("loadUrl is not called for identical routes.", 0, function() {
    Backbone.history.loadUrl = function(){ ok(false); };
    location.replace('http://example.com#route');
    Backbone.history.navigate('route');
    Backbone.history.navigate('/route');
    Backbone.history.navigate('/route');
  });

  test("use implicit callback if none provided", 1, function() {
    router.count = 0;
    router.navigate('implicit', {trigger: true});
    equal(router.count, 1);
  });

  test("routes via navigate with {replace: true}", 1, function() {
    location.replace('http://example.com#start_here');
    Backbone.history.checkUrl();
    location.replace = function(href) {
      strictEqual(href, new Location('http://example.com#end_here').href);
    };
    Backbone.history.navigate('end_here', {replace: true});
  });

  test("routes (splats)", 1, function() {
    location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
    Backbone.history.checkUrl();
    equal(router.args, 'long-list/of/splatted_99args');
  });

  test("routes (optional)", 2, function() {
    location.replace('http://example.com#optional');
    Backbone.history.checkUrl();
    ok(!router.arg);
    location.replace('http://example.com#optional/thing');
    Backbone.history.checkUrl();
    equal(router.arg, 'thing');
  });

  test("routes (complex)", 3, function() {
    location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
    Backbone.history.checkUrl();
    equal(router.first, 'one/two/three');
    equal(router.part, 'part');
    equal(router.rest, 'four/five/six/seven');
  });

  test("routes (query)", 5, function() {
    location.replace('http://example.com#mandel?a=b&c=d');
    Backbone.history.checkUrl();
    equal(router.entity, 'mandel');
    equal(router.queryArgs, 'a=b&c=d');
    equal(lastRoute, 'query');
    equal(lastArgs[0], 'mandel');
    equal(lastArgs[1], 'a=b&c=d');
  });

  test("routes (anything)", 1, function() {
    location.replace('http://example.com#doesnt-match-a-route');
    Backbone.history.checkUrl();
    equal(router.anything, 'doesnt-match-a-route');
  });

  test("fires event when router doesn't have callback on it", 1, function() {
    router.on("route:noCallback", function(){ ok(true); });
    location.replace('http://example.com#noCallback');
    Backbone.history.checkUrl();
  });

  test("#933, #908 - leading slash", 2, function() {
    location.replace('http://example.com/root/foo');

    Backbone.history.stop();
    Backbone.history = _.extend(new Backbone.History, {location: location});
    Backbone.history.start({root: '/root', hashChange: false, silent: true});
    strictEqual(Backbone.history.getFragment(), 'foo');

    Backbone.history.stop();
    Backbone.history = _.extend(new Backbone.History, {location: location});
    Backbone.history.start({root: '/root/', hashChange: false, silent: true});
    strictEqual(Backbone.history.getFragment(), 'foo');
  });

  test("#1003 - History is started before navigate is called", 1, function() {
    Backbone.history.stop();
    Backbone.history.navigate = function(){ ok(Backbone.History.started); };
    Backbone.history.start();
    // If this is not an old IE navigate will not be called.
    if (!Backbone.history.iframe) ok(true);
  });

  test("#967 - Route callback gets passed encoded values.", 3, function() {
    var route = 'has%2Fslash/complex-has%23hash/has%20space';
    Backbone.history.navigate(route, {trigger: true});
    strictEqual(router.first, 'has%2Fslash');
    strictEqual(router.part, 'has%23hash');
    strictEqual(router.rest, 'has%20space');
  });

  test("correctly handles URLs with % (#868)", 3, function() {
    location.replace('http://example.com#search/fat%3A1.5%25');
    Backbone.history.checkUrl();
    location.replace('http://example.com#search/fat');
    Backbone.history.checkUrl();
    equal(router.query, 'fat');
    equal(router.page, void 0);
    equal(lastRoute, 'search');
  });

  test("#1185 - Use pathname when hashChange is not wanted.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/path/name#hash');
    Backbone.history = _.extend(new Backbone.History, {location: location});
    Backbone.history.start({hashChange: false});
    var fragment = Backbone.history.getFragment();
    strictEqual(fragment, location.pathname.replace(/^\//, ''));
  });

  test("#1206 - Strip leading slash before location.assign.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root/');
    Backbone.history = _.extend(new Backbone.History, {location: location});
    Backbone.history.start({hashChange: false, root: '/root/'});
    location.assign = function(pathname) {
      strictEqual(pathname, '/root/fragment');
    };
    Backbone.history.navigate('/fragment');
  });

  test("#1387 - Root fragment without trailing slash.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = _.extend(new Backbone.History, {location: location});
    Backbone.history.start({hashChange: false, root: '/root/', silent: true});
    strictEqual(Backbone.history.getFragment(), '');
  });

  test("#1366 - History does not prepend root to fragment.", 2, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root/');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          strictEqual(url, '/root/x');
        }
      }
    });
    Backbone.history.start({
      root: '/root/',
      pushState: true,
      hashChange: false
    });
    Backbone.history.navigate('x');
    strictEqual(Backbone.history.fragment, 'x');
  });

  test("Normalize root.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          strictEqual(url, '/root/fragment');
        }
      }
    });
    Backbone.history.start({
      pushState: true,
      root: '/root',
      hashChange: false
    });
    Backbone.history.navigate('fragment');
  });

  test("Normalize root.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root#fragment');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {},
        replaceState: function(state, title, url) {
          strictEqual(url, '/root/fragment');
        }
      }
    });
    Backbone.history.start({
      pushState: true,
      root: '/root'
    });
  });

  test("Normalize root.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = _.extend(new Backbone.History, {location: location});
    Backbone.history.loadUrl = function() { ok(true); };
    Backbone.history.start({
      pushState: true,
      root: '/root'
    });
  });

  test("Normalize root - leading slash.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(){},
        replaceState: function(){}
      }
    });
    Backbone.history.start({root: 'root'});
    strictEqual(Backbone.history.root, '/root/');
  });

  test("Transition from hashChange to pushState.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root#x/y');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(){},
        replaceState: function(state, title, url){
          strictEqual(url, '/root/x/y');
        }
      }
    });
    Backbone.history.start({
      root: 'root',
      pushState: true
    });
  });

  test("#1619: Router: Normalize empty root", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(){},
        replaceState: function(){}
      }
    });
    Backbone.history.start({root: ''});
    strictEqual(Backbone.history.root, '/');
  });

  test("#1619: Router: nagivate with empty root", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          strictEqual(url, '/fragment');
        }
      }
    });
    Backbone.history.start({
      pushState: true,
      root: '',
      hashChange: false
    });
    Backbone.history.navigate('fragment');
  });

  test("Transition from pushState to hashChange.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root/x/y?a=b');
    location.replace = function(url) {
      strictEqual(url, '/root/?a=b#x/y');
    };
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: null,
        replaceState: null
      }
    });
    Backbone.history.start({
      root: 'root',
      pushState: true
    });
  });

  test("#1695 - hashChange to pushState with search.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root?a=b#x/y');
    Backbone.history = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(){},
        replaceState: function(state, title, url){
          strictEqual(url, '/root/x/y?a=b');
        }
      }
    });
    Backbone.history.start({
      root: 'root',
      pushState: true
    });
  });

  test("#1746 - Router allows empty route.", 1, function() {
    var Router = Backbone.Router.extend({
      routes: {'': 'empty'},
      empty: function(){},
      route: function(route){
        strictEqual(route, '');
      }
    });
    new Router;
  });

  test("#1794 - Trailing space in fragments.", 1, function() {
    var history = new Backbone.History;
    strictEqual(history.getFragment('fragment   '), 'fragment');
  });

  test("#1820 - Leading slash and trailing space.", 1, function() {
    var history = new Backbone.History;
    strictEqual(history.getFragment('/fragment '), 'fragment');
  });

  test("#1980 - Optional parameters.", 2, function() {
    location.replace('http://example.com#named/optional/y');
    Backbone.history.checkUrl();
    strictEqual(router.z, undefined);
    location.replace('http://example.com#named/optional/y123');
    Backbone.history.checkUrl();
    strictEqual(router.z, '123');
  });


  module("backbone.queryParams", {

    setup: function() {
      location = new Location('http://example.com');
      Backbone.history = _.extend(new Backbone.History, {location: location});
      router = new Router({testing: 101});
      Backbone.history.interval = 9;
      Backbone.history.start({pushState: false});
      lastRoute = null;
      lastArgs = [];
      Backbone.history.on('route', onRoute);

      Backbone.Router.decodeParams = true;
    },

    teardown: function() {
      Backbone.history.stop();
      Backbone.history.off('route', onRoute);
      Backbone.Router.decodeParams = false;
      router.queryParams = undefined;
    }

  });

  /** QUERY PARAMS TEST **/

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

  test("routes (two part - query params - hash and list - location)", 23, function() {
    var route = 'search/nyc/p10?a=b&a2=x&a2=y&a3=x&a3=y&a3=z&b.c=d&b.d=e&b.e.f=g&array1=|a&array2=a|b&array3=|c|d&array4=|e%7C';
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

  test("routes (two part - query params - hash and list - navigate)", 15, function() {
    var route = router.toFragment('search/nyc/p10', {
      a:'l', b:{c: 'n', d:'m', e:{f: 'o'}}, array1:['p'], array2:['q', 'r'], array3:['s','t','|']
    });
    Backbone.history.navigate(route, {trigger: true});
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
    equal(router.queryParams.a, 'l');
    equal(router.queryParams.b.c, 'n');
    equal(router.queryParams.b.d, 'm');
    equal(router.queryParams.b.e.f, 'o');
    equal(router.queryParams.array1.length, 1);
    equal(router.queryParams.array1[0], 'p');
    equal(router.queryParams.array2.length, 2);
    equal(router.queryParams.array2[0], 'q');
    equal(router.queryParams.array2[1], 'r');
    equal(router.queryParams.array3.length, 3);
    equal(router.queryParams.array3[0], 's');
    equal(router.queryParams.array3[1], 't');
    equal(router.queryParams.array3[2], '|');
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
      },
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
