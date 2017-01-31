const Crypto = require('crypto-js');

function encryptSymmetric(encryption_key, data) {
  return new Promise(function(resolve, reject){
    try {
      var encrypted = Crypto.AES.encrypt(data, encryption_key);
      var hash = Crypto.HmacSHA1(data, encryption_key);
      resolve(hash.toString() + encrypted.toString());
    }catch(err){
      reject(err);
    }
  });
}

function decryptSymmetric(encryption_key, data) {
  return new Promise(function(resolve, reject){
    try {
      // de-concat
      var plaintextHash = data.substring(0, 40);
      var encryptedData = data.substring(40, data.length);

      // decrypt
      var plaintext = Crypto.AES.decrypt(encryptedData, encryption_key);
      if (!plaintext) {
        return reject(new Error('Decryption failed'));
      }

      plaintext = plaintext.toString(Crypto.enc.Utf8);
      if (!plaintext) {
        return reject(new Error('Plaintext to string failed'));
      }

      // Hash
      var hash = Crypto.HmacSHA1(plaintext, encryption_key);
      if (!hash) {
        return reject(new Error('Hash failed'));
      }

      hash = hash.toString();
      if (!hash) {
        return reject(new Error('Hash to string failed'));
      }

      // check if hash matches
      if (hash !== plaintextHash) {
        return reject(new Error('No hash'));
      }
      return resolve(plaintextHash)
    } catch(err) {
      return reject(err);
    }
  });
}

module.exports = {
  encryptSymmetric,
  decryptSymmetric
}