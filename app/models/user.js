var db = require('../config');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
});

module.exports = User;
