import { config } from "dotenv";
import { Telegraf, Scenes, session } from "telegraf";
import { spawn } from "node:child_process";
import { createReadStream, existsSync, writeFileSync, readFileSync } from "node:fs";
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

const dataPath = new URL("./data.json", import.meta.url);
const data = JSON.parse(readFileSync(dataPath, "utf-8"));

const teacherNames = Object.keys(data?.teachers ?? {});
const kursants = Array.isArray(data?.kursants3471) ? data.kursants3471 : [];
const kursantCount = kursants.length || 0;

const bot = new Telegraf(token);

bot.use(session());

const generateScene = new Scenes.WizardScene(
	"generate",
	async (ctx) => {
		ctx.wizard.state.data = {};
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

		await ctx.reply(
			"👨‍🏫 Введите фамилию преподавателя.\n" +
			"Доступные варианты: " + teacherNames.join(", ")
		);
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Фамилия не может быть пустой.");
			return;
		}

		if (!teacherNames.includes(text)) {
			await ctx.reply(
				`❌ Преподаватель "${text}" не найден. Используйте одну из фамилий: ${teacherNames.join(", ")}`
			);
			return;
		}

		ctx.wizard.state.data.teacher = text;

		const limitMessage = kursantCount
			? `👤 Введите номер курсанта по списку (1–${kursantCount}).`
			: "👤 Введите номер курсанта по списку (положительное целое число).";

		await ctx.reply(limitMessage);
		return ctx.wizard.next();
	},
	async (ctx) => {
		const text = ctx.message?.text?.trim();
		const number = Number(text);

		const isValidNumber = Number.isInteger(number) && number > 0 && (kursantCount ? number <= kursantCount : true);

		if (!isValidNumber) {
			const hint = kursantCount
				? `❌ Номер курсанта должен быть целым числом от 1 до ${kursantCount}.`
				: "❌ Номер курсанта должен быть положительным целым числом.";
			await ctx.reply(hint);
			return;
		}

		ctx.wizard.state.data.kursantNumber = number;

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
	const theme = escapeForJsLiteral(data.theme);
	const teacher = escapeForJsLiteral(data.teacher);
	const kursantNumber = data.kursantNumber;
	const type = data.type ?? 0;

	const requestArray = type === 0
		? `[["${theme}", "${teacher}", ${kursantNumber}]]`
		: `[[${type}, "${theme}", "${teacher}", ${kursantNumber}]]`;

	const content = `// Заполнение запроса пошагово:
// 1) Создать квадратные кавычки с запятой "[]," внутри основных
// 2) Заполнить в порядке: [(по умолчанию - доклад, 1 - если сообщение, 2 - если реферат),"Название темы", "Фамилия препода", номер курсанта по списку]
// 3) Повторить предыдущие пункты
// 
// Пример: export const request = [["Победа Красной Армии", "Маньков", 1], [1, "Русская Философия", "Жуков", 2]]


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


