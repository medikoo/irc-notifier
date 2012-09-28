# IRC-Notifier – IRC email notificactions

Great way of being notified when given phrase or keyword is mentioned on irc

## Setup

### Install _irc-notifier_

	$ npm install irc-notifier

### Setup _config.json_

See _config.example.json_ for base template. Options:

* __smtp__ - Mail transport configuration
	* __host__ `string` - Host url
	* __auth__ - Authentication credentials
		* __user__ `string` - User name
		* __pass__ `strng` - Password
	* __from__ `string` Email address to be put into _from_ field
	* __to__ `string` Email address at which notifications should arrive
# __irc__ - IRC configuration, each child object is configuration for each server on which we want to listen. Key is server address, and object provides configuration
	* __user__ `string` Bot nickname (make sure it's unique)
	* __channels__ - Each child object is configuration for each channel, where key is channel name and value is array of keywords of which we want to be notified

### Start notifier

	$ npm start
