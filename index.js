'use strict';

var toArray      = require('es5-ext/array/to-array')
  , last         = require('es5-ext/array/#/last')
  , format       = require('es5-ext/date/#/format')
  , invoke       = require('es5-ext/function/invoke')
  , partial      = require('es5-ext/function/#/partial')
  , toPosInt     = require('es5-ext/number/to-pos-integer')
  , forEach      = require('es5-ext/object/for-each')
  , objToArray   = require('es5-ext/object/to-array')
  , primitiveSet = require('es5-ext/object/primitive-set')
  , contains     = require('es5-ext/string/#/contains')
  , irc          = require('irc')
  , nodemailer   = require('nodemailer')
  , config       = require('./config')

  , mailer, msgOutput;

mailer = nodemailer.createTransport(config.smtp);
format = partial.call(format, '%Y-%m-%d %H:%M:%S');

msgOutput = function (data) {
	return format.call(data[0]) + ' ' + data[1] + ' => ' +  data[2];
};

forEach(config.irc, function (conf, url) {
	var client, ignore, logLength;
	logLength = toPosInt(config.logLength);
	if (!logLength) logLength = 20;

	client = new irc.Client(url, conf.user, {
		channels: objToArray(conf.channels, function (keywords, name) {
			return '#' + name + (conf.pass ? ' ' + conf.pass : '');
		})
	});
	if (conf.ignore == null) {
		ignore = primitiveSet();
	} else {
		ignore = primitiveSet.apply(null, toArray(conf.ignore));
	}
	ignore[conf.user] = true;

	client.addListener('error', function (message) {
		var subject;
		mailer.sendMail({
			from: config.smtp.from,
			to: config.smtp.to,
			subject: subject = "IRC: SERVER ERROR: " + message,
			text: message
		}, function (err) {
			if (err) {
				console.error("Could not send email: " + err);
				console.error(subject, message);
			} else {
				console.log("Email succesfully sent", subject, message);
			}
			throw new Error(message);
		});
	});

	forEach(conf.channels, function (keywords, name) {
		var history = [], l;
		keywords = keywords.map(invoke('toLowerCase'));
		client.addListener('raw', function (message) {
			var nu;
			if (message.command !== '470') return;
			if (message.args[1] === ('#' + name)) {
				// Rename
				nu = message.args[2].slice(1);
				console.log("Redirect", "#" + name, "to", "#" + nu);
				client.removeListener('message#' + name, l);
				name = nu;
				client.addListener('message#' + name, l);
			}
		});
		client.addListener('message#' + name, l = function (from, message, data) {
			var needle, subject, body, messageContains, now = new Date();
			console.log("#" + name, format.call(now) + " ", from, " => ",
				message);
			history.push([now, from, message, data]);
			if (history.length > logLength) history.shift();
			if (ignore[from]) return;
			messageContains = contains.bind(message.toLowerCase());
			if (keywords.some(function (keyword) {
					if (messageContains(keyword)) {
						needle = keyword;
						return true;
					}
				})) {
				console.log("Send email...");
				mailer.sendMail({
					from: config.smtp.from,
					to: config.smtp.to,
					subject: subject = "IRC: #" + name + ": '" + needle + "' mentioned",
					text: body = msgOutput(last.call(history)) + '\n\n----------\n\n' +
						history.map(msgOutput).join('\n') + '\n'
				}, function (err) {
					if (err) {
						console.error("Could not send email: " + err);
						console.error(subject + ": " + body);
						throw new Error("Could not send emails");
					}
					console.log("...Email sent");
				});
			}
		});
		console.log("Listening", "#" + name, "at", url);
	});
});
