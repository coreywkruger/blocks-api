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
                encryption
                  .encryptSymmetric(config.private_key, 
                    JSON.stringify({
                      timestamp: Date.now(),
                      user_id: user.id
                    })
                  )
                  .then(function(session){
                    res.json({
                      organizations: organizations,
                      token: session
                    });
                  });
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
          
          encryption
            .encryptSymmetric(config.private_key, 
              JSON.stringify({
                timestamp: Date.now(),
                user_id: user.id,
                organization_id: organization.id
              })
            )
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
        .then(function(originator){
          callback(null, originator);
        })
        .catch(callback);
      },
      function(originator, callback){
        db.template.connection
        .findOne({
          where: {
            organization_id: req.session.organization_id,
            id: req.params.template_id
          }
        })
        .then(function(template){
          callback(null, originator, template);
        })
        .catch(callback);
      }
    ], function(err, originator, template){
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
  }
};