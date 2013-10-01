'use strict';

var toArray      = require('es5-ext/array/to-array')
  , format       = require('es5-ext/date/#/format')
  , invoke       = require('es5-ext/function/invoke')
  , partial      = require('es5-ext/function/#/partial')
  , forEach      = require('es5-ext/object/for-each')
  , mapToArray   = require('es5-ext/object/map-to-array')
  , primitiveSet = require('es5-ext/object/primitive-set')
  , contains     = require('es5-ext/string/#/contains')
  , inspect      = require('util').inspect
  , irc          = require('irc')
  , nodemailer   = require('nodemailer')
  , config       = require('./config')

  , mailer;

mailer = nodemailer.createTransport('SMTP', config.smtp);
format = partial.call(format, '%Y-%m-%d %H:%M:%S');

forEach(config.irc, function (conf, url) {
	var client, ignore;
	client = new irc.Client(url, conf.user, {
		channels: mapToArray(conf.channels, function (keywords, name) {
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
			body: message
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
			var needle, subject, body, messageContains;
			console.log("#" + name, format.call(new Date()) + " ", from, " => ",
				message);
			history.push([from, message, data]);
			if (history.length > 20) history.shift();
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
					body: body = history.map(function (data) {
						return data[0] + ' => ' +  data[1];
					}).join('\n') + '\n\n\n' + inspect(data)
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
