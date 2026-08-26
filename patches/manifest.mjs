/**
 * dsh-periscope — core patch manifest for the generic file-attachment feature.
 *
 * The file-attachment feature touches DSH core packages that a third-party
 * Cordis plugin cannot extend at runtime (the api-proxy wire schema is a
 * module-internal zod constant, the composer intake is component-internal).
 * This manifest therefore carries the exact source-level replacements the
 * feature needs, applied to the installed core bundles by
 * `scripts/patch-core.mjs` (apply / revert / verify / status / diff).
 *
 * Every `old` string is the verbatim original text; every `new` string is the
 * patched replacement. `marker` is a distinctive snippet of the patched
 * content used for idempotency and `verify`.
 *
 * @module dsh-periscope/patches
 */

export const PATCHES = [
	// ────────────────────────────────────────────────────────────────────
	// 1. @deepseek-ai/dsh-attachment (main bundle)
	//    generic-file storage seam: AttachmentStore.saveFiles family and the
	//    wire admission helper admitEncodedFiles.
	// ────────────────────────────────────────────────────────────────────
	{
		pkg: "@deepseek-ai/dsh-attachment",
		rel: "lib/index.js",
		note: "generic-file admission + AttachmentStore.saveFiles family",
		marker: "async function admitEncodedFiles",
		replacements: [
			{
				note: "parameterize decodeBase64 so file uploads get their own error codes",
				old: `function decodeBase64(data) {
	const decoded = Buffer.from(data, "base64");
	if (data.length === 0 || decoded.toString("base64") !== data) throw new AttachmentError("Image upload is not canonical base64.", "INVALID_IMAGE_BASE64");
	return new Uint8Array(decoded);
}`,
				new: `function decodeBase64(data, code, message) {
	const decoded = Buffer.from(data, "base64");
	if (data.length === 0 || decoded.toString("base64") !== data) throw new AttachmentError(message ?? "Image upload is not canonical base64.", code ?? "INVALID_IMAGE_BASE64");
	return new Uint8Array(decoded);
}`
			},
			{
				note: "add admitEncodedFiles next to admitEncodedImages",
				old: `async function admitEncodedImages(attachments, images) {
	return attachments.saveImages(images.map(saveInput));
}`,
				new: `async function admitEncodedImages(attachments, images) {
	return attachments.saveImages(images.map(saveInput));
}
function fileSaveInput(file) {
	return {
		data: decodeBase64(file.data, "INVALID_FILE_BASE64", "File upload is not canonical base64."),
		mediaType: file.mediaType,
		name: file.name
	};
}
async function admitEncodedFiles(attachments, files) {
	return attachments.saveFiles(files.map(fileSaveInput));
}`
			},
			{
				note: "AttachmentStore: generic-file limits, batch validation and commit",
				old: `	readImageRequest(ref, policy, signal) {
		signal?.throwIfAborted();
		return Promise.reject(new AttachmentError("The mounted attachment provider cannot derive model-request images.", "ATTACHMENT_PROJECTION_UNSUPPORTED"));
	}
};`,
				new: `	readImageRequest(ref, policy, signal) {
		signal?.throwIfAborted();
		return Promise.reject(new AttachmentError("The mounted attachment provider cannot derive model-request images.", "ATTACHMENT_PROJECTION_UNSUPPORTED"));
	}
	fileLimits;
	validateFileBatch(inputs) {
		const limits = this.fileLimits;
		if (limits === void 0) throw new AttachmentError("This deployment does not accept file attachments.", "FILES_UNSUPPORTED");
		if (inputs.length > limits.maxFilesPerMessage) throw new AttachmentError("File batch exceeds the configured file-count limit.", "TOO_MANY_FILES");
		if (inputs.reduce((sum, input) => sum + input.data.byteLength, 0) > limits.maxMessageFileBytes) throw new AttachmentError("File batch exceeds the configured aggregate file-byte limit.", "FILES_TOO_LARGE");
		for (const input of inputs) {
			if (input.data.byteLength > limits.maxFileBytes) throw new AttachmentError("File exceeds the configured per-file byte limit.", "FILE_TOO_LARGE");
			if (typeof input.name !== "string" || input.name.trim().length === 0) throw new AttachmentError("File attachment requires a name.", "FILE_NAME_REQUIRED");
		}
	}
	async saveFiles(inputs) {
		this.validateFileBatch(inputs);
		const refs = [];
		for (const input of inputs) refs.push(await this.saveFile(input));
		return refs;
	}
	async saveFile(input) {
		throw new AttachmentError("The mounted attachment provider cannot store file attachments.", "ATTACHMENT_PROJECTION_UNSUPPORTED");
	}
};`
			},
			{
				note: "export admitEncodedFiles",
				old: `export { AttachmentError, AttachmentId, AttachmentStore, AttachmentStore as default, ImageVariantId, admitEncodedImages, isImageAdmissionError };`,
				new: `export { AttachmentError, AttachmentId, AttachmentStore, AttachmentStore as default, ImageVariantId, admitEncodedFiles, admitEncodedImages, isImageAdmissionError };`
			}
		]
	},

	// ────────────────────────────────────────────────────────────────────
	// 2. @deepseek-ai/dsh-attachment-local
	//    durable file storage: sanitized sha256-addressed files under
	//    DSH_HOME/attachments/v1/files/.
	// ────────────────────────────────────────────────────────────────────
	{
		pkg: "@deepseek-ai/dsh-attachment-local",
		rel: "lib/index.js",
		note: "LocalAttachmentStore.saveFile + fileLimits config",
		marker: "async saveFile(input) {",
		replacements: [
			{
				note: "file limits config fields",
				old: `		imageCompressionConcurrency: z.number().step(1).min(1).max(8).default(2)
	});`,
				new: `		imageCompressionConcurrency: z.number().step(1).min(1).max(8).default(2),
		maxFileBytes: z.number().step(1).min(1).default(20971520),
		maxFilesPerMessage: z.number().step(1).min(1).default(20),
		maxMessageFileBytes: z.number().step(1).min(1).default(209715200)
	});`
			},
			{
				note: "resolve fileLimits in the constructor",
				old: `				"image/gif"
			])
		});
		this.normalizationPolicy = Object.freeze({`,
				new: `				"image/gif"
			])
		});
		this.fileLimits = Object.freeze({
			maxFileBytes: config.maxFileBytes ?? 20971520,
			maxFilesPerMessage: config.maxFilesPerMessage ?? 20,
			maxMessageFileBytes: config.maxMessageFileBytes ?? 209715200
		});
		this.normalizationPolicy = Object.freeze({`
			},
			{
				note: "saveFiles/saveFile implementations",
				old: `	async saveImage(input) {
		const prepared = await this.compression.run(() => prepareImageFile(input, this.imageLimits, this.normalizationPolicy));
		return commitPreparedImageFile(this.root, prepared);
	}
	async readImage(ref, signal) {`,
				new: `	async saveImage(input) {
		const prepared = await this.compression.run(() => prepareImageFile(input, this.imageLimits, this.normalizationPolicy));
		return commitPreparedImageFile(this.root, prepared);
	}
	async saveFiles(inputs) {
		this.validateFileBatch(inputs);
		const refs = [];
		for (const input of inputs) refs.push(await this.saveFile(input));
		return refs;
	}
	async saveFile(input) {
		const name = sanitizeAttachmentFileName(input.name);
		const digest = createHash("sha256").update(input.data).digest("hex");
		const target = resolve(join(this.root, "files", \`\${digest}-\${name}\`));
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, input.data);
		return {
			attachmentId: \`sha256:\${digest}\`,
			name,
			mediaType: input.mediaType,
			bytes: input.data.byteLength,
			path: target
		};
	}
	async readImage(ref, signal) {`
			},
			{
				note: "file-name sanitizer helper",
				old: `/** Persistent content-addressed local attachment store. */
var LocalAttachmentStore = class extends AttachmentStore {`,
				new: `/** Sanitize a user-supplied file name to a safe basename for durable storage. */
function sanitizeAttachmentFileName(name) {
	const cleaned = String(name ?? "").replace(/[\\\\/:*?"<>|\\u0000-\\u001f]/g, "_").trim().slice(0, 120);
	return cleaned !== "" ? cleaned : "attachment";
}
/** Persistent content-addressed local attachment store. */
var LocalAttachmentStore = class extends AttachmentStore {`
			}
		]
	},

	// ────────────────────────────────────────────────────────────────────
	// 3. @deepseek-ai/dsh-host-apiproxy
	//    wire schema: accept {type:"file"} prompt parts; durablePromptContent
	//    admits and persists them as {type:"file", file:{…path}} blocks.
	// ────────────────────────────────────────────────────────────────────
	{
		pkg: "@deepseek-ai/dsh-host-apiproxy",
		rel: "lib/index.js",
		note: "file prompt parts on the session.prompt wire + durable admission",
		marker: "z$1.literal(\"file\")",
		replacements: [
			{
				note: "import admitEncodedFiles",
				old: `import { AttachmentError, admitEncodedImages } from "@deepseek-ai/dsh-attachment";`,
				new: `import { AttachmentError, admitEncodedFiles, admitEncodedImages } from "@deepseek-ai/dsh-attachment";`
			},
			{
				note: "promptContentPartSchema: add the file part",
				old: `}), z$1.object({
	type: z$1.literal("image"),
	mediaType: imageMediaTypeSchema,
	data: z$1.string(),
	name: z$1.string().optional()
})]);`,
				new: `}), z$1.object({
	type: z$1.literal("image"),
	mediaType: imageMediaTypeSchema,
	data: z$1.string(),
	name: z$1.string().optional()
}), z$1.object({
	type: z$1.literal("file"),
	name: z$1.string(),
	mediaType: z$1.string(),
	data: z$1.string()
})]);`
			},
			{
				note: "durablePromptContent: admit files alongside images",
				old: `async function durablePromptContent(ctx, content) {
	if (content.every((part) => part.type === "text")) return content.map((part) => ({
		type: "text",
		text: part.text
	}));
	const refs = await admitEncodedImages(ctx.attachments, content.filter((part) => part.type === "image"));
	let next = 0;
	return content.map((part) => part.type === "text" ? {
		type: "text",
		text: part.text
	} : {
		type: "image",
		attachment: refs[next++]
	});
}`,
				new: `async function durablePromptContent(ctx, content) {
	if (content.every((part) => part.type === "text")) return content.map((part) => ({
		type: "text",
		text: part.text
	}));
	const imageRefs = await admitEncodedImages(ctx.attachments, content.filter((part) => part.type === "image"));
	const fileRefs = await admitEncodedFiles(ctx.attachments, content.filter((part) => part.type === "file"));
	let nextImage = 0;
	let nextFile = 0;
	return content.map((part) => {
		if (part.type === "text") return {
			type: "text",
			text: part.text
		};
		if (part.type === "image") return {
			type: "image",
			attachment: imageRefs[nextImage++]
		};
		return {
			type: "file",
			file: fileRefs[nextFile++]
		};
	});
}`
			}
		]
	},

	// ────────────────────────────────────────────────────────────────────
	// 4. @deepseek-ai/dsh-llm-deepseek
	//    model-facing projection: a durable file block becomes text
	//    ([附件：name（size）\n完整路径：path\n请读取该文件内容后继续。]) so the
	//    agent reads the saved file with its own tools.
	// ────────────────────────────────────────────────────────────────────
	{
		pkg: "@deepseek-ai/dsh-llm-deepseek",
		rel: "lib/index.js",
		note: "file blocks projected to path-hint text for the model",
		marker: "function fileBlockText(block)",
		replacements: [
			{
				note: "flattenText includes file blocks; add fileBlockText/formatFileBytes",
				old: `/** Join the text blocks of a message (used for user/tool-result content). */
function flattenText(blocks) {
	return blocks.filter((block) => block.type === "text").map((block) => block.text).join("");
}`,
				new: `/** Short human-readable byte size for file-attachment hints. */
function formatFileBytes(bytes) {
	const n = Number(bytes) || 0;
	if (n < 1024) return String(n) + " B";
	if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
	return (n / (1024 * 1024)).toFixed(1) + " MB";
}
/** Model-facing text for one durable file attachment: the agent reads it by path. */
function fileBlockText(block) {
	const file = block.file ?? {};
	const name = typeof file.name === "string" && file.name !== "" ? file.name : "（未命名文件）";
	const size = typeof file.bytes === "number" ? formatFileBytes(file.bytes) : "";
	const path = typeof file.path === "string" && file.path !== "" ? file.path : "";
	return \`[附件：\${name}\${size !== "" ? "，大小 " + size : ""}]\\n\${path !== "" ? "完整路径：" + path + "\\n" : "（无法获取完整路径，请通过文件标签页或项目目录读取该文件。）\\n"}请读取该文件内容后继续。\`;
}
/** Join the text-bearing blocks of a message (text plus file-attachment hints). */
function flattenText(blocks) {
	return blocks.map((block) => block.type === "text" ? block.text : block.type === "file" ? fileBlockText(block) : "").join("");
}`
			},
			{
				note: "contentParts emits a text part for file blocks",
				old: `		case "image":
			nextImage.value += 1;
			parts.push(...await imageParts(block, images, {
				message,
				image: nextImage.value
			}, parts.length > 0));
			break;
		case "tool-result":`,
				new: `		case "image":
			nextImage.value += 1;
			parts.push(...await imageParts(block, images, {
				message,
				image: nextImage.value
			}, parts.length > 0));
			break;
		case "file":
			parts.push({
				type: "text",
				text: fileBlockText(block)
			});
			break;
		case "tool-result":`
			}
		]
	},

	// ────────────────────────────────────────────────────────────────────
	// 5. @deepseek-ai/dsh-client-ui-conversation
	//    composer draft attachments support kind:"file"; drop/paste classify
	//    files by MIME; send serializes file blocks; draft release is safe
	//    without a previewUrl; user bubbles render file chips.
	// ────────────────────────────────────────────────────────────────────
	{
		pkg: "@deepseek-ai/dsh-client-ui-conversation",
		rel: "lib/client.js",
		note: "file draft attachments (kind file) + wire serialization + history",
		marker: "supportedImageMediaTypeOf",
		replacements: [
			{
				note: "browserDraftAttachment classifies image vs file",
				old: `		/** Create one browser-only draft descriptor; only its id enters input state. */
		function browserDraftAttachment(file) {
			return {
				kind: "image",
				id: crypto.randomUUID(),
				previewUrl: URL.createObjectURL(file),
				file
			};
		}`,
				new: `		/** Create one browser-only draft descriptor; only its id enters input state. */
		function browserDraftAttachment(file) {
			const kind = supportedImageMediaTypeOf(file) !== void 0 ? "image" : "file";
			return {
				kind,
				id: crypto.randomUUID(),
				...kind === "image" ? { previewUrl: URL.createObjectURL(file) } : {},
				file
			};
		}`
			},
			{
				note: "MIME classifier helper (kept from the earlier classification patch)",
				old: `		}
		function bytesToBase64(data) {`,
				new: `		}
		/** Whether a browser File carries one of the supported raster image MIME types (undefined otherwise). */
		function supportedImageMediaTypeOf(file) {
			const value = file !== null && typeof file === "object" && typeof file.type === "string" ? file.type : "";
			return value === "image/png" || value === "image/jpeg" || value === "image/webp" || value === "image/gif" ? value : void 0;
		}
		function bytesToBase64(data) {`
			},
			{
				note: "createDraftImages validates images only; every other file becomes a draft",
				old: `			createDraftImages(files) {
				for (const file of files) imageMediaType(file.type);
				return files.map((file) => {
					const attachment = browserDraftAttachment(file);
					this.draftAttachments.set(attachment.id, attachment);
					this.createdImageUrls.add(attachment.previewUrl);
					return attachment;
				});
			}`,
				new: `			createDraftImages(files) {
				for (const file of files) {
					if (supportedImageMediaTypeOf(file) !== void 0) imageMediaType(file.type);
				}
				return files.map((file) => {
					const attachment = browserDraftAttachment(file);
					this.draftAttachments.set(attachment.id, attachment);
					if (attachment.kind === "image") this.createdImageUrls.add(attachment.previewUrl);
					return attachment;
				});
			}`
			},
			{
				note: "sendSession serializes draft blocks per kind",
				old: `				const content = [...await this.serializeImages(attachments.map((attachment) => attachment.file)), ...text === "" ? [] : [{`,
				new: `				const content = [...await this.serializeDraftBlocks(attachments), ...text === "" ? [] : [{`
			},
			{
				note: "serializeDraftImages returns per-kind blocks",
				old: `			async serializeDraftImages(imageIds) {
				const attachments = this.draftImages(imageIds);
				if (attachments.length !== imageIds.length) throw new Error("conversation.serializeDraftImages: one or more draft images are no longer available");
				return Promise.all(attachments.map((attachment) => this.encodeImage(attachment.file)));
			}`,
				new: `			async serializeDraftImages(imageIds) {
				const attachments = this.draftImages(imageIds);
				if (attachments.length !== imageIds.length) throw new Error("conversation.serializeDraftImages: one or more draft images are no longer available");
				return this.serializeDraftBlocks(attachments);
			}`
			},
			{
				note: "serializeDraftBlocks + encodeFile next to serializeImages/encodeImage",
				old: `			/** Convert browser files to canonical base64 prompt parts. */
			serializeImages(images) {
				return Promise.all(images.map(async (file) => ({
					type: "image",
					...await this.encodeImage(file)
				})));
			}
			/** Canonical base64 wire form of one browser image file. */
			async encodeImage(file) {
				return {
					mediaType: imageMediaType(file.type),
					data: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
					...file.name === "" ? {} : { name: file.name }
				};
			}`,
				new: `			/** Convert browser files to canonical base64 image prompt parts. */
			serializeImages(images) {
				return Promise.all(images.map(async (file) => ({
					type: "image",
					...await this.encodeImage(file)
				})));
			}
			/** Convert ordered draft attachments (images and generic files) to canonical wire prompt parts. */
			async serializeDraftBlocks(attachments) {
				const blocks = [];
				for (const attachment of attachments) {
					if (attachment.kind === "image") blocks.push({
						type: "image",
						...await this.encodeImage(attachment.file)
					});
					else blocks.push({
						type: "file",
						...await this.encodeFile(attachment.file)
					});
				}
				return blocks;
			}
			/** Canonical base64 wire form of one browser image file. */
			async encodeImage(file) {
				return {
					mediaType: imageMediaType(file.type),
					data: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
					...file.name === "" ? {} : { name: file.name }
				};
			}
			/** Canonical base64 wire form of one browser file attachment (name, media type, bytes). */
			async encodeFile(file) {
				return {
					name: file.name !== "" ? file.name : "attachment",
					mediaType: file.type !== "" ? file.type : "application/octet-stream",
					data: bytesToBase64(new Uint8Array(await file.arrayBuffer()))
				};
			}`
			},
			{
				note: "releaseDraftImage tolerates file drafts without a previewUrl (crash fix)",
				old: `			releaseDraftImage(id) {
				const attachment = this.draftAttachments.get(id);
				if (attachment === void 0) return;
				this.draftAttachments.delete(id);
				this.createdImageUrls.delete(attachment.previewUrl);
				revokePreview(attachment.previewUrl);
			}`,
				new: `			releaseDraftImage(id) {
				const attachment = this.draftAttachments.get(id);
				if (attachment === void 0) return;
				this.draftAttachments.delete(id);
				if (attachment.previewUrl !== void 0) {
					this.createdImageUrls.delete(attachment.previewUrl);
					revokePreview(attachment.previewUrl);
				}
			}`
			},
			{
				note: "intakeImages classifies by MIME; non-images become file drafts (with a client-side size cap)",
				old: `			const intakeImages = (0, react.useCallback)((files) => {
				if (addImages === void 0 || files.length === 0) return;
				const rejected = (() => {
					if (imageLimits !== void 0) {
						if (files.some((file) => !imageLimits.mediaTypes.includes(file.type))) return addImages(files);
						if (attachments.length + files.length > imageLimits.maxImagesPerMessage) return t("image.tooMany", { count: imageLimits.maxImagesPerMessage });
						if (files.some((file) => file.size > imageLimits.maxImageBytes)) return t("image.fileTooLarge", { size: imageSizeText(imageLimits.maxImageBytes) });
						if (attachments.reduce((sum, attachment) => sum + attachment.file.size, 0) + files.reduce((sum, file) => sum + file.size, 0) > imageLimits.maxMessageImageBytes) return t("image.totalTooLarge", { size: imageSizeText(imageLimits.maxMessageImageBytes) });
					}
					return addImages(files);
				})();
				if (rejected !== null) showToast(rejected);
			}, [`,
				new: `			const intakeImages = (0, react.useCallback)((files) => {
				if (addImages === void 0 || files.length === 0) return;
				// Files reaching the composer are classified by their real type:
				// supported raster images become image attachments; every other file
				// becomes a generic file attachment instead of an "unsupported image".
				const images = files.filter((file) => supportedImageMediaTypeOf(file) !== void 0);
				const others = files.filter((file) => supportedImageMediaTypeOf(file) === void 0);
				const rejected = (() => {
					if (images.length === 0) return null;
					if (imageLimits !== void 0) {
						if (images.some((file) => !imageLimits.mediaTypes.includes(file.type))) return addImages(images);
						if (attachments.length + images.length > imageLimits.maxImagesPerMessage) return t("image.tooMany", { count: imageLimits.maxImagesPerMessage });
						if (images.some((file) => file.size > imageLimits.maxImageBytes)) return t("image.fileTooLarge", { size: imageSizeText(imageLimits.maxImageBytes) });
						if (attachments.reduce((sum, attachment) => sum + attachment.file.size, 0) + images.reduce((sum, file) => sum + file.size, 0) > imageLimits.maxMessageImageBytes) return t("image.totalTooLarge", { size: imageSizeText(imageLimits.maxMessageImageBytes) });
					}
					return addImages(images);
				})();
				if (rejected !== null) showToast(rejected);
				if (others.length > 0) {
					// Client-side mirror of the host per-file cap: refuse oversized
					// files before the browser reads their bytes into memory.
					const maxFileBytes = 20 * 1024 * 1024;
					const oversized = others.filter((file) => file.size > maxFileBytes);
					const acceptable = others.filter((file) => file.size <= maxFileBytes);
					if (oversized.length > 0) showToast("文件超过 20 MB 限制，未添加该文件");
					if (acceptable.length > 0) {
						const fileRejected = addImages(acceptable);
						if (fileRejected !== null) showToast(fileRejected);
					}
				}
			}, [`
			},
			{
				note: "contentParts extracts file blocks for history chips",
				old: `		function contentParts(content) {
			const texts = [];
			const images = [];
			const rest = [];
			for (const block of content) {
				const b = block;
				if (b.type === "text" && typeof b.text === "string") texts.push(b.text);
				else if (b.type === "image" && b.attachment !== void 0) images.push({ attachment: b.attachment });
				else rest.push(block);
			}
			return {
				text: texts.join(""),
				images,
				rest
			};
		}`,
				new: `		function contentParts(content) {
			const texts = [];
			const images = [];
			const files = [];
			const rest = [];
			for (const block of content) {
				const b = block;
				if (b.type === "text" && typeof b.text === "string") texts.push(b.text);
				else if (b.type === "image" && b.attachment !== void 0) images.push({ attachment: b.attachment });
				else if (b.type === "file" && b.file !== void 0) files.push(b.file);
				else rest.push(block);
			}
			return {
				text: texts.join(""),
				images,
				files,
				rest
			};
		}`
			},
			{
				note: "UserStyleBubble passes files to the message-images slot",
				old: `			const { text, images, rest } = contentParts(content);`,
				new: `			const { text, images, files, rest } = contentParts(content);`
			},
			{
				note: "UserStyleBubble renders file chips beside images",
				old: `						renderMessageImages({
							images,
							align: "end"
						}),`,
				new: `						renderMessageImages({
							images,
							files,
							align: "end"
						}),`
			}
		]
	},

	// ────────────────────────────────────────────────────────────────────
	// 6. @deepseek-ai/dsh-client-ui-attachment
	//    draft rail + history render file chips with per-type icon tiles.
	// ────────────────────────────────────────────────────────────────────
	{
		pkg: "@deepseek-ai/dsh-client-ui-attachment",
		rel: "lib/client.js",
		note: "file-type icon tiles in the draft rail and message history",
		marker: "function FileTypeTile",
		replacements: [
			{
				note: "rail items carry kind/fileName/fileLabel",
				old: `			const railItems = (0, react.useMemo)(() => attachments.map((attachment) => ({
				id: attachment.id,
				previewUrl: attachment.previewUrl,
				alt: attachment.file.name || t("image.pending"),
				removeLabel: t("image.remove", { name: attachment.file.name }),
				attachment
			})), [attachments, t]);`,
				new: `			const railItems = (0, react.useMemo)(() => attachments.map((attachment) => ({
				id: attachment.id,
				kind: attachment.kind,
				previewUrl: attachment.previewUrl,
				alt: attachment.file.name || t("image.pending"),
				removeLabel: t("image.remove", { name: attachment.file.name }),
				fileName: attachment.file.name || t("image.pending"),
				fileLabel: (attachment.file.name || t("image.pending")) + (attachment.file.size != null ? "（" + formatAttachmentSize(attachment.file.size) + "）" : ""),
				attachment
			})), [attachments, t]);`
			},
			{
				note: "rail lightbox opens for images only",
				old: `						onOpen: (item) => {
							setPreview(item.attachment);
						},`,
				new: `						onOpen: (item) => {
							if (item.kind === "file") return;
							setPreview(item.attachment);
						},`
			},
			{
				note: "rail renders a type tile for file items instead of an img",
				old: `							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: AttachmentRail_module_css_default.thumbnail,
								title: labels.open,
								onClick: () => {
									onOpen(item);
								},
								children: (0, react_jsx_runtime.jsx)("img", {
									src: item.previewUrl,
									alt: item.alt
								})
							}), (0, react_jsx_runtime.jsx)("button", {`,
				new: `							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: AttachmentRail_module_css_default.thumbnail,
								title: item.kind === "file" ? item.removeLabel : labels.open,
								onClick: () => {
									onOpen(item);
								},
								children: item.kind === "file" ? (0, react_jsx_runtime.jsx)("span", {
									style: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px", maxWidth: "180px", minWidth: "0" },
									children: [(0, react_jsx_runtime.jsx)(FileTypeTile, { name: item.fileName }), (0, react_jsx_runtime.jsx)("span", {
										style: { fontSize: "11px", lineHeight: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
										children: item.fileLabel
									})]
								}) : (0, react_jsx_runtime.jsx)("img", {
									src: item.previewUrl,
									alt: item.alt
								})
							}), (0, react_jsx_runtime.jsx)("button", {`
			},
			{
				note: "MessageImages renders file chips; type-tile helpers added",
				old: `		/** Historical message-image slot entry. */
		function MessageImages({ images, loadImage, align, t }) {
			return (0, react_jsx_runtime.jsx)(ImageGallery, {
				images,
				load: loadImage,
				align,
				labels: messageImageLabels(t)
			});
		}`,
				new: `		/** Short human-readable byte size for file-attachment chips. */
		function formatAttachmentSize(bytes) {
			const n = Number(bytes) || 0;
			if (n < 1024) return String(n) + " B";
			if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
			return (n / (1024 * 1024)).toFixed(1) + " MB";
		}
		/** Uppercase extension of a file name ('' when absent). */
		function fileExtensionOf(name) {
			const dot = String(name ?? "").lastIndexOf(".");
			if (dot <= 0) return "";
			return String(name).slice(dot + 1).toUpperCase().slice(0, 8);
		}
		/** Tile background per extension family (falls back to a neutral slate). */
		function fileTypeColor(ext) {
			switch (ext) {
				case "DOC": case "DOCX": case "RTF": return "#2b579a";
				case "PDF": return "#c0392b";
				case "XLS": case "XLSX": case "CSV": case "TSV": return "#1e7145";
				case "PPT": case "PPTX": return "#c55a11";
				case "ZIP": case "RAR": case "7Z": case "GZ": return "#7f5af0";
				case "MD": case "TXT": case "LOG": case "INI": case "YAML": case "YML": case "JSON": return "#5b6472";
				case "PNG": case "JPG": case "JPEG": case "GIF": case "WEBP": case "SVG": case "BMP": case "AVIF": case "ICO": return "#3b82c4";
				case "MP3": case "WAV": case "FLAC": return "#8e44ad";
				case "MP4": case "MOV": case "AVI": case "MKV": return "#16a085";
				default: return "#6b7280";
			}
		}
		/** Brand letter shown in the file-type badge (falls back to the first extension letter). */
		function fileGlyphOf(ext) {
			switch (ext) {
				case "DOC": case "DOCX": case "RTF": case "ODT": return "W";
				case "XLS": case "XLSX": case "CSV": case "TSV": case "ODS": return "X";
				case "PPT": case "PPTX": return "P";
				case "PDF": return "P";
				case "ZIP": case "RAR": case "7Z": case "GZ": return "Z";
				case "MD": case "TXT": case "LOG": case "INI": case "YAML": case "YML": case "JSON": return "T";
				case "PNG": case "JPG": case "JPEG": case "GIF": case "WEBP": case "SVG": case "BMP": case "AVIF": case "ICO": return "I";
				case "MP3": case "WAV": case "FLAC": return "A";
				case "MP4": case "MOV": case "AVI": case "MKV": return "V";
				default: return ext.slice(0, 1) || "F";
			}
		}
		/** Document-sheet file-type icon: a light page with a folded corner and a brand badge glyph. */
		function FileTypeTile({ name }) {
			const ext = fileExtensionOf(name) || "FILE";
			const glyph = fileGlyphOf(ext);
			const color = fileTypeColor(ext);
			const shortExt = ext.length > 5 ? ext.slice(0, 5) : ext;
			return (0, react_jsx_runtime.jsx)("span", {
				style: { position: "relative", display: "inline-block", width: "34px", height: "40px", flex: "none" },
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						style: {
							position: "absolute",
							inset: 0,
							background: "linear-gradient(160deg, #fcfdfe 0%, #eef1f4 100%)",
							border: "1px solid rgba(15,23,42,0.12)",
							borderRadius: "4px",
							boxShadow: "0 1px 2px rgba(15,23,42,0.10)"
						}
					}),
					(0, react_jsx_runtime.jsx)("span", {
						style: {
							position: "absolute",
							top: 0,
							right: 0,
							width: "11px",
							height: "11px",
							background: "linear-gradient(225deg, #ffffff 0%, #dde2e8 100%)",
							clipPath: "polygon(0 0, 100% 0, 100% 100%)",
							borderBottomLeftRadius: "2px"
						}
					}),
					(0, react_jsx_runtime.jsx)("span", {
						style: {
							position: "absolute",
							left: "8px",
							top: "9px",
							width: "18px",
							height: "18px",
							background: color,
							color: "#ffffff",
							borderRadius: "3px",
							display: "inline-grid",
							placeItems: "center",
							fontWeight: 800,
							fontSize: "12px",
							lineHeight: 1,
							boxShadow: "0 1px 2px rgba(15,23,42,0.25)"
						},
						children: glyph
					}),
					(0, react_jsx_runtime.jsx)("span", {
						style: {
							position: "absolute",
							left: 0,
							right: 0,
							bottom: "3px",
							textAlign: "center",
							fontSize: "7px",
							fontWeight: 700,
							letterSpacing: "0.01em",
							textTransform: "uppercase",
							color: "rgba(15,23,42,0.55)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							padding: "0 2px",
							boxSizing: "border-box"
						},
						children: shortExt
					})
				]
			});
		}
		/** One generic-file attachment chip shown in message history (tile + name + size, path on hover). */
		function FileAttachmentChip({ file }) {
			const name = typeof file !== "undefined" && file !== null && typeof file.name === "string" && file.name !== "" ? file.name : "（未命名文件）";
			const size = typeof file !== "undefined" && file !== null && typeof file.bytes === "number" ? formatAttachmentSize(file.bytes) : "";
			return (0, react_jsx_runtime.jsx)("div", {
				className: MessageImage_module_css_default.frame,
				title: typeof file !== "undefined" && file !== null && typeof file.path === "string" ? file.path : void 0,
				children: (0, react_jsx_runtime.jsx)("span", {
					style: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px", maxWidth: "240px", minWidth: "0" },
					children: [(0, react_jsx_runtime.jsx)(FileTypeTile, { name }), (0, react_jsx_runtime.jsx)("span", {
						style: { fontSize: "12px", lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
						children: name + (size !== "" ? "（" + size + "）" : "")
					})]
				})
			});
		}
		/** Historical message-image/file slot entry. */
		function MessageImages({ images, files, loadImage, align, t }) {
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				Array.isArray(images) && images.length > 0 && (0, react_jsx_runtime.jsx)(ImageGallery, {
					images,
					load: loadImage,
					align,
					labels: messageImageLabels(t)
				}),
				Array.isArray(files) && files.length > 0 && (0, react_jsx_runtime.jsx)("div", {
					className: MessageImage_module_css_default.gallery,
					"data-align": align === "start" ? "start" : "end",
					children: files.map((file, index) => (0, react_jsx_runtime.jsx)(FileAttachmentChip, {
						file
					}, (typeof file !== "undefined" && file !== null && typeof file.attachmentId === "string" ? file.attachmentId : "file") + ":" + index))
				})
			] });
		}`
			}
		]
	}
];
