'use strict';

var invoke     = require('es5-ext/lib/Function/invoke')
  , forEach    = require('es5-ext/lib/Object/for-each')
  , mapToArray = require('es5-ext/lib/Object/map-to-array')
  , contains   = require('es5-ext/lib/String/prototype/contains')
  , inspect    = require('util').inspect
  , irc        = require('irc')
  , nodemailer = require('nodemailer')
  , config     = require('../config')

  , mailer;

mailer = nodemailer.createTransport('SMTP', config.smtp);

forEach(config.irc, function (conf, url) {
	var client = new irc.Client(url, conf.user, {
		channels: mapToArray(conf.channels, function (keywords, name) {
			return '#' + name + (conf.pass ? ' ' + conf.pass : '');
		})
	});

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
		keywords = keywords.map(invoke('toLowerCase'));
		client.addListener('message#' + name, function (from, message, data) {
			var needle, subject, body, messageContains;
			console.log("Message:", from, ' => ', message, '\n', inspect(data));
			messageContains = contains.bind(message.toLowerCase());
			if (keywords.some(function (keyword) {
					if (messageContains(keyword)) {
						needle = keyword;
						return true;
					}
				})) {
				mailer.sendMail({
					from: config.smtp.from,
					to: config.smtp.to,
					subject: subject = "IRC: #" + name + ": '" + needle + "' mentioned",
					body: body = from + ' => ' +  message + '\n\n' + inspect(data)
				}, function (err) {
					if (err) {
						console.error("Could not send email: " + err);
						console.error(subject + ": " + body);
						throw new Error("Could not send emails");
					}
					console.log("Email succesfully sent", subject, body);
				});
			}
		});
	});
});
