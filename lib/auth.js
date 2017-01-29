const _ = require('lodash');

var Authorizer = function(permissionService, userId, cb) {
  this.permissions = {};
  this.permissionService = permissionService;
	// Get permissions for entity
	this.permissionService.getRolePermissionsForEntity(userId, function(err, permissions) {
		if(err) {
			cb('Could not fetch permissions');
		} else {
      for (var i = 0; i < permissions.length; i++) {
        this.permissions[permissions[i]] = true;
      }
			cb(null);
		}
  }.bind(this));
};

Authorizer.prototype.isAllowed = function(permission) {
  return this.permissions.hasOwnProperty(permission);
};

Authorizer.prototype.owns = function(permission, ownerId, targetId, cb) {
  this.permissionService.getEntityPermissionsForEntity(userId, targetId, function(err, permissions) {
		if(err) {
			cb('Could not fetch permissions');
		} else {
      return _.find(permission, function(p){
        return p === permission;
      });
		}
  }.bind(this));
};

module.exports = function(req, res, next) {
  var authorizer = new Authorizer(req.permissions, req.session.organization_id, function(err, authorizer) {
    if(err) {
      return next(err);
    }
    req.authorizer = authorizer;
    next();
  });
};
