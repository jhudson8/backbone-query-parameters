(function (root, factory) {
   if (typeof exports === 'object' && root.require) {
     module.exports = factory(require("underscore"), require("backbone"));
   } else if (typeof define === "function" && define.amd) {
      // AMD. Register as an anonymous module.
      define(["underscore","backbone"], function(_, Backbone) {
        // Use global variables if the locals are undefined.
        return factory(_ || root._, Backbone || root.Backbone);
      });
   } else {
      // RequireJS isn't being used. Assume underscore and backbone are loaded in <script> tags
      factory(_, Backbone);
   }
}(this, function(_, Backbone) {

var queryStringParam = /^\?(.*)/,
    optionalParam = /\((.*?)\)/g,
    namedParam    = /(\(\?)?:\w+/g,
    splatParam    = /\*\w+/g,
    escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g,
    fragmentStrip = /^([^\?]*)/,
    namesPattern = /[\:\*]([^\:\?\/]+)/g,
    routeStripper = /^[#\/]|\s+$/g,
    trailingSlash = /\/$/;
Backbone.Router.arrayValueSplit = '|';

var deserialize = function (str, options) {
  str = str[0] === '?' ? str.substring(1) : str;
  var pairs = str.split(/&amp;|&/i),
      h = {},
      options = options || {};
  if (!str) return h;
  for(var i = 0; i < pairs.length; i++) {
      var kv = pairs[i].split('=');
      kv[0] = decodeURIComponent(kv[0]);
      if(!options.except || options.except.indexOf(kv[0]) == -1) {
          if((/^\w+\[\w+\]$/).test(kv[0])) {
              var matches = kv[0].match(/^(\w+)\[(\w+)\]$/);
              if(typeof h[matches[1]] === 'undefined') {
                  h[matches[1]] = {};
              }
              h[matches[1]][matches[2]] = decodeURIComponent(kv[1]);
          } else {
              h[kv[0]] = decodeURIComponent(kv[1]);
          }
      }
  }
  return h;
};

_.extend(Backbone.History.prototype, {
  getFragment: function(fragment, forcePushState) {
    /*jshint eqnull:true */
    if (fragment == null) {
      if (this._hasPushState || !this._wantsHashChange || forcePushState) {
        fragment = this.location.pathname;
        var root = this.root.replace(trailingSlash, '');
        var search = this.location.search;
        if (!fragment.indexOf(root)) {
          fragment = fragment.substr(root.length);
        }
        if (search && this._hasPushState) {
          fragment += search;
        }
      } else {
        fragment = this.getHash();
      }
    }
    return fragment.replace(routeStripper, '');
  },

  // this will not perform custom query param serialization specific to the router
  // but will return a map of key/value pairs (the value is a string or array)
  getQueryParameters: function(fragment, forcePushState) {
    fragment = this.getFragment(fragment, forcePushState);
    // if no query string exists, this will still be the original fragment
    var queryString = fragment.replace(fragmentStrip, '');
    var match = queryString.match(queryStringParam);
    if (match) {
      queryString = match[1];
      var rtn = deserialize(queryString);
      return rtn;
    } else {
      // no values
      return {};
    }
  }
});

_.extend(Backbone.Router.prototype, {
  initialize: function(options) {
    this.encodedSplatParts = options && options.encodedSplatParts;
  },

  _routeToRegExp: function(route) {
    var splatMatch = (splatParam.exec(route) || {index: -1}),
        namedMatch = (namedParam.exec(route) || {index: -1}),
        paramNames = route.match(namesPattern) || [];

    route = route.replace(escapeRegExp, '\\$&')
                 .replace(optionalParam, '(?:$1)?')
                 .replace(namedParam, function(match, optional){
                   return optional ? match : '([^\\/\\?]+)';
                 })
                 // `[^??]` is hacking around a regular expression bug under iOS4.
                 // If only `[^?]` is used then paths like signin/photos will fail
                 // while paths with `?` anywhere, like `signin/photos?`, will succeed.
                 .replace(splatParam, '([^??]*?)');
    route += '(\\?.*)?';
    var rtn = new RegExp('^' + route + '$');

    // use the rtn value to hold some parameter data
    if (splatMatch.index >= 0) {
      // there is a splat
      if (namedMatch >= 0) {
        // negative value will indicate there is a splat match before any named matches
        rtn.splatMatch = splatMatch.index - namedMatch.index;
      } else {
        rtn.splatMatch = -1;
      }
    }
    rtn.paramNames = _.map(paramNames, function(name) { return name.substring(1); });
    rtn.namedParameters = this.namedParameters;

    return rtn;
  },

  /**
   * Given a route, and a URL fragment that it matches, return the array of
   * extracted parameters.
   */
  _extractParameters: function(route, fragment) {
    var params = route.exec(fragment).slice(1),
        namedParams = {};
    if (params.length > 0 && _.isUndefined(params[params.length - 1])) {
      // remove potential invalid data from query params match
      params.splice(params.length - 1, 1);
    }

    // do we have an additional query string?
    var match = params.length && params[params.length-1] && params[params.length-1].match(queryStringParam);
    if (match) {
      var queryString = match[1];
      var data = {};
      if (queryString) {
        var self = this;
        data = deserialize(queryString);
      }
      params[params.length-1] = data;
      _.extend(namedParams, data);
    }

    // decode params
    var length = params.length;
    if (route.splatMatch && this.encodedSplatParts) {
      if (route.splatMatch < 0) {
        // splat param is first
        return params;
      } else {
        length = length - 1;
      }
    }

    for (var i=0; i<length; i++) {
      if (_.isString(params[i])) {
        params[i] = parseParams(params[i]);
        if (route.paramNames && route.paramNames.length >= i-1) {
          namedParams[route.paramNames[i]] = params[i];
        }
      }
    }

    return (Backbone.Router.namedParameters || route.namedParameters) ? [namedParams] : params;
  },

  /**
   * Set the parameter value on the data hash
   */
  _setParamValue: function(key, value, data) {
    // use '.' to define hash separators
    key = key.replace('[]', '');
    key = key.replace('%5B%5D', '');
    var parts = key.split('.');
    var _data = data;
    for (var i=0; i<parts.length; i++) {
      var part = parts[i];
      if (i === parts.length-1) {
        // set the value
        _data[part] = this._decodeParamValue(value, _data[part]);
      } else {
        _data = _data[part] = _data[part] || {};
      }
    }
  },

  /**
   * Decode an individual parameter value (or list of values)
   * @param value the complete value
   * @param currentValue the currently known value (or list of values)
   */
  _decodeParamValue: function(value, currentValue) {
    // '|' will indicate an array.  Array with 1 value is a=|b - multiple values can be a=b|c
    var splitChar = Backbone.Router.arrayValueSplit;
    if (splitChar && value.indexOf(splitChar) >= 0) {
      var values = value.split(splitChar);
      // clean it up
      for (var i=values.length-1; i>=0; i--) {
        if (!values[i]) {
          values.splice(i, 1);
        } else {
          values[i] = parseParams(values[i]);
        }
      }
      return values;
    }

    value = parseParams(value);
    if (!currentValue) {
      return value;
    } else if (_.isArray(currentValue)) {
      currentValue.push(value);
      return currentValue;
    } else {
      return [currentValue, value];
    }
  },

  /**
   * Return the route fragment with queryParameters serialized to query parameter string
   */
  toFragment: function(route, queryParameters) {
    if (queryParameters) {
      if (!_.isString(queryParameters)) {
        queryParameters = toQueryString(queryParameters);
      }
      if(queryParameters) {
        route += '?' + queryParameters;
      }
    }
    return route;
  }
});


/**
 * Serialize the val hash to query parameters and return it.  Use the namePrefix to prefix all param names (for recursion)
 */
function toQueryString(val, namePrefix) {
  /*jshint eqnull:true */
  var splitChar = Backbone.Router.arrayValueSplit;
  function encodeSplit(val) { return String(val).replace(splitChar, encodeURIComponent(splitChar)); }

  if (!val) {
    return '';
  }

  namePrefix = namePrefix || '';
  var rtn = [];
  _.each(val, function(_val, name) {
    name = namePrefix + name;

    if (_.isString(_val) || _.isNumber(_val) || _.isBoolean(_val) || _.isDate(_val)) {
      // primitive type
      if (_val != null) {
        rtn.push(name + '=' + encodeSplit(encodeURIComponent(_val)));
      }
    } else if (_.isArray(_val)) {
      // arrays use Backbone.Router.arrayValueSplit separator
      var str = '';
      for (var i = 0; i < _val.length; i++) {
        var param = _val[i];
        if (param != null) {
          str += splitChar + encodeSplit(param);
        }
      }
      if (str) {
        rtn.push(name + '=' + str);
      }
    } else {
      // dig into hash
      var result = toQueryString(_val, name + '.');
      if (result) {
        rtn.push(result);
      }
    }
  });

  return rtn.join('&');
}

function parseParams(value) {
  // decodeURIComponent doesn't touch '+'
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch (err) {
    // Failover to whatever was passed if we get junk data
    return value;
  }
}

function iterateQueryString(queryString, callback) {
  var keyValues = queryString.split('&');
  _.each(keyValues, function(keyValue) {
    var arr = keyValue.split('=');
    callback(arr.shift(), arr.join('='));
  });
}

}));
