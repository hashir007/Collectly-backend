const CryptoJS = require('crypto-js').Crypto;


let secret = process.env.ENCRYPT_CYPHER;


exports.Encrypt = (plainText,) => {
    let key = CryptoJS.enc.Utf8.parse(secret);

    let encryptedBytes = CryptoJS.AES.encrypt(plainText, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
    let encryptedString = encryptedBytes.toString();

    return encryptedString;
}

exports.Decrypt = (cipherText) => {
    let key = CryptoJS.enc.Utf8.parse(secret);

    let decryptedBytes = CryptoJS.AES.decrypt(cipherText, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
    let decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);

    return decryptedText;
}


