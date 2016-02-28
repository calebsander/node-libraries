var fs = require('fs');
const zlib = require('zlib');
var mime = require('mime').types;

function serv(res, filename, data) {
	const mimeType = mime[filename.substr(filename.lastIndexOf('.') + 1, filename.length)];
	res.setHeader('content-type', mimeType);
	res.setHeader('charset', 'utf-8');
	if (mimeType.startsWith('text/') || mimeType == 'application/json') { //only compress text files
		res.setHeader('content-encoding', 'gzip');
		zlib.gzip(data, (err, zipped) => res.end(zipped));
	}
	else res.end(data);
}
module.exports = function(rootdir, disallow_updir, return404) {
	if (!return404) {
		return404 = function(res404) {
			res404.writeHead(404);
			res404.end();
		};
	}
	return function(res, url) {
		var filename = rootdir + url;
		if (disallow_updir && url.indexOf('..') != -1) return404(res);
		else if (url.lastIndexOf('.') != -1) {
			fs.readFile(filename, function(err, data) {
				if (err) return404(res);
				else {
					serv(res, filename, data);
					return true;
				}
			});
		}
		else {
			if (filename[filename.length - 1] == '/') {
				var tryfile = false;
				filename += 'index.html';
			}
			else {
				filename += '/index.html';
				var tryfile = true;
			}
			fs.readFile(filename, function(err, data) {
				if (err) {
					if (tryfile) {
						filename = filename.substr(0, filename.length - 11) + '.html';
						fs.readFile(filename, function(err, data) {
							if (err) return404(res);
							else serv(res, filename, data);
						});
					}
					else return404(res);
				}
				else serv(res, filename, data);
			});
		}
	}
}