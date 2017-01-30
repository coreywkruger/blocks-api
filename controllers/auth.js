const uuid = require('node-uuid');
const _ = require('lodash');
const async = require('async');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const validation = require('../lib/validation');
const encryption = require('../lib/encryption');

module.exports = {

  login: function(db, req, res){

    var args = _.pick(req.body, [
      'email', 
      'password'
    ]);

    db.user.connection
      .findOne({
        email: args.email
      })
      .then(function(rec){
        if(rec === null){
          return res.status(404).send({
            errors: ['Not Found'] 
          });
        }
        bcrypt.compare(args.password, rec.password_hash, function(err, match){
          if(err || !match){
            return res.status(401).send({
              errors: ['incorrect password']
            });
          }
          return res.json({
            'session': 'some special session key'
          });
        });
      })
      .catch(function(err){
        return res.status(500).send({
          errors: err  
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

      var transporter = nodemailer.createTransport(`smtps://${config.address}:${config.password}@smtp.gmail.com`);
      
      var token = encryption.encryptSymmetric(config.private_key, JSON.stringify({
        timestamp: Date.now(),
        organization_id: req.session.organization_id
      }));

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