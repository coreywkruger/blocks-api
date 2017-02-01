const uuid = require('node-uuid');
const _ = require('lodash');
const async = require('async');
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
      .then(
        function(users){
          if(!users.length){
            return res.status(404).send({
              errors: ['Users not Found'] 
            });
          }
          user = users[0];
          // compare the passwords
          return bcrypt
            .compare(args.password, user.password_hash)
        },
        function(err){
          return res.status(500).send({
            errors: ['Incorrect password']
          });
        }
      )
      .then(function(match){
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
      })
      .then(function(organizations){
        if(!organizations.length){
          return res.status(404).send({
            errors: ['Organizations not Found'] 
          });
        }
        // create token
        return encryption
          .encryptSymmetric(config.private_key, JSON.stringify({
            timestamp: Date.now(),
            user_id: user.id
          }))
          .then(function(token){
            res.json({
              organizations: organizations,
              token: token
            })
          });
      })
      .catch(function(err){
        return res.status(500).send({
          errors: err
        });
      });
  },

  loginTeam: function(db, req, res, config){
    
    var args = _.pick(req.body, [
      'token'
    ]);

    encryption
      .decryptSymmetric(config.private_key, args.token)
      .catch(function(err){
        return res.status(402).send({
          errors: ['You are not authenticated.']  
        });
      })
      .then(function(token){
      
        if(Date.now() - token.timestamp < 1000 * 60 * 60){
          return res.status(402).send({
            errors: ['Your session has expired.']
          });
        }

        async.waterfall([
          function(done){
            db.organization.connection
              .findOne({
                id: req.params.organization_id
              })
              .catch(done)
              .then(function(organization){
                if(organization === null){
                  return res.status(402).send({
                    errors: ['Invalid session.']
                  });
                }
                done(null, organization);
              });
          }, 
          function(organization, done){
            db.user.connection
              .findOne({
                id: token.user_id
              })
              .catch(done)
              .then(function(user){
                if(user === null){
                  return res.status(402).send({
                    errors: ['Invalid session.']
                  });
                }
                done(null, organization, user);
              });
          }
        ], function(err, organization, user){
          if(err){
            return res.status(402).send({
              errors: ['Invalid session.']
            });
          }
          
          encryption
            .encryptSymmetric(config.private_key, JSON.stringify({
              timestamp: Date.now(),
              user_id: user.id,
              organization_id: organization.id
            }))
            .catch(function(err){
              return res.status(500).send({
                errors: err
              });
            })
            .then(function(teamSession){
              res.json({
                token: teamSession
              });
            });
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

    async.waterfall([
      function(callback){
        db.user.connection
        .findOne({
          where: {
            id: req.session.user_id
          }
        })
        .catch(callback)
        .then(function(originator){
          callback(null, originator);
        });
      },
      function(originator, callback){
        db.template.connection
        .findOne({
          where: {
            organization_id: req.session.organization_id,
            id: req.params.template_id
          }
        })
        .catch(callback)
        .then(function(template){
          callback(null, originator, template);
        });
      }
    ], function(err, originator, template){
      if(err){
        return res.status(500).send({
          errors: err  
        });
      }

      var transporter = nodemailer
        .createTransport(`smtps://${config.address}:${config.password}@smtp.gmail.com`);

      encryption
        .encryptSymmetric(config.private_key, JSON.stringify({
          timestamp: Date.now(),
          organization_id: req.session.organization_id,
          template_id: template.id
        }))
        .catch(function(err){
          return res.status(500).send({
            errors: err
          });
        })
        .then(function(token){
              
          token = encodeURIComponent(token);

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
              return res.status(500).send({
                errors: err  
              });
            }
            res.json({
              success: true
            });
          });
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

    db.user.connection
      .create({
        name: args.name,
        email: args.email,
        password_hash: args.password,
        job: args.job
      })
      .catch(function(err){
        res.status(500).send({
          errors: err  
        });
      })
      .then(function(user){

        res.json({
          user_id: user.id
        });
      });
  },

  joinTeam: function(db, req, res, config){

    var args = _.pick(req.body, [
      'user_id',
      'token'
    ]);

    encryption
      .decryptSymmetric(config.private_key, args.token)
      .catch(function(err){
        return res.status(402).send({
          errors: ['Your token is malformed']
        });
      })
      .then(function(token){

        token = JSON.parse(token);

        db.sequelize
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
          .catch(function(err){
            return res.status(500).send({
              errors: err
            });
          })
          .then(function(ids){
            if(!ids.length){
              return res.status(404).send({
                errors: ['Could not find organization.']
              });
            }
            ids = ids[0];

            db.membership.connection
              .create({
                user_id: ids.user_id,
                organization_id: ids.organization_id
              })
              .catch(function(err){
                res.status(500).send({
                  errors: err  
                });
              })
              .then(function(){

                req.permissions.assignPermissionToEntity(ids.user_id, token.template_id, [
                  'template.create',
                  'template.read',
                  'template.update',
                  'template.delete',
                ], function(err){
                  if(err){
                    return res.status(500).send({
                      errors: err  
                    });
                  }
                  // create token
                  encryption
                    .encryptSymmetric(config.private_key, JSON.stringify({
                      timestamp: Date.now(),
                      user_id: ids.user_id,
                      organization_id: ids.organization_id
                    }))
                    .then(function(session){
                      res.json({
                        token: session
                      });
                    });
                });
              });
          });
      });
  }
};