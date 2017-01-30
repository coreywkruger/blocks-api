const Crypto = require('crypto-js');

function encryptSymmetric(encryption_key, data) {
  try {
    var encrypted = Crypto.AES.encrypt(data, encryption_key);
    var hash = Crypto.HmacSHA1(data, encryption_key);
    return hash.toString() + encrypted.toString();
  }catch(err){
    console.log(err)
    return null;
  }
}

function decryptSymmetric(encryption_key, data) {
  try {
    // de-concat
    var plaintextHash = data.substring(0, 40);
    var encryptedData = data.substring(40, data.length);

    // decrypt
    var plaintext = Crypto.AES.decrypt(encryptedData, encryption_key);
    if (!plaintext) {
      return null;
    }

    plaintext = plaintext.toString(Crypto.enc.Utf8);
    if (!plaintext) {
      return null;
    }

    // Hash
    var hash = Crypto.HmacSHA1(plaintext, encryption_key);
    if (!hash) {
      return null;
    }

    hash = hash.toString();
    if (!hash) {
      return null;
    }

    // check if hash matches
    if (hash !== plaintextHash) {
      return null;
    } else {
      return plaintext;
    }
  } catch(err) {
    return null;
  }
}

module.exports = {
  encryptSymmetric,
  decryptSymmetric
}