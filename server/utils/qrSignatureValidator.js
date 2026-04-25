/**
 * Aadhaar QR XML signature validator (offline flow).
 *
 * This module supports two modes:
 * 1) crypto mode: best-effort RSA signature verification when a public cert/key is provided.
 * 2) demo mode: realistic structural + tamper-hash checks for project/demo usage.
 */

const fs = require('fs');
const crypto = require('crypto');

const BASE64_REGEX = /^[A-Za-z0-9+/=\r\n]+$/;

const normalizeXml = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractTagText = (xml, tagName) => {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'));
  return match ? match[1].trim() : null;
};

const extractSelfClosingNode = (xml, tagName) => {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*/>`, 'i'));
  return match ? match[0] : null;
};

const extractNodeWithBody = (xml, tagName) => {
  const match = xml.match(new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?</${tagName}>`, 'i'));
  return match ? match[0] : null;
};

const stripSignatureBlock = (xml) => xml.replace(/<Signature\b[\s\S]*?<\/Signature>/ig, '');

const sha256Base64 = (value) => {
  return crypto.createHash('sha256').update(value, 'utf8').digest('base64');
};

const getPublicKeyFromOptions = (options = {}) => {
  const directKey = options.publicKeyPem || process.env.UIDAI_PUBLIC_KEY_PEM;
  if (directKey) {
    return directKey;
  }

  const certPath = options.certPath || process.env.UIDAI_PUBLIC_CERT_PATH;
  if (certPath && fs.existsSync(certPath)) {
    return fs.readFileSync(certPath, 'utf8');
  }

  return null;
};

const compareDigest = (expected, computed) => {
  if (!expected || !computed) return false;
  const cleanExpected = expected.replace(/\s+/g, '');
  const cleanComputed = computed.replace(/\s+/g, '');
  return cleanExpected === cleanComputed;
};

/**
 * Verify Aadhaar QR XML signature/tamper checks.
 *
 * @param {string} xmlData - QR XML payload.
 * @param {object} [options]
 * @param {boolean} [options.enableCryptoVerify=true] - Attempt RSA verify using public key/cert.
 * @param {boolean} [options.strictCrypto=false] - If true, fail when crypto verification fails.
 * @param {string} [options.publicKeyPem] - PEM public key/certificate content.
 * @param {string} [options.certPath] - File path to certificate/public key.
 * @returns {{valid:boolean, mode:string, error:string|null, details:object}}
 */
const verifyAadhaarQRSignature = (xmlData, options = {}) => {
  try {
    if (!xmlData || typeof xmlData !== 'string') {
      return {
        valid: false,
        mode: 'invalid-input',
        error: 'QR XML is empty or invalid',
        details: {}
      };
    }

    const xml = normalizeXml(xmlData);
    const signatureBlock = extractNodeWithBody(xml, 'Signature');
    if (!signatureBlock) {
      return {
        valid: false,
        mode: 'no-signature',
        error: 'No XML Signature block found in QR payload',
        details: {
          signaturePresent: false
        }
      };
    }

    const signatureValue = extractTagText(signatureBlock, 'SignatureValue');
    const signedInfo = extractNodeWithBody(signatureBlock, 'SignedInfo');
    const digestValue = extractTagText(signatureBlock, 'DigestValue') || extractTagText(xml, 'DataHash');

    const signaturePresent = Boolean(signatureValue);
    const signatureLooksValid = Boolean(signatureValue && BASE64_REGEX.test(signatureValue));

    // Prefer Aadhaar payload node for tamper hash, else fall back to XML without Signature.
    const aadhaarNode = extractSelfClosingNode(xml, 'PrintLetterBarcodeData') || extractNodeWithBody(xml, 'OfflinePaperlessKyc');
    const unsignedXml = stripSignatureBlock(xml);
    const hashInput = normalizeXml(aadhaarNode || unsignedXml);
    const computedDigest = sha256Base64(hashInput);

    const tamperCheckPassed = digestValue ? compareDigest(digestValue, computedDigest) : true;

    let cryptoVerified = false;
    let cryptoError = null;
    const enableCryptoVerify = options.enableCryptoVerify !== false;

    if (enableCryptoVerify && signedInfo && signatureLooksValid) {
      const publicKeyPem = getPublicKeyFromOptions(options);
      if (publicKeyPem) {
        try {
          const verifier = crypto.createVerify('RSA-SHA256');
          verifier.update(normalizeXml(signedInfo));
          verifier.end();
          cryptoVerified = verifier.verify(publicKeyPem, signatureValue.replace(/\s+/g, ''), 'base64');
        } catch (error) {
          cryptoError = error.message;
          cryptoVerified = false;
        }
      }
    }

    const strictCrypto = options.strictCrypto === true;
    const cryptoAttempted = Boolean(enableCryptoVerify && getPublicKeyFromOptions(options));

    // Decision:
    // - If crypto successfully verifies and tamper check passes => valid.
    // - Else in demo mode, valid if signature structure is sane + tamper check passes.
    // - In strict crypto mode, crypto verification must pass when attempted.
    let valid;
    let mode;
    if (cryptoVerified && tamperCheckPassed) {
      valid = true;
      mode = 'crypto';
    } else if (strictCrypto && cryptoAttempted) {
      valid = false;
      mode = 'crypto-strict-failed';
    } else {
      valid = Boolean(signaturePresent && signatureLooksValid && tamperCheckPassed);
      mode = 'demo';
    }

    return {
      valid,
      mode,
      error: valid ? null : (cryptoError || 'Signature verification failed'),
      details: {
        signaturePresent,
        signatureLooksValid,
        tamperCheckPassed,
        digestPresent: Boolean(digestValue),
        computedDigest,
        cryptoAttempted,
        cryptoVerified,
        cryptoError
      }
    };
  } catch (error) {
    return {
      valid: false,
      mode: 'exception',
      error: error.message,
      details: {}
    };
  }
};

module.exports = {
  verifyAadhaarQRSignature
};
