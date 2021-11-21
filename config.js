let config = {
	app: {
		title: process.env.APP_TITLE,
		url: process.env.APP_URL,
	},
	auth: {
		user: process.env.AUTH_USER,
		password: process.env.AUTH_PASS,
	},
	sonic: {
		host: process.env.SONIC_HOST,
		port: Number(process.env.SONIC_PORT),
		password: process.env.SONIC_PASS,
	},
	keyv: {
		database: process.env.KEYV_DATABASE,
	},
	analytics: {
		enabled: process.env.ANALYTICS === 'true',
		id: process.env.ANALYTICS_ID,
	}

};

module.exports = config;