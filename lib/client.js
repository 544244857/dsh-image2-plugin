// Browser half of dsh-image2-tool.
//
// The host serves this file as the package's `./client` bundle and the browser
// registers it through the boot-time `window.__ModuleLoader__` facade; the
// factory body stays lazy until the row is first rendered. It contributes the
// `plugins.row.config` slot: the Plugin manager renders the row's configuration
// entry there, `view: "summary"` as the one-line description and `view: "page"`
// as the detail body, both keyed by `<package name>#<row id>`.
//
// Configuration is read and written exclusively through the official settings
// form handed to the page view (`form.state` / `form.mutate`), so persistence,
// secret redaction, and stale-write fencing stay owned by the settings service.
window.__ModuleLoader__.load({
	id: "dsh-image2-tool",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");

		//#region css
		const css = [
			'.dshimg2-panel{display:flex;flex-direction:column;gap:14px;font-family:-apple-system,"SF Pro Text","PingFang SC","Segoe UI",system-ui,sans-serif;color:inherit}',
			".dshimg2-head{display:flex;flex-direction:column;gap:3px}",
			".dshimg2-title{font-size:14px;font-weight:600}",
			".dshimg2-sub{font-size:11.5px;line-height:1.55;opacity:.62}",
			".dshimg2-field{display:flex;flex-direction:column;gap:6px}",
			".dshimg2-label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:500}",
			".dshimg2-key{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;opacity:.55;background:rgba(127,127,127,.14);border-radius:5px;padding:1px 5px}",
			".dshimg2-badge{font-size:10.5px;line-height:1;border-radius:999px;padding:3px 7px;background:rgba(0,113,227,.14);color:#0071e3;white-space:nowrap}",
			".dshimg2-input{box-sizing:border-box;width:100%;max-width:520px;font:inherit;font-size:13px;padding:7px 10px;border-radius:8px;border:1px solid rgba(127,127,127,.34);background:var(--dsw-alias-bg-base,#fff);color:inherit;outline:none;transition:border-color 140ms ease,box-shadow 140ms ease}",
			".dshimg2-input:focus{border-color:#0071e3;box-shadow:0 0 0 3px rgba(0,113,227,.16)}",
			".dshimg2-input:disabled{opacity:.55;cursor:not-allowed}",
			".dshimg2-check{width:16px;height:16px;accent-color:#0071e3}",
			".dshimg2-hint{margin:0;font-size:11.5px;line-height:1.5;opacity:.6;max-width:520px}",
			".dshimg2-problem{margin:0;font-size:11.5px;line-height:1.5;color:#d70015}",
			".dshimg2-note{margin:0;font-size:12.5px;line-height:1.6;opacity:.66}",
			".dshimg2-footer{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
			".dshimg2-save,.dshimg2-clear{font:inherit;font-size:12.5px;font-weight:500;border-radius:8px;padding:6px 13px;cursor:pointer;border:1px solid transparent;transition:opacity 140ms ease,background 140ms ease,color 140ms ease,border-color 140ms ease}",
			".dshimg2-save{background:#0071e3;color:#fff}",
			".dshimg2-save:hover:not(:disabled){background:#0077ed}",
			".dshimg2-save:disabled{opacity:.45;cursor:not-allowed}",
			".dshimg2-clear{background:transparent;color:inherit;border-color:rgba(127,127,127,.34)}",
			".dshimg2-clear:hover:not(:disabled){border-color:#d70015;color:#d70015}",
			".dshimg2-status{font-size:11.5px;opacity:.66}",
			"@media (prefers-color-scheme: dark){.dshimg2-badge{background:rgba(10,132,255,.22);color:#0a84ff}.dshimg2-input:focus{border-color:#0a84ff;box-shadow:0 0 0 3px rgba(10,132,255,.22)}.dshimg2-save{background:#0a84ff}.dshimg2-save:hover:not(:disabled){background:#3d9bff}.dshimg2-problem{color:#ff453a}.dshimg2-clear:hover:not(:disabled){border-color:#ff453a;color:#ff453a}}",
		].join("");
		const tagId = "dsh-image2-tool/row-config.css";
		if (
			typeof document !== "undefined" &&
			document.querySelector('style[data-plugin-css="' + tagId + '"]') === null
		) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-image2-tool";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		/** `<package name>#<row id declared by the bundle's cordis.patch.yml>`. */
		const ROW_CONFIG_KEY = "dsh-image2-tool#image2";
		const TIMEOUT_MIN = 1;
		const TIMEOUT_MAX = 2147483647;

		/** Editable fields, in page order. Mirrors the plugin's Config schema. */
		const FIELDS = [
			{
				key: "baseUrl",
				kind: "text",
				label: { zh: "中转地址", en: "Relay URL" },
				hint: {
					zh: "中转服务的地址，含 API 前缀；缺少 /v1 时运行时会自动补上。保持占位值会直接报错。",
					en: "Relay URL including its API prefix; the runtime appends /v1 when missing. Keeping the placeholder makes the tool fail.",
				},
				placeholder: "https://your-image-relay.example.com/v1",
			},
			{
				key: "model",
				kind: "text",
				label: { zh: "模型", en: "Model" },
				hint: {
					zh: "中转服务支持的具体模型 ID。",
					en: "Exact model ID supported by your relay.",
				},
				placeholder: "gpt-image-1",
			},
			{
				key: "apiKey",
				kind: "secret",
				label: { zh: "API Key", en: "API key" },
				hint: {
					zh: "写入后不会回显，也不会被读取；留空保存会保留已保存的密钥。填写后优先级高于 apiKeyEnv。",
					en: "Never echoed back or read back; saving an empty box keeps the stored key. Takes precedence over apiKeyEnv.",
				},
				placeholder: { zh: "留空表示保留现有密钥", en: "Leave empty to keep the stored key" },
			},
			{
				key: "apiKeyEnv",
				kind: "text",
				label: { zh: "密钥环境变量", en: "Key environment variable" },
				hint: {
					zh: "存放密钥的环境变量名；上面的 API Key 为空时使用它。",
					en: "Environment variable holding the key; used when the API key above is empty.",
				},
				placeholder: "IMAGE2_API_KEY",
			},
			{
				key: "autoGenerateAssets",
				kind: "boolean",
				label: { zh: "自动生成素材", en: "Auto-generate assets" },
				hint: {
					zh: "允许开发过程中生成缺失的视觉素材（会先检查已有与外部资源）。",
					en: "Allow missing visual assets to be generated during development after checking existing and external resources.",
				},
			},
			{
				key: "outputDir",
				kind: "text",
				label: { zh: "输出目录", en: "Output directory" },
				hint: {
					zh: "当前会话项目内的输出目录。",
					en: "Output directory inside the current session project.",
				},
				placeholder: "imagegen-output",
			},
			{
				key: "timeoutMs",
				kind: "number",
				label: { zh: "超时（毫秒）", en: "Timeout (ms)" },
				hint: {
					zh: "单次中转或图片下载请求的完整超时时间，范围 " + TIMEOUT_MIN + " ~ " + TIMEOUT_MAX + "。",
					en: "Timeout for each complete relay or image download request, from " + TIMEOUT_MIN + " to " + TIMEOUT_MAX + ".",
				},
				placeholder: "180000",
			},
		];

		const TEXT = {
			title: { zh: "image2 配置", en: "image2 configuration" },
			subtitle: {
				zh: "保存后写入当前 profile 的 cordis.patch.yml，立即生效，无需重启。清空文本框等于删除该覆盖值、回落默认值。",
				en: "Saving writes the active profile's cordis.patch.yml and applies at once, with no restart. Emptying a text box removes that override and falls back to the default.",
			},
			overridden: { zh: "已自定义", en: "overridden" },
			save: { zh: "保存", en: "Save" },
			saving: { zh: "保存中…", en: "Saving…" },
			clear: { zh: "清除已保存的 API Key", en: "Clear stored API key" },
			clearConfirm: { zh: "确认清除？", en: "Confirm clear?" },
			saved: {
				zh: "已保存，写入当前 profile 的 cordis.patch.yml。",
				en: "Saved to the active profile's cordis.patch.yml.",
			},
			cleared: {
				zh: "已清除保存的 API Key，运行时会改用密钥环境变量。",
				en: "Stored API key cleared; the runtime falls back to the key environment variable.",
			},
			rejected: {
				zh: "保存被拒绝：配置可能已被其他页面改动，请重试。",
				en: "Save rejected: the configuration may have changed in another page. Try again.",
			},
			dirty: { zh: "有未保存的改动", en: "Unsaved changes" },
			clean: { zh: "与已保存的配置一致", en: "Matches the saved configuration" },
			loading: { zh: "正在读取配置…", en: "Loading configuration…" },
			unavailable: {
				zh: "当前页面的 Host 持久化不可用，无法写入配置。",
				en: "Host persistence is unavailable on this page, so the configuration cannot be written.",
			},
			notReady: {
				zh: "该行的配置暂时不可编辑（尚无可用取值）。",
				en: "This row's configuration is not editable right now (no value available yet).",
			},
			noForm: {
				zh: "该行未提供可编辑的配置表单：它的条目没有声明可编辑字段。",
				en: "This row exposes no editable configuration form: its entry declares no editable fields.",
			},
			readOnly: {
				zh: "本页只能查看：当前 profile 不接受此表单的写入。",
				en: "Read-only here: the active profile refuses writes from this form.",
			},
			problemNumber: { zh: "请输入整数", en: "Enter a whole number" },
			problemEmpty: { zh: "请输入超时毫秒数", en: "Enter a timeout in milliseconds" },
			problemRange: { zh: "取值范围 ", en: "Range " },
		};

		function hasOwn(object, key) {
			return Object.prototype.hasOwnProperty.call(object, key);
		}

		function isEnglish() {
			if (typeof navigator === "undefined") return false;
			const primary = String(
				(navigator.languages && navigator.languages[0]) || navigator.language || "zh",
			).toLowerCase();
			return primary.startsWith("en");
		}

		/** Resolve `{ zh, en }` text, passing plain strings through untouched. */
		function L(text) {
			if (text === null || typeof text !== "object") return text;
			return isEnglish() ? text.en : text.zh;
		}

		/** The bundle page's one-line row description. Plain text: it renders inside a <p>. */
		function summaryText() {
			return isEnglish()
				? "Configurable: relay URL · model · API key · env var · auto-generate · output dir · timeout"
				: "可配置：中转地址 · 模型 · API Key · 环境变量 · 自动生成素材 · 输出目录 · 超时";
		}

		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}

		/**
		 * The row's configuration page.
		 *
		 * `props.form` is the settings form the Plugin manager supplies for this row
		 * (`{ state, mutate }`), or absent when the row has no settings namespace.
		 * It never receives the stored secret, so the API key input is write-only.
		 */
		function Image2ConfigCard(props) {
			const form = props && props.form ? props.form : null;
			const snapshot = form && form.state ? form.state : null;
			const status = snapshot && typeof snapshot.status === "string" ? snapshot.status : "unavailable";
			const revision = snapshot && typeof snapshot.revision === "number" ? snapshot.revision : -1;
			const value = snapshot && isRecord(snapshot.value) ? snapshot.value : {};
			const user = snapshot && isRecord(snapshot.user) ? snapshot.user : {};
			const writable = snapshot ? snapshot.writable !== false : false;

			// Staged edits, keyed by field; a new revision means the Host published
			// fresh values, so the staged copy is dropped and the inputs re-derive.
			const [edits, setEdits] = react.useState({});
			const [seenRevision, setSeenRevision] = react.useState(revision);
			const [busy, setBusy] = react.useState(false);
			const [notice, setNotice] = react.useState(null);
			const [armed, setArmed] = react.useState(false);

			if (seenRevision !== revision) {
				setSeenRevision(revision);
				setEdits({});
			}

			function edit(field, next) {
				setNotice(null);
				setArmed(false);
				setEdits((previous) => Object.assign({}, previous, { [field.key]: next }));
			}

			function textValue(field) {
				if (hasOwn(edits, field.key)) {
					return typeof edits[field.key] === "string" ? edits[field.key] : "";
				}
				const raw = value[field.key];
				return raw === undefined || raw === null ? "" : String(raw);
			}

			function boolValue(field) {
				if (hasOwn(edits, field.key)) return edits[field.key] === true;
				return value[field.key] === true;
			}

			const problems = {};
			for (const field of FIELDS) {
				if (!hasOwn(edits, field.key) || field.kind !== "number") continue;
				const raw = edits[field.key];
				const text = typeof raw === "string" ? raw.trim() : String(raw);
				if (text === "") problems[field.key] = L(TEXT.problemEmpty);
				else if (!/^-?\d+$/.test(text)) problems[field.key] = L(TEXT.problemNumber);
				else {
					const parsed = Number(text);
					if (parsed < TIMEOUT_MIN || parsed > TIMEOUT_MAX) {
						problems[field.key] = L(TEXT.problemRange) + TIMEOUT_MIN + " ~ " + TIMEOUT_MAX;
					}
				}
			}
			const blocked = Object.keys(problems).length > 0;

			/** Ordered `set`/`unset` operations for the staged edits. */
			function buildOps() {
				const ops = [];
				for (const field of FIELDS) {
					if (!hasOwn(edits, field.key)) continue;
					if (problems[field.key] !== undefined) continue;
					const draft = edits[field.key];
					if (field.kind === "secret") {
						// An empty secret box means "keep the stored key", never "erase it".
						if (typeof draft !== "string" || draft === "") continue;
						ops.push({ op: "set", path: [field.key], value: draft });
						continue;
					}
					if (field.kind === "boolean") {
						ops.push({ op: "set", path: [field.key], value: draft === true });
						continue;
					}
					if (field.kind === "number") {
						ops.push({ op: "set", path: [field.key], value: Number(String(draft).trim()) });
						continue;
					}
					const text = typeof draft === "string" ? draft.trim() : "";
					if (text === "") ops.push({ op: "unset", path: [field.key] });
					else ops.push({ op: "set", path: [field.key], value: text });
				}
				return ops;
			}

			function expectedRevision() {
				return revision >= 0 ? revision : undefined;
			}

			function settle(ok, success, failure) {
				setBusy(false);
				setNotice({ kind: ok ? "ok" : "err", text: L(ok ? success : failure) });
			}

			async function save() {
				if (form === null || busy) return;
				const ops = buildOps();
				if (ops.length === 0) return;
				setBusy(true);
				setNotice(null);
				let ok = false;
				try {
					ok = await form.mutate(ops, expectedRevision());
				} catch (error) {
					ok = false;
				}
				if (ok) setEdits({});
				settle(ok, TEXT.saved, TEXT.rejected);
			}

			async function clearSecret() {
				if (form === null || busy) return;
				setBusy(true);
				setArmed(false);
				setNotice(null);
				let ok = false;
				try {
					ok = await form.mutate([{ op: "unset", path: ["apiKey"] }], expectedRevision());
				} catch (error) {
					ok = false;
				}
				settle(ok, TEXT.cleared, TEXT.rejected);
			}

			function fieldRow(field) {
				const controlId = "dshimg2-" + field.key;
				const problem = problems[field.key];
				const disabled = busy || !writable;
				const shared = { id: controlId, disabled };
				let control;
				if (field.kind === "boolean") {
					control = react_jsx_runtime.jsx(
						"input",
						Object.assign({}, shared, {
							className: "dshimg2-check",
							type: "checkbox",
							checked: boolValue(field),
							onChange: (event) => edit(field, event.target.checked),
						}),
					);
				} else {
					control = react_jsx_runtime.jsx(
						"input",
						Object.assign({}, shared, {
							className: "dshimg2-input",
							type:
								field.kind === "secret" ? "password" : field.kind === "number" ? "number" : "text",
							autoComplete: field.kind === "secret" ? "new-password" : "off",
							spellCheck: false,
							value: textValue(field),
							placeholder: L(field.placeholder),
							onChange: (event) => edit(field, event.target.value),
						}),
					);
				}
				return react_jsx_runtime.jsxs("div", {
					className: "dshimg2-field",
					children: [
						react_jsx_runtime.jsxs("label", {
							className: "dshimg2-label",
							htmlFor: controlId,
							children: [
								react_jsx_runtime.jsx("span", { className: "dshimg2-name", children: L(field.label) }),
								react_jsx_runtime.jsx("code", { className: "dshimg2-key", children: field.key }),
								hasOwn(user, field.key)
									? react_jsx_runtime.jsx("span", {
											className: "dshimg2-badge",
											children: L(TEXT.overridden),
										})
									: null,
							],
						}),
						control,
						problem === undefined
							? null
							: react_jsx_runtime.jsx("p", { className: "dshimg2-problem", children: problem }),
						react_jsx_runtime.jsx("p", { className: "dshimg2-hint", children: L(field.hint) }),
					],
				});
			}

			if (form === null) {
				return react_jsx_runtime.jsx("p", { className: "dshimg2-note", children: L(TEXT.noForm) });
			}
			if (status !== "ready") {
				const text =
					status === "loading"
						? L(TEXT.loading)
						: status === "unavailable"
							? L(TEXT.unavailable)
							: L(TEXT.notReady);
				return react_jsx_runtime.jsx("p", { className: "dshimg2-note", children: text });
			}

			const ops = buildOps();
			const dirty = ops.length > 0;
			const statusText = busy
				? L(TEXT.saving)
				: notice
					? notice.text
					: writable
						? L(dirty ? TEXT.dirty : TEXT.clean)
						: L(TEXT.readOnly);

			return react_jsx_runtime.jsxs("div", {
				className: "dshimg2-panel",
				children: [
					react_jsx_runtime.jsxs("div", {
						className: "dshimg2-head",
						children: [
							react_jsx_runtime.jsx("strong", { className: "dshimg2-title", children: L(TEXT.title) }),
							react_jsx_runtime.jsx("span", { className: "dshimg2-sub", children: L(TEXT.subtitle) }),
						],
					}),
					...FIELDS.map((field) => fieldRow(field)),
					react_jsx_runtime.jsxs("div", {
						className: "dshimg2-footer",
						children: [
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "dshimg2-save",
								disabled: busy || !dirty || blocked || !writable,
								onClick: save,
								children: L(TEXT.save),
							}),
							react_jsx_runtime.jsx("button", {
								type: "button",
								className: "dshimg2-clear",
								disabled: busy || !writable,
								onClick: () => (armed ? clearSecret() : setArmed(true)),
								children: L(armed ? TEXT.clearConfirm : TEXT.clear),
							}),
							react_jsx_runtime.jsx("span", { className: "dshimg2-status", children: statusText }),
						],
					}),
				],
			});
		}

		const inject = ["slots"];

		function apply(ctx) {
			// The Plugin manager declares `plugins.row.config` as a child of its page,
			// so the injection waits for that declaration and collapses with the page.
			ctx.slots.inject("plugins.row.config", () =>
				ctx.slots.register({ name: "plugins.row.config", key: ROW_CONFIG_KEY }, (slotProps) =>
					slotProps && slotProps.view === "summary"
						? summaryText()
						: react_jsx_runtime.jsx(Image2ConfigCard, { form: slotProps ? slotProps.form : undefined }),
				),
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		// Exported for the offline stub test and for host-side preflight checks.
		exports.Image2ConfigCard = Image2ConfigCard;
		exports.summaryText = summaryText;
		exports.ROW_CONFIG_KEY = ROW_CONFIG_KEY;
		return module.exports;
	},
});
