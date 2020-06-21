db.createUser({
	user: 'rstranslations',
	pwd: 'rstranslations',
	roles: [ 'readWrite' ]
});

db.createCollection('translations');
//db.getCollection('translations').createIndex({
//	title: 1,
//});