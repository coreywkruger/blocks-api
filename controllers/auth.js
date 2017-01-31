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
    db.user.connection
      .findOne({
        email: args.email
      })
      .catch(function(err){
        return res.status(500).send({
          errors: err  
        });
      })
      .then(function(user){
        if(user === null){
          return res.status(404).send({
            errors: ['Not Found'] 
          });
        }

        // compare the passwords
        bcrypt
          .compare(args.password, user.password_hash)
          .catch(function(err){
            return res.status(500).send({
              errors: err  
            });
          })
          .then(function(match){
            if(!match){
              return res.status(401).send({
                errors: ['incorrect password']
              });
            }
            
            // get a list of all the teams this user belongs to
            db.sequelize
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
              .catch(function(err){
                return res.status(500).send({
                  errors: err  
                });
              })
              .then(function(organizations){

                // create token
                var session = encryption
                  .encryptSymmetric(config.private_key, 
                    JSON.stringify({
                      timestamp: Date.now(),
                      user_id: user.id
                    })
                  );
                
                res.json({
                  organizations: organizations,
                  session: session
                });
              });
          });
      });
  },

  loginTeam: function(db, req, res, config){
    
    var args = _.pick(req.body, [
      'token',
      'organization_id'
    ]);

    var token = encryption.decryptSymmetric(config.private_key, args.token);
    
    if(token === null){
      return res.status(402).send({
        errors: ['You are not authenticated.']
      });
    }

    if(Date.now() - token.timestamp < 1000 * 60 * 60){
      return res.status(402).send({
        errors: ['Your session has expired.']
      });
    }

    async.waterfall([
      function(done){
        db.organization.connection
          .findOne({
            id: args.organization_id
          })
          .then(function(organization){
            if(organization === null){
              return res.status(402).send({
                errors: ['Invalid session.']
              });
            }
            done(null, organization);
          })
          .catch(done);
      }, 
      function(organization, done){
        db.user.connection
          .findOne({
            id: token.user_id
          })
          .then(function(user){
            if(user === null){
              return res.status(402).send({
                errors: ['Invalid session.']
              });
            }
            done(null, organization, user);
          })
          .catch(done);
      }
    ], function(err, organization, user){
      if(err){
        return res.status(402).send({
          errors: ['Invalid session.']
        });
      }
      
      var teamSession = encryption
        .encryptSymmetric(config.private_key, 
          JSON.stringify({
            timestamp: Date.now(),
            user_id: user.id,
            organization_id: organization.id
          })
        );
      
      res.json({
        session: teamSession
      });
    });
  },

  invite: function(db, req, res, config){

    var args = _.pick(req.body, [
      'originator_id', 
      'target_id',
      'template_id'
    ]);

    async.waterfall([
      function(callback){
        db.user.connection
        .findOne({
          where: {
            id: args.originator_id
          }
        })
        .then(function(originator){
          callback(null, originator);
        })
        .catch(callback);
      },
      function(originator, callback){
        db.user.connection
        .findOne({
          where: {
            id: args.target_id
          }
        })
        .then(function(target){
          callback(null, originator, target);
        })
        .catch(callback);
      },
      function(originator, target, callback){
        db.template.connection
        .findOne({
          where: {
            organization_id: req.session.organization_id,
            id: args.template_id
          }
        })
        .then(function(template){
          callback(null, originator, target, template);
        })
        .catch(callback);
      }
    ], function(err, originator, target, template){
      if(err){
        return res.status(500).send({
          errors: err  
        });
      }

      var transporter = nodemailer
        .createTransport(`smtps://${config.address}:${config.password}@smtp.gmail.com`);
      
      var token = encryption
        .encryptSymmetric(config.private_key, 
          JSON.stringify({
            timestamp: Date.now(),
            organization_id: req.session.organization_id
          })
        );

      var mailOptions = {
          from: `"Blocks Editor" <${config.address}>`,
          to: target.email,
          subject: `${originator.name} invited you to ${template.name}`,
          html: `
          <div>
            <p><b>Hi ${target.name}</b></p>
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
  }
};