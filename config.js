let config = {
    app: {
        title: process.env.APP_TITLE,
        url: process.env.APP_URL,
    },
    auth: {
        user: process.env.AUTH_USER,
        password: process.env.AUTH_PASS,
    },
    mongo: {
        host: process.env.MONGO_HOST,
        port: process.env.MONGO_PORT,
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASS,
    },
    analytics: {
        enabled: process.env.ANALYTICS === 'true',
        id: process.env.ANALYTICS_ID,
    }

};

module.exports = config;