/**
 * Aadhaar QR scanner utility.
 * Performs image preprocessing variants before jsQR decode,
 * then parses Aadhaar XML payload fields.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const jsQR = require('jsqr');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff']);

const isImageFile = (filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const toRawRGBA = async (pipeline) => {
	const { data, info } = await pipeline
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	return {
		data: new Uint8ClampedArray(data),
		width: info.width,
		height: info.height
	};
};

const decodeQR = ({ data, width, height }) => {
	if (!data || !width || !height || width < 32 || height < 32) {
		return null;
	}

	try {
		return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
	} catch (error) {
		return null;
	}
};

const extractXmlValue = (xml, key) => {
	const attrRegex = new RegExp(`${key}="([^"]+)"`, 'i');
	const attrMatch = xml.match(attrRegex);
	if (attrMatch && attrMatch[1]) {
		return attrMatch[1].trim();
	}

	const tagRegex = new RegExp(`<${key}>([^<]+)</${key}>`, 'i');
	const tagMatch = xml.match(tagRegex);
	if (tagMatch && tagMatch[1]) {
		return tagMatch[1].trim();
	}

	return null;
};

const parseAadhaarQR = (payload) => {
	if (!payload || typeof payload !== 'string') {
		return { success: false, data: null, reason: 'Empty QR payload' };
	}

	const xmlLike = payload.includes('<') && payload.includes('>');
	if (!xmlLike) {
		return { success: false, data: null, reason: 'Unsupported QR payload format' };
	}

	const data = {
		aadhaarNumber: extractXmlValue(payload, 'Uid') || extractXmlValue(payload, 'uid'),
		name: extractXmlValue(payload, 'Name') || extractXmlValue(payload, 'name'),
		dob: extractXmlValue(payload, 'Dob') || extractXmlValue(payload, 'dob') || extractXmlValue(payload, 'Yob') || extractXmlValue(payload, 'yob'),
		gender: extractXmlValue(payload, 'Gender') || extractXmlValue(payload, 'gender') || extractXmlValue(payload, 'G') || extractXmlValue(payload, 'g'),
		address: extractXmlValue(payload, 'Address') || extractXmlValue(payload, 'address') || null
	};

	if (!data.address) {
		const addressParts = [
			extractXmlValue(payload, 'house'),
			extractXmlValue(payload, 'street'),
			extractXmlValue(payload, 'lm'),
			extractXmlValue(payload, 'loc'),
			extractXmlValue(payload, 'vtc'),
			extractXmlValue(payload, 'dist'),
			extractXmlValue(payload, 'state'),
			extractXmlValue(payload, 'pc')
		].filter(Boolean);

		data.address = addressParts.length ? addressParts.join(', ') : null;
	}

	const hasFields = Boolean(data.aadhaarNumber || data.name || data.dob || data.gender || data.address);
	if (!hasFields) {
		return { success: false, data: null, reason: 'QR found but Aadhaar fields are missing' };
	}

	return { success: true, data };
};

const buildScanVariants = async (filePath) => {
	const base = sharp(filePath, { failOn: 'none' });
	const metadata = await base.metadata();
	const width = metadata.width || 1000;
	const height = metadata.height || 700;

	const variants = [];

	// Baseline
	variants.push(await toRawRGBA(base.clone().png()));

	// Requested preprocessing pipeline: resize + grayscale + contrast boost.
	variants.push(await toRawRGBA(
		base
			.clone()
			.resize({ width: 1800, withoutEnlargement: false })
			.grayscale()
			.normalize()
			.linear(1.4, -20)
			.png()
	));

	// Binary high-contrast variant often helps printed QR blocks.
	variants.push(await toRawRGBA(
		base
			.clone()
			.resize({ width: 2000, withoutEnlargement: false, kernel: sharp.kernel.nearest })
			.grayscale()
			.normalize()
			.threshold(145)
			.png()
	));

	// Lower-half focused variant (where Aadhaar QR is frequently placed).
	const cropTop = Math.max(0, Math.floor(height * 0.42));
	variants.push(await toRawRGBA(
		base
			.clone()
			.extract({ left: 0, top: cropTop, width, height: height - cropTop })
			.resize({ width: 1800, withoutEnlargement: false, kernel: sharp.kernel.nearest })
			.grayscale()
			.normalize()
			.linear(1.45, -24)
			.png()
	));

	for (const angle of [90, 180, 270]) {
		variants.push(await toRawRGBA(
			base
				.clone()
				.rotate(angle)
				.resize({ width: 1800, withoutEnlargement: false })
				.grayscale()
				.normalize()
				.linear(1.35, -20)
				.png()
		));
	}

	return variants;
};

const computeQRConfidence = (data) => {
	let score = 0;
	if (data.aadhaarNumber) score += 45;
	if (data.name) score += 20;
	if (data.dob) score += 15;
	if (data.gender) score += 10;
	if (data.address) score += 10;
	return Math.min(100, score);
};

const scanAadhaarQRCode = async (filePath) => {
	if (!fs.existsSync(filePath)) {
		return {
			success: false,
			qrFound: false,
			qrDetected: false,
			extractedData: null,
			confidenceScore: 0,
			rawPayload: null,
			message: 'File not found'
		};
	}

	if (!isImageFile(filePath)) {
		return {
			success: false,
			qrFound: false,
			qrDetected: false,
			extractedData: null,
			confidenceScore: 0,
			rawPayload: null,
			message: 'QR scanning supports image files only'
		};
	}

	try {
		const variants = await buildScanVariants(filePath);

		for (const variant of variants) {
			const decoded = decodeQR(variant);
			if (!decoded || !decoded.data) continue;

			const parsed = parseAadhaarQR(decoded.data);
			if (!parsed.success) continue;

			return {
				success: true,
				qrFound: true,
				qrDetected: true,
				extractedData: parsed.data,
				confidenceScore: computeQRConfidence(parsed.data),
				rawPayload: decoded.data,
				message: 'QR code detected and Aadhaar XML parsed'
			};
		}

		return {
			success: true,
			qrFound: false,
			qrDetected: false,
			extractedData: null,
			confidenceScore: 0,
			rawPayload: null,
			message: 'No readable Aadhaar QR data found'
		};
	} catch (error) {
		return {
			success: false,
			qrFound: false,
			qrDetected: false,
			extractedData: null,
			confidenceScore: 0,
			rawPayload: null,
			message: error.message
		};
	}
};

module.exports = {
	scanAadhaarQRCode,
	parseAadhaarQR
};
