const _ = require('lodash');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const validation = require('../lib/validation');
const encryption = require('../lib/encryption');

module.exports = {

  login: function(db, req, res, config){

    var args = _.pick(req.body, [
      'email', 
      'password'
    ]);

    // find the user
    db.sequelize
      .query(`SELECT * FROM users WHERE email = :email LIMIT 1;`, {
        replacements: {
          email: args.email
        },
        type: db.sequelize.QueryTypes.SELECT
      })
      .then(function(users){
          if(!users.length){
            throw({
              status: 404,
              errors: ['users not found']
            });
            return null;
          }
          // user = users[0];
          return users[0];
      })
      .then(function(user){
        // compare the passwords
        return bcrypt
          .compare(args.password, user.password_hash)
          .then(function(match){
            if(!match){
              throw({
                status: 403,
                errors: ['incorrect password']
              });
              return null;
            }
            return user;
          });
      })
      .then(function(user){
        // get a list of all the teams this user belongs to
        return db.sequelize
          .query(`
          SELECT o.id, o.name
          FROM memberships m INNER JOIN organizations o
            ON m.organization_id = o.id AND m.user_id = :user_id
          ORDER BY o.name ASC
          `, {
            replacements: {
              user_id: user.id
            },
            type: db.sequelize.QueryTypes.SELECT
          })
          .then(function(organizations){
            return {
              organizations, 
              user
            };
          });
      })
      .then(function(args){
        if(!args.organizations.length){
          throw({
            status: 404,
            errors: ['organization not found']
          });
          return null;
        }
        // create token
        return encryption
          .encryptSymmetric(config.private_key, JSON.stringify({
            timestamp: Date.now(),
            user_id: args.user.id
          }))
          .then(function(token){
            res.json({
              organizations: args.organizations,
              user: new validation(args.user, db.user.model).sanitize(),
              token: token
            })
          });
      })
      .catch(function(err){
        var status = err.status || 500;
        var errors = err.errors || err;
        return res.status(status).send({
          errors: errors
        });
      });
  },

  loginTeam: function(db, req, res, config){
    
    var args = _.pick(req.body, [
      'token'
    ]);

    encryption
      .decryptSymmetric(config.private_key, args.token)
      .then(function(token){
        token = JSON.parse(token);
        if(Date.now() - token.timestamp > 1000 * 60 * 60 * 10){
          throw({
            status: 403,
            errors: ['your session has expired']
          });
          return null;
        }
        return token;
      })
      .then(function(token){
        return Promise
          .all([
            db.organization.connection
              .findOne({
                id: req.params.organization_id
              }),
            db.user.connection
              .findOne({
                id: token.user_id
              })
            ]);
      })
      .then(function(values){
        return encryption
          .encryptSymmetric(config.private_key, JSON.stringify({
            timestamp: Date.now(),
            user_id: values[0].id,
            organization_id: values[1].id
          }));
      })
      .then(function(teamSession){
        res.json({
          token: teamSession
        });
      })
      .catch(function(err){
        var status = err.status || 500;
        var errors = err.errors || err;
        return res.status(status).send({
          errors: errors
        });
      });
  },

  invite: function(db, req, res, config){

    var args = _.pick(req.body, [
      'email',
      'name',
      'job',
      'company'
    ]);

    Promise.all([
      db.user.connection
        .findOne({
          where: {
            id: req.session.user_id
          }
        }),
      db.template.connection
        .findOne({
          where: {
            organization_id: req.session.organization_id,
            id: req.params.template_id
          }
        })
      ])
      .then(function(values){
        
        var template = values[1];

        // encrypt invite token
        return encryption
          .encryptSymmetric(config.private_key, JSON.stringify({
            timestamp: Date.now(),
            organization_id: req.session.organization_id,
            template_id: template.id
          }))
          .then(function(token){
            return {
              originator: values[0],
              template: values[1],
              token: token
            };
          })
      })
      .then(function(values){

        var originator = values.originator;
        var template = values.template;
        var token = encodeURIComponent(values.token);
        var transporter = nodemailer.createTransport(`smtps://${config.address}:${config.password}@smtp.gmail.com`);

        var mailOptions = {
          from: `"Blocks Editor" <${config.address}>`,
          to: args.email,
          subject: `${originator.name} invited you to ${template.name}`,
          html: `
          <div>
            <p><b>Hi ${args.name}</b></p>
            <p>
              ${originator.name} invited you to collaborate on <a href="${config.invite_url}?invite_token=${token}">${template.name}</a>
            </p>
            <p>
              Thanks,<br>
              Blockseditor Team
            </p>
          </div>
          `
        };

        transporter.sendMail(mailOptions, function(err){
          if(err){
            throw({
              status: 500,
              errors: [err]
            });
            return null;
          }
          res.json({
            success: true
          });
        });
      })
      .catch(function(err){
        var status = err.status || 500;
        var errors = err.errors || err;
        return res.status(status).send({
          errors: errors
        });
      });
  },

  signup: function(db, req, res, config){

    var args = _.pick(req.body, [
      'name', 
      'email', 
      'password',
      'job'
    ]);
    
    bcrypt.hash(args.password, 10)
      .then(function(hash){
        db.user.connection
          .create({
            name: args.name,
            email: args.email,
            password_hash: hash,
            job: args.job
          })
      })
      .then(function(user){
        res.json({
          user_id: user.id
        });
      })
      .catch(function(err){
        res.status(500).send({
          errors: err  
        });
      });
  },

  joinTeam: function(db, req, res, config){

    var args = _.pick(req.body, [
      'user_id',
      'token'
    ]);
    
    // decrypt token
    encryption
      .decryptSymmetric(config.private_key, args.token)
      .then(function(token){

        token = JSON.parse(token);
        
        // check if user and organization in token exist
        return db.sequelize
          .query(`
          SELECT u.id AS user_id, o.id AS organization_id 
          FROM users u INNER JOIN organizations o 
            ON u.id = :user_id AND o.id = :organization_id;
          `, {
            replacements: {
              user_id: args.user_id,
              organization_id: token.organization_id
            },
            type: db.sequelize.QueryTypes.SELECT
          })
          .then(function(ids){
            return {
              token,
              ids
            };
          })
      })
      .then(function(response){
        if(!response.ids.length){
          throw({
            status: 404,
            errors: ['could not find organizations']
          });
          return null;
        }
        ids = response.ids[0];
        
        // create new membership
        return db.membership.connection
          .create({
            user_id: ids.user_id,
            organization_id: ids.organization_id
          })
          .then(function(){
            return {
              token: response.token,
              ids: ids
            };
          });
      })
      .then(function(response){
        req.permissions.assignPermissionToEntity(response.ids.user_id, response.token.template_id, [
          'template.create',
          'template.read',
          'template.update',
          'template.delete',
        ], function(err){
          if(err){
            throw({
              status: 500,
              errors: [err]
            });
            return null;
          }
          
          // create token
          encryption
            .encryptSymmetric(config.private_key, JSON.stringify({
              timestamp: Date.now(),
              user_id: response.ids.user_id,
              organization_id: response.ids.organization_id
            }))
            .then(function(session){
              res.json({
                token: session
              });
            });
        });
      })
      .catch(function(err){
        var status = err.status || 500;
        var errors = err.errors || err;
        return res.status(status).send({
          errors: errors
        });
      });
  },

  requestPassword: function(db, req, res, config){
    
    var args = _.pick(req.body, [
      'email'
    ]);

    db.sequelize
      .query(`SELECT * FROM users WHERE email = :email LIMIT 1;`, {
        replacements: {
          email: args.email
        }
      })
      .then(function(users){
        if(!users.length){
          throw({
            status: 404,
            errors: ['user not found']
          });
          return null;
        }
        return users[0][0];
      })
      .then(function(user){
        // encrypt invite token
        return encryption
          .encryptSymmetric(config.private_key, JSON.stringify({
            timestamp: Date.now(),
            user_id: user.id
          }))
          .then(function(token){
            return {
              user,
              token
            };
          });
      })
      .then(function(values){

        var token = encodeURIComponent(values.token);
        var transporter = nodemailer.createTransport(`smtps://${config.address}:${config.password}@smtp.gmail.com`);

        var mailOptions = {
          from: `"Blocks Editor" <${config.address}>`,
          to: values.user.email,
          subject: `Blocks Email Editor Password Reset`,
          html: `
          <div>
            <p><b>Hi ${values.user.name}</b></p>
            <p>
              You have requested a new password for your account. Follow this link for instructions: <a href="${config.reset_password_url}?reset_password_token=${token}">RESET LINK</a>
            </p>
            <p>
              Thanks,<br>
              Blockseditor Team
            </p>
          </div>
          `
        };

        transporter.sendMail(mailOptions, function(err){
          console.log(err)
          if(err){
            throw({
              status: 500,
              errors: [err]
            });
            return null;
          }
          res.json({
            success: true
          });
        });
      })
      .catch(function(err){
        var status = err.status || 500;
        var errors = err.errors || err;
        return res.status(status).send({
          errors: [errors]
        });
      });
  },

  resetPassword: function(db, req, res, config){

    var args = _.pick(req.body, [
      'token',
      'password',
      'old_password'
    ]);

    // decrypt token
    encryption
      .decryptSymmetric(config.private_key, args.token)
      .then(function(token){

        token = JSON.parse(token);

        return token;
      })
      .then(function(token){
        // find the user
        return db.sequelize
          .query(`SELECT * FROM users WHERE id = :id LIMIT 1;`, {
            replacements: {
              id: token.user_id
            },
            type: db.sequelize.QueryTypes.SELECT
          });
      })
      .then(function(users){
        if(!users.length){
          throw({
            status: 404,
            errors: ['users not found']
          });
          return null;
        }
        return users[0];
      })
      .then(function(user){
        // compare the passwords
        return bcrypt
          .compare(args.old_password, user.password_hash)
          .then(function(match){
            if(!match){
              throw({
                status: 403,
                errors: ['incorrect password']
              });
              return null;
            }
            return user;
          });
      })
      .then(function(user){
        return bcrypt.hash(args.password, 10)
          .then(function(hash){
            return db.sequelize
              .query(`UPDATE users SET password_hash = :password_hash WHERE id = :id`, {
                replacements: {
                  id: user.id,
                  password_hash: hash
                }
              });
          })
          .then(function(){
            res.json({
              success: true
            })
          });
      })
      .catch(function(err){
        var status = err.status || 500;
        var errors = err.errors || err;
        return res.status(status).send({
          errors: errors
        });
      });
  }
};