(function() {

var queryStringParam = /^\?(.*)/;
var namedParam    = /:([\w\d]+)/g;
var splatParam    = /\*([\w\d]+)/g;
var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;

_.extend(Backbone.Router.prototype, {
  getFragment : function(fragment, forcePushState, excludeQueryString) {
    if (fragment == null) {
      if (this._hasPushState || forcePushState) {
        fragment = window.location.pathname;
        var search = window.location.search;
        if (search) fragment += search;
      } else {
        fragment = window.location.hash;
      }
    }
    fragment = fragment.replace(hashStrip, '');
    if (excludeQueryString) {
      fragment = fragment.replace(queryStrip, '');
    }
    if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
    return fragment;
  },
  
  _routeToRegExp : function(route) {
    route = route.replace(escapeRegExp, "\\$&")
                 .replace(namedParam, "([^\/?]*)")
                 .replace(splatParam, "([^\?]*)");
    route += '([\?]{1}.*)?';
    return new RegExp('^' + route + '$');
  },

  /**
   * Given a route, and a URL fragment that it matches, return the array of
   * extracted parameters.
   */
  _extractParameters : function(route, fragment) {
    var params = route.exec(fragment).slice(1);

    // do we have an additional query string?
    var match = params.length && params[params.length-1] && params[params.length-1].match(queryStringParam);
    if (match) {
      var queryString = match[1];
      var data = {};
      if (queryString) {
        var keyValues = queryString.split('&');
        var self = this;
        _.each(keyValues, function(keyValue) {
          var arr = keyValue.split('=');
          if (arr.length > 1 && arr[1]) {
            self._setParamValue(arr[0], arr[1], data);
          }
        });
      }
      params[params.length-1] = data;
    }

    // decode params
    for (var i=0; i<params.length; i++) {
      if (_.isString(params[i])) {
        params[i] = decodeURIComponent(params[i]);
      }
    }

    return params;
  },

  /**
   * Set the parameter value on the data hash
   */
  _setParamValue : function(key, value, data) {
    // use '.' to define hash separators
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
  _decodeParamValue : function(value, currentValue) {
    // '|' will indicate an array.  Array with 1 value is a=|b - multiple values can be a=b|c
    if (value.indexOf('|') >= 0) {
      var values = value.split('|');
      // clean it up
      for (var i=values.length-1; i>=0; i--) {
        if (!values[i]) {
          values.splice(i, 1);
        } else {
          values[i] = decodeURIComponent(values[i])
        }
      }
      return values;
    }
    if (!currentValue) {
      return decodeURIComponent(value);
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
        queryParameters = this._toQueryString(queryParameters);
      }
      route += '?' + queryParameters;
    }
    return route;
  },

  /**
   * Serialize the val hash to query parameters and return it.  Use the namePrefix to prefix all param names (for recursion)
   */
  _toQueryString: function(val, namePrefix) {
    if (!val) return '';
    namePrefix = namePrefix || '';
    var rtn = '';
    for (var name in val) {
      var _val = val[name];
      if (_.isString(_val) || _.isNumber(_val) || _.isBoolean(_val) || _.isDate(_val)) {
        // primitave type
        _val = this._toQueryParam(_val);
        if (_.isBoolean(_val) || _val) {
          rtn += (rtn ? '&' : '') + this._toQueryParamName(name, namePrefix) + '=' + encodeURIComponent(_val).replace('|', '%7C');
        }
      } else if (_.isArray(_val)) {
        // arrrays use | separator
        var str = '';
        for (var i in _val) {
          var param = this._toQueryParam(_val[i]);
          if (_.isBoolean(param) || param) {
            str += '|' + encodeURIComponent(param).replace('|', '%7C');
          }
        }
        if (str) {
          rtn += (rtn ? '&' : '') + this._toQueryParamName(name, namePrefix) + '=' + str;
        }
      } else {
        // dig into hash
        var result = this._toQueryString(_val, this._toQueryParamName(name, namePrefix, true));
        if (result) {
          rtn += (rtn ? '&' : '') + result;
        }
      }
    }
    return rtn;
  },

  /**
   * return the actual parameter name
   * @param name the parameter name
   * @param namePrefix the prefix to the name
   * @param createPrefix true if we're creating a name prefix, false if we're creating the name
   */
  _toQueryParamName: function(name, prefix, isPrefix) {
    return (prefix + name + (isPrefix ? '.' : ''));
  },

  /**
   * Return the string representation of the param used for the query string
   */
  _toQueryParam: function (param) {
    if (_.isNull(param) || _.isUndefined(param)) {
      return null;
    }
    if (_.isDate(param)) {
      return param.getDate().getTime();
    }
    return param;
  }
});
})();