var Authorizer = function(permissionService, entityType, entityId, cb) {
  this.permissions = {};
	// Get permissions for entity
	permissionService.getPermissionsForEntity(entityType, entityId, function(err, permissions) {
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

module.exports = function(permissionService){
  return function(req, res, next) {
    var authorizer = new Authorizer(permissionService, 'user', req.session.organization_id, function(err, authorizer) {
      if(err) {
        return next(err);
      }
      req.authorizer = authorizer;
      next();
    });
  };
};
