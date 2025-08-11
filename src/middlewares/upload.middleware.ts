import multer from "multer";
import path from "path";
import crypto from "crypto";

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		// Use absolute path to ensure uploads directory is found
		const uploadsDir = path.resolve(process.cwd(), "uploads");
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix =
			Date.now() + "-" + crypto.randomBytes(6).toString("hex");
		cb(
			null,
			file.fieldname +
				"-" +
				uniqueSuffix +
				path.extname(file.originalname)
		);
	},
});

export const upload = multer({
	storage,
	limits: {
		fileSize: 100 * 1024 * 1024,
		files: 10,
	},
});
