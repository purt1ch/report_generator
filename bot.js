import { config } from "dotenv";
import { Telegraf, Scenes, session } from "telegraf";
import { spawn } from "node:child_process";
import { createReadStream, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

config();

const token = process.env.BOT_TOKEN;

if (!token) {
	console.error("Environment variable BOT_TOKEN is not set. Add it to .env or system variables.");
	process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bot = new Telegraf(token);

bot.use(session());

const generateScene = new Scenes.WizardScene(
	"generate",
	async (ctx) => {
		ctx.wizard.state.data = {
			type: 0,
			theme: "",
			teacherName: "",
			teacherLine1: "",
			teacherLine2: "",
			group: "",
			kursant: ""
		};

		await ctx.reply(
			"📝 Начнём создание документа.\n\n" +
			"Введите тип документа:\n" +
			"0 — Доклад (по умолчанию)\n" +
			"1 — Сообщение\n" +
			"2 — Реферат"
		);
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (text === undefined) {
			await ctx.reply("❌ Пожалуйста, отправьте число 0, 1 или 2.");
			return;
		}

		const type = text === "" ? 0 : Number(text);

		if (!Number.isInteger(type) || type < 0 || type > 2) {
			await ctx.reply("❌ Неверный формат. Укажите 0, 1 или 2.");
			return;
		}

		ctx.wizard.state.data.type = type;
		await ctx.reply("📌 Введите название темы (без символов \\ / : * ? \" < > |).");
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Название темы не может быть пустым.");
			return;
		}

		if (/[\\/:*?"<>|]/.test(text)) {
			await ctx.reply("❌ Тема содержит запрещённые символы \\ / : * ? \" < > |. Попробуйте снова.");
			return;
		}

		ctx.wizard.state.data.theme = text;
		await ctx.reply("👨‍🏫 Введите строку 1 о преподавателе (например: \"доцент Маньков А.В.\").");
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Эта строка не может быть пустой. Укажите строку 1 информации о преподавателе.");
			return;
		}

		ctx.wizard.state.data.teacherName = text;
		await ctx.reply("✍️ Введите строку 2 о преподавателе (например: \"КИН, доцент кафедры ...\").");
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Строка 2 не может быть пустой. Пожалуйста, повторите ввод.");
			return;
		}

		ctx.wizard.state.data.teacherLine1 = text;
		await ctx.reply("✍️ Введите строку 3 о преподавателе (например: \"социально-экономических дисциплин\").");
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Строка 3 не может быть пустой. Пожалуйста, повторите ввод.");
			return;
		}

		ctx.wizard.state.data.teacherLine2 = text;
		await ctx.reply("👥 Введите номер группы курсанта (например: \"3471\").");
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Группа не может быть пустой. Укажите номер группы.");
			return;
		}

		ctx.wizard.state.data.group = text;
		await ctx.reply("👤 Введите фамилию и инициалы курсанта (например: \"Апасов А.А.\").");
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Фамилия и инициалы курсанта не могут быть пустыми.");
			return;
		}

		ctx.wizard.state.data.kursant = text;

		await ctx.reply("⏳ Генерирую документ, пожалуйста подождите...");

		try {
			await writeRequestToFile(ctx.wizard.state.data);
			await runMainScript();

			const theme = ctx.wizard.state.data.theme;
			const outputPath = path.join(__dirname, "outputdocs", `${theme}.docx`);

			if (!existsSync(outputPath)) {
				await ctx.reply("❌ Файл не найден. Проверьте логи выполнения.");
			} else {
				await ctx.replyWithDocument({
					source: createReadStream(outputPath),
					filename: `${theme}.docx`
				});
				await ctx.reply("✅ Документ создан и отправлен!");
			}
		} catch (error) {
			console.error("Ошибка при генерации документа:", error);
			const message = error instanceof Error ? error.message : "неизвестная ошибка";
			await ctx.reply(`❌ Произошла ошибка: ${message}`);
		}

		ctx.wizard.state.data = null;
		return ctx.scene.leave();
	}
);

const stage = new Scenes.Stage([generateScene]);

stage.command("cancel", async (ctx) => {
	await ctx.reply("🚫 Диалог отменён.");
	return ctx.scene.leave();
});

bot.use(stage.middleware());

bot.start(async (ctx) => {
	await ctx.reply(
		"👋 Привет! Я бот для генерации документов.\n\n" +
		"Используй команду /generate, чтобы создать новый документ.\n" +
		"Команда /cancel отменяет текущий диалог."
	);
});

bot.command("generate", (ctx) => ctx.scene.enter("generate"));

bot.command("cancel", async (ctx) => {
	if (ctx.scene?.current) {
		await ctx.reply("🚫 Диалог отменён.");
		return ctx.scene.leave();
	}
	await ctx.reply("ℹ️ Сейчас нет активного диалога.");
});

bot.catch((err, ctx) => {
	console.error("Unhandled bot error", err);
	console.log("Context that caused the error:", ctx.update);
});

bot.launch().then(() => {
	console.log("Telegram bot started.");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

function escapeForJsLiteral(value) {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\r?\n/g, "\\n");
}

async function writeRequestToFile(data) {
	const requestPath = path.join(__dirname, "request.js");
	const type = Number.isInteger(data?.type) ? data.type : 0;
	const theme = escapeForJsLiteral(data?.theme ?? "");
	const teacherName = escapeForJsLiteral(data?.teacherName ?? "");
	const teacherLine1 = escapeForJsLiteral(data?.teacherLine1 ?? "");
	const teacherLine2 = escapeForJsLiteral(data?.teacherLine2 ?? "");
	const group = escapeForJsLiteral(data?.group ?? "");
	const kursant = escapeForJsLiteral(data?.kursant ?? "");

	if (![theme, teacherName, teacherLine1, teacherLine2, group, kursant].every((value) => value.length > 0)) {
		throw new Error("Не все данные заполнены. Проверьте тему, блок преподавателя, группу и курсанта.");
	}

	const baseFields = `"${theme}", "${teacherName}", "${teacherLine1}", "${teacherLine2}", "${group}", "${kursant}"`;
	const requestArray = type === 0
		? `[[${baseFields}]]`
		: `[[${type}, ${baseFields}]]`;

	const content = `// Заполнение запроса пошагово:
// 1) Каждый элемент массива описывает один документ.
// 2) Формат элемента без указания типа: ["Тема", "Строка 1 о преподавателе", "Строка 2 о преподавателе", "Строка 3 о преподавателе", "Группа", "Фамилия и инициалы курсанта"].
// 3) Если требуется сообщение или реферат, добавьте тип первым числом: [1, "Тема", ...] или [2, "Тема", ...].
// 4) Повторяйте элементы для каждого документа.
//
// Пример: export const request = [["Победа Красной Армии", "доцент Маньков А.В.", "КИН, доцент кафедры гуманитарных и", "социально-экономических дисциплин", "3471", "Апасов А.А."], [1, "Русская философия", "полковник Жуков С. А.", "Преподаватель кафедры гуманитарных и", "социально-экономических дисциплин", "3471", "Жуков А.В."]];


export const request = ${requestArray}
`;

	writeFileSync(requestPath, content, "utf-8");
}

function runMainScript() {
	return new Promise((resolve, reject) => {
		const mainPath = path.join(__dirname, "main.js");
		const nodeProcess = spawn("node", [mainPath], {
			cwd: __dirname,
			stdio: ["ignore", "pipe", "pipe"]
		});

		let stdout = "";
		let stderr = "";

		nodeProcess.stdout.on("data", (chunk) => {
			const text = chunk.toString();
			stdout += text;
			process.stdout.write(text);
		});

		nodeProcess.stderr.on("data", (chunk) => {
			const text = chunk.toString();
			stderr += text;
			process.stderr.write(text);
		});

		nodeProcess.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				const summary = [
					`main.js завершился с кодом ${code}.`,
					stderr ? `stderr: ${stderr.trim()}` : null,
					!stderr && stdout ? `stdout: ${stdout.trim()}` : null
				].filter(Boolean).join("\n");
				reject(new Error(summary || `main.js exited with code ${code}`));
			}
		});

		nodeProcess.on("error", (error) => {
			reject(error);
		});
	});
}


