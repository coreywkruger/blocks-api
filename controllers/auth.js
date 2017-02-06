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
      .catch(function(err){
        return res.status(500).send({
          errors: err
        });
      })
      .then(function(users){
          if(!users.length){
            return res.status(404).send({
              errors: ['Users not Found'] 
            });
          }
          user = users[0];
          // compare the passwords
          return bcrypt
            .compare(args.password, user.password_hash)
            .catch(function(err){
              return res.status(500).send({
                errors: err
              });
            })
            .then(function(match){
              if(!match){
                return res.status(402).send({
                  errors: ['Incorrect password']
                });
              }
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
                .catch(function(err){
                  return res.status(500).send({
                    errors: err
                  });
                })
                .then(function(token){
                  res.json({
                    organizations: organizations,
                    token: token
                  })
                });
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
        
        token = JSON.parse(token);

        if(Date.now() - token.timestamp > 1000 * 60 * 60 * 10){
          return res.status(402).send({
            errors: ['Your session has expired.']
          });
        }

        Promise
          .all([
            db.organization.connection
              .findOne({
                id: req.params.organization_id
              }),
            db.user.connection
              .findOne({
                id: token.user_id
              })
          ])
          .then(function(values){

            return encryption
              .encryptSymmetric(config.private_key, JSON.stringify({
                timestamp: Date.now(),
                user_id: values[0].id,
                organization_id: values[1].id
              }))
              .then(function(teamSession){
                res.json({
                  token: teamSession
                });
              });
          })
          .catch(function(err){
            return res.status(500).send({
              errors: err
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
    .catch(function(err){
      res.status(500).send({
        errors: err  
      });
    })
    .then(function(values){

      var originator = values[0];
      var template = values[1];
      var transporter = nodemailer
        .createTransport(`smtps://${config.address}:${config.password}@smtp.gmail.com`);

      return encryption
        .encryptSymmetric(config.private_key, JSON.stringify({
          timestamp: Date.now(),
          organization_id: req.session.organization_id,
          template_id: template.id
        }))
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
        })
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