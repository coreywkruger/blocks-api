const nodemailer = require('nodemailer');

var mailer = function mailer(user, pass){
  this.transporter = nodemailer.createTransport(`smtps://${user}%40gmail.com:${pass}@smtp.gmail.com`);
};

// var mailOptions = {
//     from: '"Fred Foo ?" <foo@blurdybloop.com>', // sender address
//     to: 'bar@blurdybloop.com, baz@blurdybloop.com', // list of receivers
//     subject: 'Hello ✔', // Subject line
//     text: 'Hello world ?', // plaintext body
//     html: '<b>Hello world ?</b>' // html body
// };

mailer.prototype.sendMail = function(mailOptions, cb){
  // send mail with defined transport object
  this.transporter.sendMail(mailOptions, cb);
};

module.exports = mailer;