var http = require('http');
var https = require('https');
var servStream = require(__dirname + '/../fileserver/fileserver.js').servStream;
var url = require('url');

var CONTENT_TYPE = /[-\w]+\/[-\w]+/;
module.exports = function() {
	return function(res, headers) {
		try {
			var parsed = url.parse(headers.url, true);
			if (parsed.protocol === 'http:') var requestlib = http;
			else requestlib = https;
			var request = requestlib.request({
				hostname: parsed.hostname,
				path: parsed.path,
				query: parsed.query,
				method: headers.method || 'GET'
			}, function(response) {
				var contentTypeMatch = CONTENT_TYPE.exec(response.headers['content-type']);
				servStream(res, contentTypeMatch && contentTypeMatch[0], response, response.statusCode);
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