// dsh-periscope — keep a set of text-only models (e.g.
// deepseek-v4-flash, deepseek-v4-pro) as the session default and automatically
// route every request that carries image content to a configured
// vision-capable model (deepseek-v4-flash-vision-exp) on the same provider.
//
// Two gates stand between a user attaching an image and the image reaching a
// vision-capable provider in a text-only session:
//
//  1. Host api-proxy image admission. When the user submits a message that
//     contains an image, the host's `prompt` handler resolves the session's
//     CURRENT model (`llm.resolveModelInfo`) and REJECTS the prompt when that
//     model does not declare image input ("Model X does not support image
//     input.", reason MODEL_DOES_NOT_SUPPORT_IMAGES). The image never enters
//     the conversation. This plugin wraps `llm.resolveModelInfo` so ANY
//     configured text model reports image input, letting the prompt (and its
//     image) be admitted. The WIRE model is corrected at gate 2; the catalog
//     (used by the adapter's own serialization check) is never modified.
//
//  2. LLM stream routing. The harness funnels every chat request through
//     `llm.streamWithRegistration(options, prepared)` — the shared entry for
//     `llm.stream(...)` and the agent loop's `preparedCall.stream(...)`. This
//     plugin wraps that method: when a request's messages contain an image
//     block AND the request is routed to one of the configured text models,
//     the wrapper re-dispatches the call on the configured vision model with a
//     FRESH (unprepared) dispatch, so the vision model's capabilities are
//     re-resolved and the harness's text-only image projection is skipped. The
//     wire request then carries the vision model, which its catalog declares
//     image-capable. Text-only requests pass through untouched on the text
//     model.
//
// Recursion / invariant notes:
//  - The re-dispatched request carries the vision model (no longer a text
//    model), so the stream wrapper passes it straight through.
//  - The re-dispatched request is deliberately NOT marked as an agent-loop
//    request: the agent-loop request-reconstruction invariant rejects a marked
//    request whose model diverges from the folded request header (the header
//    still records the text model). Unmarked, that invariant skips it and text
//    requests remain protected.
//
// @module dsh-periscope
import z from "@deepseek-ai/schemastery";

/** Cordis plugin name used by loader diagnostics. */
const name = "periscope";
/** Services required by the plugin. */
const inject = ["llm"];

/** Plugin configuration: the provider route and the text/vision models. */
const Config = z.object({
	/** LLM route provider owning the text and vision models (DeepSeek official adapter default). */
	provider: z.string().default("deepseek-official"),
	/** The text-only models whose image-bearing requests are routed to the vision model. */
	textModels: z.array(z.string()).default(["deepseek-v4-flash", "deepseek-v4-pro"]),
	/** The vision-capable model used for requests whose messages contain images. */
	visionModel: z.string().default("deepseek-v4-flash-vision-exp")
});

/**
 * Whether a content-block array contains any image block, including images
 * nested inside tool-result content (e.g. output of the built-in read_image
 * tool).
 */
function hasImageBlocks(blocks) {
	if (!Array.isArray(blocks)) return false;
	return blocks.some((block) => {
		if (block === null || typeof block !== "object") return false;
		if (block.type === "image") return true;
		if (block.type === "tool-result" && hasImageBlocks(block.content)) return true;
		return false;
	});
}

/** Whether any message in a request carries an image block in its content. */
function hasImageMessages(messages) {
	return Array.isArray(messages) && messages.some((message) => message !== null && typeof message === "object" && Array.isArray(message.content) && hasImageBlocks(message.content));
}

/**
 * Mount both wrappers.
 * @param ctx - the plugin context; the wrappers are effects scoped to it.
 * @param config - resolved plugin configuration.
 */
function apply(ctx, config) {
	const provider = config.provider.trim();
	const textModels = Array.isArray(config.textModels) ? config.textModels.map((m) => String(m).trim()).filter((m) => m.length > 0) : [];
	const visionModel = config.visionModel.trim();
	if (provider.length === 0 || textModels.length === 0 || visionModel.length === 0) {
		ctx.logger.warn("vision-autoswitch: provider/textModels/visionModel must be configured; plugin disabled");
		return;
	}
	if (textModels.includes(visionModel)) {
		ctx.logger.warn(`vision-autoswitch: visionModel "${visionModel}" is also listed in textModels; nothing to switch — plugin disabled`);
		return;
	}
	const llm = ctx.get("llm");
	if (llm === void 0) {
		ctx.logger.warn("vision-autoswitch: llm service not mounted; plugin disabled");
		return;
	}
	const disposers = [];

	// Gate 1: admit image prompts by having every configured text model report
	// image input (attached images are accepted into the conversation).
	const originalResolve = typeof llm.resolveModelInfo === "function" ? llm.resolveModelInfo : void 0;
	if (originalResolve !== void 0) {
		const wrappedResolve = async function (p, m, signal) {
			const info = await originalResolve.call(llm, p, m, signal);
			if (p === provider && textModels.includes(m) && info !== null && typeof info === "object" && Array.isArray(info.inputModalities) && !info.inputModalities.includes("image")) {
				return { ...info, inputModalities: [...info.inputModalities, "image"] };
			}
			return info;
		};
		try {
			llm.resolveModelInfo = wrappedResolve;
		} catch (error) {
			ctx.logger.warn(`vision-autoswitch: could not wrap llm.resolveModelInfo: ${String(error && error.message !== void 0 ? error.message : error)}`);
		}
		if (llm.resolveModelInfo === wrappedResolve) disposers.push(() => {
			if (llm.resolveModelInfo === wrappedResolve) llm.resolveModelInfo = originalResolve;
		});
	}

	// Gate 2: route image-carrying requests to the vision model for the wire.
	const originalStream = typeof llm.streamWithRegistration === "function" ? llm.streamWithRegistration : void 0;
	if (originalStream !== void 0) {
		const wrappedStream = function (options, prepared) {
			if (options !== null && typeof options === "object" && options.provider === provider && textModels.includes(options.model) && hasImageMessages(options.messages)) {
				// Swap to the vision model and re-dispatch unprepared: adapterStream
				// then re-resolves the vision model's exact capabilities and skips the
				// text-only image projection. The options object is never mutated
				// (requests are frozen); a fresh object is dispatched instead.
				const effective = { ...options, model: visionModel };
				return llm.stream(effective);
			}
			return originalStream.call(llm, options, prepared);
		};
		try {
			llm.streamWithRegistration = wrappedStream;
		} catch (error) {
			ctx.logger.warn(`vision-autoswitch: could not wrap llm.streamWithRegistration: ${String(error && error.message !== void 0 ? error.message : error)}`);
		}
		if (llm.streamWithRegistration === wrappedStream) disposers.push(() => {
			if (llm.streamWithRegistration === wrappedStream) llm.streamWithRegistration = originalStream;
		});
	}

	if (disposers.length === 0) {
		ctx.logger.warn("vision-autoswitch: nothing to wrap (resolveModelInfo/streamWithRegistration unavailable); plugin disabled");
		return;
	}
	ctx.logger.info(`vision-autoswitch: image prompts on ${provider}/${textModels.join(", ")} will be admitted and routed to ${provider}/${visionModel}`);
	return () => {
		for (const dispose of disposers) dispose();
	};
}

export { Config, apply, inject, name };
