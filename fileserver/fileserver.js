var crypto = require('crypto');
var fs = require('fs');
var zlib = require('zlib');
var mime = require('mime').types;

function isText(mimeType) {
	return mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/javascript';
}
function createEtagHeaders(etag) {
	return {
		'Cache-Control': 'public, no-cache',
		'ETag': etag
	};
}
function addHeaders(res, headers) {
	if (headers) {
		for (var header in headers) res.setHeader(header, headers[header]);
	}
}
var IF_NONE_MATCH = 'If-None-Match'.toLowerCase();
var hashCache = {};
function servCachedFile(res, fileName, req, statusCode) {
	var sentEtag = req.headers[IF_NONE_MATCH];
	function compareHashAndSend() {
		var hashResult = hashCache[fileName].hash;
		var etag = '"' + hashResult + '"';
		if (sentEtag && sentEtag === etag) {
			addHeaders(res, createEtagHeaders(etag));
			res.writeHead(304);
			res.end();
		}
		else servFile(res, fileName, statusCode, etag);
	}
	function createNewHash() {
		var hash = crypto.createHash('sha256');
		hash.on('readable', function() {
			var hashResult = hash.read();
			if (hashResult) {
				var hashString = hashResult.toString('base64');
				hashCache[fileName].hash = hashString;
				compareHashAndSend();
			}
		});
		fs.createReadStream(fileName).pipe(hash);
	}
	fs.stat(fileName, (err, stats) => {
		if (err) console.log(err); //file should exist already
		else {
			stats.mtime = stats.mtime.getTime();
			if (hashCache[fileName]) {
				if (stats.mtime <= hashCache[fileName].mtime) compareHashAndSend();
				else createNewHash();
			}
			else {
				hashCache[fileName] = {};
				createNewHash();
			}
			hashCache[fileName].mtime = stats.mtime;
		}
	});
}
function servFile(res, fileName, statusCode, etag) {
	servStream(res, mime[fileName.substring(fileName.lastIndexOf('.') + 1)], fs.createReadStream(fileName), statusCode, createEtagHeaders(etag));
}
function servStream(res, mimeType, stream, statusCode, headers) {
	mimeType = mimeType || 'application/octet-stream';
	statusCode = statusCode || 200;
	if (isText(mimeType)) { //only compress text files
		res.setHeader('Content-Type', mimeType + '; charset=UTF-8');
		res.setHeader('Content-Encoding', 'gzip');
		addHeaders(res, headers);
		res.writeHead(statusCode);
		stream.pipe(zlib.createGzip()).pipe(res);
	}
	else {
		res.setHeader('Content-Type', mimeType);
		addHeaders(res, headers);
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
			return function(res404, req) {
				servCachedFile(res404, fileFor404, req, 404);
			};
		}(return404));
	}
	return function(res, req) {
		var url = req.url;
		var fileName = rootdir + url;
		if (disallow_updir && url.indexOf('..') !== -1) return404(res, req);
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
								if (err) return404(res, req);
								else servCachedFile(res, fileName, req);
							});
						}
						else return404(res, req);
					}
					else servCachedFile(res, fileName, req);
				});
			}
			else {
				fs.stat(fileName, function(err, stats) {
					if (err) return404(res, req);
					else servCachedFile(res, fileName, req);
				});
			}
		}
	}
};
module.exports.servStream = servStream;