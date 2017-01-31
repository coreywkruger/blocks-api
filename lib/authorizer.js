const _ = require('lodash');

var Authorizer = function(permissionService, userId, cb) {
  this.permissions = {};
  this.permissionService = permissionService;
	// Get permissions for entity
	this.permissionService.getPermissionsForEntity('user', userId, function(err, permissions) {
		if(err) {
			cb('Could not fetch permissions');
		} else {
      for (var i = 0; i < permissions.length; i++) {
        this.permissions[permissions[i].permission] = true;
      }
			cb(null);
		}
  }.bind(this));
};

Authorizer.prototype.isAllowed = function(permission) {
  return this.permissions.hasOwnProperty(permission);
};

Authorizer.prototype.owns = function(permission, ownerId, targetId, cb) {
  this.permissionService.getEntityPermissionsForEntity(ownerId, targetId, function(err, permissions) {
		if(err) {
			cb('Could not fetch permissions');
		} else {
      cb(null, _.find(permissions, function(p){
        return p.permission === permission;
      }));
		}
  }.bind(this));
};

Authorizer.prototype.authorize = function(entityId, targetId, permissions, cb){
  this.permissionService.assignPermissionToEntity(entityId, targetId, permissions, function(err){
    if(err) {
			cb(`Could not assign permission: ${permissions}`);
		} else {
      cb(null);
    }
  });
};

Authorizer.prototype.getOwners = function(targetId, permission, cb){
  this.permissionService.getEntitiesByTargetId(targetId, permission, function(err, userIds){
    if(err) {
			cb('Could not fetch permissions');
		} else {
      cb(null, userIds);
    }
  });
};

module.exports = function(req, res, next) {
  var authorizer = new Authorizer(req.permissions, req.session.user_id, function(err) {
    if(err) {
      return next(err);
    }
    req.authorizer = authorizer;
    next();
  });
};
