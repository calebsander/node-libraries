var http = require('http');
var https = require('https');
var url = require('url');

module.exports = function() {
	return function(res, headers) {
		try {
			var parsed = url.parse(headers.url, true);
			if (parsed.protocol == 'http:') var requestlib = http;
			else requestlib = https;
			var request = requestlib.request({
				hostname: parsed.hostname,
				path: parsed.path,
				query: parsed.query,
				method: headers.method
			}, function(response) {
				response.on('data', function(chunk) {
					res.write(chunk);
				});
				response.on('end', function() {
					res.end();
				});
			});
			request.on('error', function(err) {
				res.end();
			});
			if (headers.data) request.write(req.headers.data);
			request.end();
		}
		catch (err) {
			console.log(err);
			res.end();
		}
	};
}