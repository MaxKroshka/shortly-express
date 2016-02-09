var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var crypto = require('crypto');


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var shasum = crypto.createHash('sha1');
      shasum.update(model.get('password'));
      model.set('password', shasum.digest('hex'));
    });
  }
});

module.exports = User;


  // initialize: function() {
  //   this.on('creating', function(model, attrs, options) {
  //     var pass = model.get('password');
  //     bcrypt.genSalt(10, function(err,salt){
  //       bcrypt.hash(pass, salt, function(err, hash){
  //         model.set('password', hash);
  //       });
  //     });
  //   });
  // }