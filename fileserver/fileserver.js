var fs = require('fs');
const zlib = require('zlib');
var mime = require('mime').types;

function isText(mimeType) {
	return mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript';
}
function serv(res, fileName, statusCode) {
	servStream(res, mime[fileName.substr(fileName.lastIndexOf('.') + 1, fileName.length)], fs.createReadStream(fileName), statusCode);
}
function servStream(res, mimeType, stream, statusCode) {
	mimeType = mimeType || 'application/octet-stream';
	statusCode = statusCode || 200;
	if (isText(mimeType)) { //only compress text files
		res.setHeader('Content-Type', mimeType + '; charset=UTF-8');
		res.setHeader('Content-Encoding', 'gzip');
		res.writeHead(statusCode);
		stream.pipe(zlib.createGzip()).pipe(res);
	}
	else {
		res.setHeader('Content-Type', mimeType);
		res.writeHead(statusCode);
		stream.pipe(res);
	}
}
const ENDING = '.html';
const DEFAULT_FILE = 'index' + ENDING;
const FOLDER_TO_DEFAULT_FILE = '/' + DEFAULT_FILE;
module.exports = function(rootdir, disallow_updir, return404) {
	if (return404 === undefined) {
		return404 = function(res404) {
			res404.writeHead(404);
			res404.end();
		};
	}
	else if (return404.constructor === String) {
		return404 = (function(fileFor404) {
			return function(res404) {
				serv(res404, fileFor404, 404);
			};
		}(return404));
	}
	return function(res, url) {
		var fileName = rootdir + url;
		if (disallow_updir && url.indexOf('..') !== -1) return404(res);
		else {
			if (url.lastIndexOf('.') === -1) {
				if (fileName[fileName.length - 1] === '/') {
					var tryFile = false;
					fileName += DEFAULT_FILE;
				}
				else {
					var tryFile = true;
					fileName += FOLDER_TO_DEFAULT_FILE;
				}
				fs.stat(fileName, function(err, stats) {
					if (err) {
						if (tryFile) {
							fileName = fileName.substr(0, fileName.length - FOLDER_TO_DEFAULT_FILE.length) + ENDING;
							fs.stat(fileName, function(err, stats) {
								if (err) return404(res);
								else serv(res, fileName);
							});
						}
						else return404(res);
					}
					else serv(res, fileName);
				});
			}
			else {
				fs.stat(fileName, function(err, stats) {
					if (err) return404(res);
					else serv(res, fileName);
				});
			}
		}
	}
};
module.exports.servStream = servStream;