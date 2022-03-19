const parseCookies = (req, res, next) => {
  var cookies = req.headers.cookie;
  if (cookies === undefined) {
    req.cookies = {};
  } else {
    cookies = cookies.split(/[; =]+/);
    var n = cookies.length;
    req.cookies = {};
    for (var i = 0; i < n; i = i + 2) {
      var key = cookies[i];
      var value = cookies[i + 1];
      req.cookies[key] = value;
    }
  }
  next();
};

module.exports = parseCookies;