'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stackPackRequest = require('stack-pack-request');

var _stackPackRequest2 = _interopRequireDefault(_stackPackRequest);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var handshakeRequired = true;

var attachProxy = function attachProxy(opts) {
  var app = opts.app,
      apiUrl = opts.apiUrl;


  app.use('/gpapi/ping', function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res, next) {
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              res.send('The GPAPI proxy is alive and relaying to: ' + apiUrl);

            case 1:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }());

  app.use('/gpapi', function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res, next) {
      var url, resPost, resGet, err;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;
              _context2.next = 3;
              return ensureApplicationToken(opts);

            case 3:
              _context2.next = 5;
              return ensureUserToken(opts);

            case 5:
              url = '' + apiUrl + req.path + '/' + app.get('user-token');
              _context2.t0 = req.method;
              _context2.next = _context2.t0 === 'POST' ? 9 : _context2.t0 === 'GET' ? 14 : 20;
              break;

            case 9:
              _context2.next = 11;
              return _stackPackRequest2.default.post(url, req.body);

            case 11:
              resPost = _context2.sent;

              res.send(resPost);
              return _context2.abrupt('break', 21);

            case 14:
              url += '' + getQueryString(req.url);
              _context2.next = 17;
              return _stackPackRequest2.default.get(url);

            case 17:
              resGet = _context2.sent;

              res.json(resGet);
              return _context2.abrupt('break', 21);

            case 20:
              throw new Error('The requested method is not supported: ' + req.method);

            case 21:
              _context2.next = 29;
              break;

            case 23:
              _context2.prev = 23;
              _context2.t1 = _context2['catch'](0);
              err = new Error('GP API proxy call failed.');

              err.inner = _context2.t1;
              _winston2.default.error(_util2.default.inspect(err));
              res.sendStatus(err.inner.StatusCode);

            case 29:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, undefined, [[0, 23]]);
    }));

    return function (_x4, _x5, _x6) {
      return _ref2.apply(this, arguments);
    };
  }());
};

var ensureApplicationToken = function () {
  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(opts) {
    var app;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            app = opts.app;

            if (!app.get('application-token')) {
              _context3.next = 3;
              break;
            }

            return _context3.abrupt('return');

          case 3:
            _context3.next = 5;
            return setTokens(opts);

          case 5:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  }));

  return function ensureApplicationToken(_x7) {
    return _ref3.apply(this, arguments);
  };
}();

var ensureUserToken = function () {
  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(opts) {
    var app, apiUrl, url, payload;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            app = opts.app, apiUrl = opts.apiUrl;
            url = apiUrl + '/security/validate/user';
            payload = { ApplicationToken: app.get('application-token'), UserToken: app.get('user-token') };
            _context4.prev = 3;
            _context4.next = 6;
            return _stackPackRequest2.default.post(url, payload);

          case 6:
            _context4.next = 27;
            break;

          case 8:
            _context4.prev = 8;
            _context4.t0 = _context4['catch'](3);

            if (!(_context4.t0.Name === 'NoUserForToken')) {
              _context4.next = 26;
              break;
            }

            _context4.prev = 11;
            _context4.next = 14;
            return resetUserToken(opts);

          case 14:
            _context4.next = 24;
            break;

          case 16:
            _context4.prev = 16;
            _context4.t1 = _context4['catch'](11);

            if (!(_context4.t1.Name === 'NoApplicationForToken')) {
              _context4.next = 23;
              break;
            }

            _context4.next = 21;
            return setTokens(opts);

          case 21:
            _context4.next = 24;
            break;

          case 23:
            throw _context4.t1;

          case 24:
            _context4.next = 27;
            break;

          case 26:
            throw _context4.t0;

          case 27:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined, [[3, 8], [11, 16]]);
  }));

  return function ensureUserToken(_x8) {
    return _ref4.apply(this, arguments);
  };
}();

var getQueryString = function getQueryString(url) {
  return url.indexOf('?') > -1 ? '?' + url.substr(url.indexOf('?') + 1) : '';
};

var setTokens = function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(opts) {
    var health, applicationToken, userToken;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return apiCheck();

          case 2:
            health = _context5.sent;
            _context5.next = 5;
            return setApplicationToken(opts);

          case 5:
            applicationToken = _context5.sent;
            _context5.next = 8;
            return setUserToken(opts);

          case 8:
            userToken = _context5.sent;

            _winston2.default.info('GP API\n      - api-url     : ' + health.url + '\n      - api-ping    : ' + health.ping + '\n      - db-check    : ' + health.db + '\n      - app-token   : ' + applicationToken + '\n      - user-token  : ' + userToken);

          case 10:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, undefined);
  }));

  return function setTokens(_x9) {
    return _ref5.apply(this, arguments);
  };
}();

var setApplicationToken = function () {
  var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(_ref7) {
    var app = _ref7.app,
        apiUrl = _ref7.apiUrl,
        keyPublic = _ref7.keyPublic,
        keyPrivate = _ref7.keyPrivate;

    var _ref8, IV, Token, secret, vector, encrypted, decipher, decrypted, application;

    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return _stackPackRequest2.default.get(apiUrl + '/security/encryptedToken/application/' + keyPublic);

          case 2:
            _ref8 = _context6.sent;
            IV = _ref8.IV;
            Token = _ref8.Token;
            secret = new Buffer(keyPrivate, 'utf-8');
            vector = new Buffer(IV, 'base64');
            encrypted = new Buffer(Token, 'base64');
            decipher = _crypto2.default.createDecipheriv('des3', secret, vector);
            decrypted = decipher.update(encrypted, 'binary', 'ascii');

            decrypted += decipher.final('ascii');
            _context6.next = 13;
            return _stackPackRequest2.default.get(apiUrl + '/security/login/application/' + keyPublic + '/' + decrypted);

          case 13:
            application = _context6.sent;

            app.set('application-token', application.Token);
            return _context6.abrupt('return', app.get('application-token'));

          case 16:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, undefined);
  }));

  return function setApplicationToken(_x10) {
    return _ref6.apply(this, arguments);
  };
}();

var setUserToken = function () {
  var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(_ref10) {
    var app = _ref10.app,
        apiUrl = _ref10.apiUrl,
        keyAdmin = _ref10.keyAdmin;

    var url, payload, _ref11, token;

    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            url = apiUrl + '/security/login/application/gpapi';
            payload = { ApplicationToken: app.get('application-token') };
            _context7.next = 4;
            return _stackPackRequest2.default.post(url, payload);

          case 4:
            _ref11 = _context7.sent;
            token = _ref11.token;

            app.set('user-token', token);
            return _context7.abrupt('return', token);

          case 8:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, undefined);
  }));

  return function setUserToken(_x11) {
    return _ref9.apply(this, arguments);
  };
}();

var resetUserToken = function () {
  var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(opts) {
    var token;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            _context8.next = 2;
            return setUserToken(opts);

          case 2:
            token = _context8.sent;

            _winston2.default.info('GP API - reset user-token = ' + token);

          case 4:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, undefined);
  }));

  return function resetUserToken(_x12) {
    return _ref12.apply(this, arguments);
  };
}();

var apiCheck = undefined;
var attachCheck = function () {
  var _ref13 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(_ref14) {
    var apiUrl = _ref14.apiUrl;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            apiCheck = function () {
              var _ref15 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9() {
                return regeneratorRuntime.wrap(function _callee9$(_context9) {
                  while (1) {
                    switch (_context9.prev = _context9.next) {
                      case 0:
                        _context9.t0 = apiUrl;
                        _context9.next = 3;
                        return _stackPackRequest2.default.get(apiUrl + '/', { timeout: 3000 });

                      case 3:
                        _context9.t1 = _context9.sent;
                        _context9.next = 6;
                        return _stackPackRequest2.default.get(apiUrl + '/db-check', { timeout: 10000 });

                      case 6:
                        _context9.t2 = _context9.sent;
                        return _context9.abrupt('return', {
                          url: _context9.t0,
                          ping: _context9.t1,
                          db: _context9.t2
                        });

                      case 8:
                      case 'end':
                        return _context9.stop();
                    }
                  }
                }, _callee9, undefined);
              }));

              return function apiCheck() {
                return _ref15.apply(this, arguments);
              };
            }();

          case 1:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, undefined);
  }));

  return function attachCheck(_x13) {
    return _ref13.apply(this, arguments);
  };
}();

var check = function () {
  var _ref16 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11() {
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            _context11.next = 2;
            return apiCheck();

          case 2:
            return _context11.abrupt('return', _context11.sent);

          case 3:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, undefined);
  }));

  return function check() {
    return _ref16.apply(this, arguments);
  };
}();

var apiGetProfileFromToken = undefined;
var attachGetProfileFromToken = function () {
  var _ref17 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee13(_ref18) {
    var apiUrl = _ref18.apiUrl;
    return regeneratorRuntime.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            apiGetProfileFromToken = function () {
              var _ref19 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(app, userToken) {
                var user, profile, hierarchy;
                return regeneratorRuntime.wrap(function _callee12$(_context12) {
                  while (1) {
                    switch (_context12.prev = _context12.next) {
                      case 0:
                        _context12.next = 2;
                        return _stackPackRequest2.default.get(apiUrl + '/security/login/user/token/' + userToken);

                      case 2:
                        user = _context12.sent;
                        profile = { nameId: user.Id, firstname: user.FirstName, lastname: user.LastName, email: user.Email, token: userToken };

                        if (!user.SubscriptionId) {
                          _context12.next = 10;
                          break;
                        }

                        _context12.next = 7;
                        return _stackPackRequest2.default.get('/hierarchy/subscription/' + user.SubscriptionId + '/' + userToken);

                      case 7:
                        hierarchy = _context12.sent;

                        profile.client = { id: hierarchy.ClientId, name: hierarchy.ClientName };
                        profile.subscription = { id: hierarchy.SubscriptionId, name: hierarchy.SubscriptionName };

                      case 10:
                        return _context12.abrupt('return', profile);

                      case 11:
                      case 'end':
                        return _context12.stop();
                    }
                  }
                }, _callee12, undefined);
              }));

              return function apiGetProfileFromToken(_x15, _x16) {
                return _ref19.apply(this, arguments);
              };
            }();

          case 1:
          case 'end':
            return _context13.stop();
        }
      }
    }, _callee13, undefined);
  }));

  return function attachGetProfileFromToken(_x14) {
    return _ref17.apply(this, arguments);
  };
}();

var getProfileFromToken = function () {
  var _ref20 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee14(app, userToken) {
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            return _context14.abrupt('return', apiGetProfileFromToken(app, userToken));

          case 1:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, undefined);
  }));

  return function getProfileFromToken(_x17, _x18) {
    return _ref20.apply(this, arguments);
  };
}();

var requiresHandshake = function requiresHandshake() {
  return handshakeRequired === true;
};

var handshake = function () {
  var _ref21 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee15(opts) {
    var err;
    return regeneratorRuntime.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            _context15.prev = 0;

            attachCheck(opts);
            attachGetProfileFromToken(opts);
            attachProxy(opts);
            _context15.next = 6;
            return setTokens(opts);

          case 6:
            handshakeRequired = false;
            _context15.next = 14;
            break;

          case 9:
            _context15.prev = 9;
            _context15.t0 = _context15['catch'](0);
            err = new Error('A call to the GP API has failed');

            err.inner = _context15.t0;
            throw err;

          case 14:
          case 'end':
            return _context15.stop();
        }
      }
    }, _callee15, undefined, [[0, 9]]);
  }));

  return function handshake(_x19) {
    return _ref21.apply(this, arguments);
  };
}();

var get = function () {
  var _ref22 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee16(path, opts) {
    return regeneratorRuntime.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            if (path.startsWith('/')) {
              path = path.substring(1);
            }
            _context16.next = 3;
            return _stackPackRequest2.default.get(process.env.API_ROOT + '/gpapi/' + path, opts);

          case 3:
            return _context16.abrupt('return', _context16.sent);

          case 4:
          case 'end':
            return _context16.stop();
        }
      }
    }, _callee16, undefined);
  }));

  return function get(_x20, _x21) {
    return _ref22.apply(this, arguments);
  };
}();

var post = function () {
  var _ref23 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee17(path, payload, opts) {
    return regeneratorRuntime.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            if (path.startsWith('/')) {
              path = path.substring(1);
            }
            _context17.next = 3;
            return _stackPackRequest2.default.post(process.env.API_ROOT + '/gpapi/' + path, payload, opts);

          case 3:
            return _context17.abrupt('return', _context17.sent);

          case 4:
          case 'end':
            return _context17.stop();
        }
      }
    }, _callee17, undefined);
  }));

  return function post(_x22, _x23, _x24) {
    return _ref23.apply(this, arguments);
  };
}();

exports.default = { handshake: handshake, requiresHandshake: requiresHandshake, get: get, post: post, check: check, getProfileFromToken: getProfileFromToken };