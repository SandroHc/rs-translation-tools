db.createUser({
	user: 'rstranslations',
	pwd: 'rstranslations',
	roles: [ 'readWrite' ]
});

db.createCollection('translations');