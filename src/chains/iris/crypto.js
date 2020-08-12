'use strict';
const Crypto = require("../../crypto");
const Old = require('old');
const IrisKeypair = require('./keypair');
const Codec = require("../../util/codec");
const Utils = require("../../util/utils");
const Config = require('../../../config');
const Bip39 = require('bip39');
const Cryp = require("crypto-browserify");
const UUID = require("uuid");

class IrisCrypto extends Crypto {
    
    /**
     *
     * @param language
     * @returns {*}
     */
    create(language, mnemonicLength = 24) {
        let keyPair = IrisKeypair.create(switchToWordList(language), mnemonicLength);
        if (keyPair) {
            return encode({
                address: keyPair.address,
                phrase: keyPair.secret,
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
            });
        }
        return keyPair;
    }

    /**
     *
     * @param language
     * @param mnemonicLength 12/15/18/21/24
     * @returns mnemonics
     */
    generateMnemonic(language, mnemonicLength = 24) {
        return IrisKeypair.generateMnemonic(switchToWordList(language), mnemonicLength);
    }

    recover(secret, language, path) {
        path = path || Config.iris.bip39Path;
        let keyPair = IrisKeypair.recover(secret,switchToWordList(language), path);
        if (keyPair) {
            return encode({
                address: keyPair.address,
                phrase: secret,
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey
            });
        }
    }

    import(privateKey) {
        let keyPair = IrisKeypair.import(privateKey);
        if (keyPair) {
            return encode({
                address: keyPair.address,
                phrase: null,
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey
            });
        }
    }

    isValidAddress(address) {
        return IrisKeypair.isValidAddress(address);
    }

    isValidPrivate(privateKey) {
        return IrisKeypair.isValidPrivate(privateKey);
    }

    getAddress(publicKey) {
        if (Codec.Bech32.isBech32(Config.iris.bech32.accPub, publicKey)) {
            publicKey = Codec.Bech32.fromBech32(publicKey);
        }
        let pubKey = Codec.Hex.hexToBytes(publicKey);
        let address = IrisKeypair.getAddress(pubKey);
        address = Codec.Bech32.toBech32(Config.iris.bech32.accAddr, address);
        return address;
    }

    encodePublicKey(publicKey){
        let pubkey = publicKey;
        if (Codec.Bech32.isBech32(Config.iris.bech32.accPub, pubkey)) {
            pubkey = Codec.Bech32.toBech32(Config.iris.bech32.accPub, Codec.Bech32.fromBech32(pubkey));
        }else if (Codec.Hex.isHex(pubkey)){
            pubkey = Codec.Bech32.toBech32(Config.iris.bech32.accPub, pubkey);
        }
        return pubkey;
    }

    // @see:https://github.com/binance-chain/javascript-sdk/blob/master/src/crypto/index.js
    exportKeystore(privateKeyHex,password,opts = {}){
        if (Utils.isEmpty(password) || password.length < 8){
            throw new Error("password's length must be greater than 8")
        }
        if (Utils.isEmpty(privateKeyHex)){
            throw new Error("private key must be not empty")
        }
        const salt = Cryp.randomBytes(32);
        const iv = Cryp.randomBytes(16);
        const cipherAlg = opts.cipherAlg ? opts.cipherAlg : Config.iris.keystore.cipherAlg;
        const kdf = opts.kdf ? opts.kdf : Config.iris.keystore.kdf;
        const c = opts.c ? opts.c : Config.iris.keystore.c;
        const address = this.import(privateKeyHex).address;

        const kdfparams = {
            dklen: 32,
            salt: salt.toString("hex"),
            c: c,
            prf: "hmac-sha256"
        };
        const derivedKey = Cryp.pbkdf2Sync(Buffer.from(password), salt, kdfparams.c, kdfparams.dklen, "sha256");
        const cipher = Cryp.createCipheriv(cipherAlg, derivedKey.slice(0, 16), iv);
        if (!cipher) {
            throw new Error("Unsupported cipher")
        }

        const cipherBuffer = Buffer.concat([cipher.update(Buffer.from(privateKeyHex, "hex")), cipher.final()]);
        const bufferValue = Buffer.concat([derivedKey.slice(16, 32), cipherBuffer]);
        let hashCiper = Cryp.createHash("sha256");
        hashCiper.update(bufferValue);
        const mac = hashCiper.digest().toString("hex");
        return {
            version: "1",
            id: UUID.v4({
                random: Cryp.randomBytes(16)
            }),
            address: address,
            crypto: {
                ciphertext: cipherBuffer.toString("hex"),
                cipherparams: {
                    iv: iv.toString("hex")
                },
                cipher: cipherAlg,
                kdf,
                kdfparams: kdfparams,
                mac: mac
            }
        }
    }
    importKeystore(keystore, password){
        if (Utils.isEmpty(password) || password.length < 8){
            throw new Error("password's length must be greater than 8")
        }
        if (Utils.isEmpty(keystore)){
            throw new Error("keystore file must be not empty")
        }

        const kdfparams = keystore.crypto.kdfparams;
        if (kdfparams.prf !== "hmac-sha256") {
            throw new Error("Unsupported parameters to PBKDF2")
        }

        const derivedKey = Cryp.pbkdf2Sync(Buffer.from(password), Buffer.from(kdfparams.salt, "hex"), kdfparams.c, kdfparams.dklen, "sha256");
        const ciphertext = Buffer.from(keystore.crypto.ciphertext, "hex");
        const bufferValue = Buffer.concat([derivedKey.slice(16, 32), ciphertext]);
        let hashCiper = Cryp.createHash("sha256");
        hashCiper.update(bufferValue);
        const mac = hashCiper.digest().toString("hex");
        if (mac !==keystore.crypto.mac){
            throw new Error("wrong password")
        }
        const decipher = Cryp.createDecipheriv(keystore.crypto.cipher, derivedKey.slice(0, 16), Buffer.from(keystore.crypto.cipherparams.iv, "hex"));
        const privateKey = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("hex");

        return this.import(privateKey.toUpperCase())
    }
}

function encode(acc){
    if(!Utils.isEmpty(acc)){
        switch (Config.iris.defaultCoding){
            case Config.iris.coding.bech32:{
                if (Codec.Hex.isHex(acc.address)){
                    acc.address =  Codec.Bech32.toBech32(Config.iris.bech32.accAddr, acc.address);
                }
                if (Codec.Hex.isHex(acc.publicKey)){
                    acc.publicKey = Codec.Bech32.toBech32(Config.iris.bech32.accPub, acc.publicKey);
                }
            }
        }
        return acc
    }
}

function switchToWordList(language){
    switch (language) {
        case Config.language.cn:
            return Bip39.wordlists.chinese_simplified;
        case Config.language.en:
            return Bip39.wordlists.english;
        case Config.language.jp:
            return Bip39.wordlists.japanese;
        case Config.language.sp:
            return Bip39.wordlists.spanish;
        default:
            return Bip39.wordlists.english;
    }
}

module.exports = Old(IrisCrypto);