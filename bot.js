import { config } from "dotenv";
import { Telegraf, Scenes, session } from "telegraf";
import { createReadStream, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isNumberObject } from "node:util/types";

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

const bot = new Telegraf(token, {
	telegram: {
		apiRoot: "https://api.telegram.org",
		webhookReply: false
	}
});

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
			await ctx.reply("❌ Пожалуйста, отправьте число 0, 1 или 2.\n\nПопробуйте снова:");
			return;
		}

		const type = text === "" ? 0 : Number(text);

		if (!Number.isInteger(type) || type < 0 || type > 2) {
			await ctx.reply("❌ Неверный формат. Укажите 0, 1 или 2.\n\nПопробуйте снова:");
			return;
		}

		ctx.wizard.state.data.type = type;
		await ctx.reply("📌 Введите название темы (без символов \\ / : * ? \" < > |).");
		return ctx.wizard.next();
	},

	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Название темы не может быть пустым.\n\nПопробуйте снова:");
			return;
		}

		if (/[\\/:*?"<>|]/.test(text)) {
			await ctx.reply("❌ Тема содержит запрещённые символы \\ / : * ? \" < > |.\n\nПопробуйте снова:");
			return;
		}

		ctx.wizard.state.data.theme = text;
		await ctx.reply("🔢 Введите номер группы (например: 3471):");
		return ctx.wizard.next();
	},

	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (isNaN(text)) {
			await ctx.reply("❌ Номер группы не может быть пустым.\n\nПопробуйте снова:");
			return;
		}

		const group = Number(text);

		ctx.wizard.state.data.group = group;

		await ctx.reply(
			"👨‍🏫 Введите фамилию преподавателя или полное ФИО.\n" +
			"Доступные фамилии из списка: " + teacherNames.join(", ") + "\n" +
			"Если введенной фамилии нет в списке, потребуется дополнительная информация."
		);
		return ctx.wizard.next();
	},

	async (ctx) => {
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ Поле не может быть пустым.\n\nПопробуйте снова:");
			return;
		}

		// Проверяем, есть ли введенная фамилия в списке (точное совпадение или внутри текста)
		let foundTeacherName = null;
		
		// Сначала проверяем точное совпадение
		if (teacherNames.includes(text)) {
			foundTeacherName = text;
		} 

		if (foundTeacherName) {
			// Фамилия найдена в списке - используем режим выбора из списка
			ctx.wizard.state.data.teacher = foundTeacherName;
			ctx.wizard.state.data.teacherInputMode = 1;
			await ctx.reply("👤 Введите ФИО курсанта (например: Петров А.А.):");
		} else {
			// Фамилия не найдена - используем режим полного ввода
			ctx.wizard.state.data.teacherName = text;
			ctx.wizard.state.data.teacherInputMode = 2;
			await ctx.reply("📝 Введите первую строку должности/регалий преподавателя:");
		}

		return ctx.wizard.next();
	},
	
	async (ctx) => {
		// Ввод ФИО курсанта (для режима выбора из списка) или первой строки должности (для режима полного ввода)
		const inputMode = ctx.wizard.state.data.teacherInputMode;
		const text = ctx.message?.text?.trim();

		if (inputMode === 1) {
			// Режим выбора из списка - это должен быть ФИО курсанта
			if (!text) {
				await ctx.reply("❌ ФИО курсанта не может быть пустым.\n\nПопробуйте снова:");
				return;
			}

			ctx.wizard.state.data.kursantName = text;

			await ctx.reply("⏳ Генерирую документ, пожалуйста подождите...");

			try {
				await writeRequestToFile(ctx.wizard.state.data);
				await runMainScriptWithTimeout(300000); // 5 минут timeout

				const theme = ctx.wizard.state.data.theme;
				const outputPath = path.join(__dirname, "outputdocs", `${theme}.docx`);

				if (!existsSync(outputPath)) {
					await ctx.reply("❌ Файл не найден. Проверьте логи выполнения.");
				} else {
					await sendDocumentWithRetry(ctx, outputPath, `${theme}.docx`);
					await ctx.reply("✅ Документ создан и отправлен!");
				}
			} catch (error) {
				console.error("Ошибка при генерации документа:", error);
				let message = "неизвестная ошибка";
				if (error instanceof Error) {
					if (error.name === "TimeoutError" || error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
						message = "Превышено время ожидания. Попробуйте позже или обратитесь к администратору.";
					} else {
						message = error.message;
					}
				}
				await ctx.reply(`❌ Произошла ошибка: ${message}`);
			}
        
			return ctx.scene.leave();
		} else {
			// Режим полного ввода - это должна быть первая строка должности
			if (!text) {
				await ctx.reply("❌ Первая строка должности не может быть пустой.\n\nПопробуйте снова:");
				return;
			}
			ctx.wizard.state.data.teacherLine1 = text;
			await ctx.reply("📝 Введите вторую строку должности/регалий преподавателя:");
			return ctx.wizard.next();
		}
	},
	
	async (ctx) => {
		const text = ctx.message?.text?.trim();
		if (!text) {
			await ctx.reply("❌ Вторая строка должности не может быть пустой.\n\nПопробуйте снова:");
			return;
		}
		ctx.wizard.state.data.teacherLine2 = text;
		await ctx.reply("👤 Введите ФИО курсанта (например: Петров А.А.):");
		return ctx.wizard.next();
	},

	async (ctx) => {
		// Ввод ФИО курсанта (для режима полного ввода)
		const text = ctx.message?.text?.trim();

		if (!text) {
			await ctx.reply("❌ ФИО курсанта не может быть пустым.\n\nПопробуйте снова:");
			return;
		}

		ctx.wizard.state.data.kursantName = text;

		await ctx.reply("⏳ Генерирую документ, пожалуйста подождите...");

		try {
			await writeRequestToFile(ctx.wizard.state.data);
			await runMainScriptWithTimeout(300000); // 5 минут timeout

			const theme = ctx.wizard.state.data.theme;
			const outputPath = path.join(__dirname, "outputdocs", `${theme}.docx`);

			if (!existsSync(outputPath)) {
				await ctx.reply("❌ Файл не найден. Проверьте логи выполнения.");
			} else {
				await sendDocumentWithRetry(ctx, outputPath, `${theme}.docx`);
				await ctx.reply("✅ Документ создан и отправлен!");
			}
		} catch (error) {
			console.error("Ошибка при генерации документа:", error);
			let message = "неизвестная ошибка";
			if (error instanceof Error) {
				if (error.name === "TimeoutError" || error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
					message = "Превышено время ожидания. Попробуйте позже или обратитесь к администратору.";
				} else {
					message = error.message;
				}
			}
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
	
	// Обработка timeout ошибок
	if (err.message?.includes("timeout") || 
	    err.message?.includes("ETIMEDOUT") ||
	    err.code === "ETIMEDOUT") {
		console.error("Timeout error detected:", err);
		if (ctx && ctx.reply) {
			ctx.reply("❌ Произошла ошибка: превышено время ожидания. Попробуйте позже.").catch(console.error);
		}
	}
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
	const kursantName = escapeForJsLiteral(data.kursantName);
	const group = data.group ?? 3471; // Группа из ввода пользователя или по умолчанию
	const type = data.type ?? 0;
	
	let requestArray;
	
	if (data.teacherInputMode === 1) {
		// Режим выбора из списка - только фамилия
		const teacher = escapeForJsLiteral(data.teacher);
		requestArray = type === 0
			? `[["${theme}", "${kursantName}", ${group}, "${teacher}"]]`
			: `[[${type}, "${theme}", "${kursantName}", ${group}, "${teacher}"]]`;
	} else {
		// Режим полного ввода - полная информация
		const teacherName = escapeForJsLiteral(data.teacherName);
		const line1 = escapeForJsLiteral(data.teacherLine1);
		const line2 = escapeForJsLiteral(data.teacherLine2);
		requestArray = type === 0
			? `[["${theme}", "${kursantName}", ${group}, "${teacherName}", "${line1}", "${line2}"]]`
			: `[[${type}, "${theme}", "${kursantName}", ${group}, "${teacherName}", "${line1}", "${line2}"]]`;
	}

	const content = `export const request = ${requestArray}`;

	writeFileSync(requestPath, content, "utf-8");
}

async function runMainScriptWithTimeout(timeoutMs) {
	const mainModule = await import("./main.js");
	const mainGen = mainModule.default;
	
	const scriptPromise = mainGen();
	
	const timeoutPromise = new Promise((_, reject) => {
		setTimeout(() => {
			reject(new Error(`Timeout: выполнение mainGen превысило ${timeoutMs / 1000} секунд`));
		}, timeoutMs);
	});
	
	return Promise.race([scriptPromise, timeoutPromise]);
}

async function sendDocumentWithRetry(ctx, filePath, filename, maxRetries = 3) {
	const timeoutMs = 120000; // 2 минуты timeout для отправки документа
	let lastError = null;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Обертываем отправку документа в Promise.race с таймаутом
			await Promise.race([
				ctx.replyWithDocument({
					source: createReadStream(filePath),
					filename: filename
				}),
				new Promise((_, reject) => {
					setTimeout(() => {
						reject(new Error("ETIMEDOUT: Превышено время ожидания отправки документа"));
					}, timeoutMs);
				})
			]);
			return; // Успешно отправлено
		} catch (error) {
			lastError = error;
			const isTimeout = error.message?.includes("timeout") || 
			                 error.message?.includes("ETIMEDOUT") ||
			                 error.code === "ETIMEDOUT" ||
			                 error.message?.includes("Превышено время ожидания");
			
			if (isTimeout && attempt < maxRetries) {
				console.log(`Попытка ${attempt} отправки документа не удалась (timeout), повторяю...`);
				await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Экспоненциальная задержка
			} else {
				throw error; // Если не timeout или последняя попытка, пробрасываем ошибку
			}
		}
	}
	
	throw lastError;
}

