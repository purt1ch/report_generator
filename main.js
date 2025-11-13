import * as fs from "node:fs";
import JSZip from "jszip";
import { request } from "./request.js";
import aireq from "./gpt.js";
import {XMLParser} from "fast-xml-parser";
const docIDs = ['{type}', '{theme}', '{name}', '{group}', '{teacherName}', '{line1}', '{line2}', '<w:p><w:pPr><w:pStyle w:val="style0"/><w:jc w:val="both"/><w:spacing w:after="160" w:before="0" w:line="100" w:lineRule="atLeast"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:lang w:val="en-US"/></w:rPr><w:t>{text}</w:t></w:r></w:p>'];

for (let i = 0; i < request.length; i++) {
	// // Определение типа документа из запроса (доклад или сообщение)
	if (request[i].length !== 6 && request[i].length !== 7) {
		console.log(" Ошибка: неверный формат элемента запроса. Ожидаю 6 или 7 значений.");
		continue;
	}

	let n = 0;
	let type = "Доклад";
	if (request[i].length === 7) {
		n = 1;
		const docType = Number(request[i][0]);
		if (docType === 1) type = "Сообщение";
		else if (docType === 2) type = "Реферат";
		else type = "Доклад";
	};

	let IsBroken = false;
	let theme = request[i][0+n];
	let teacherName = request[i][1+n];
	let line1 = request[i][2+n];
	let line2 = request[i][3+n];
	let group = request[i][4+n];
	let kursant = request[i][5+n];
	const required = [theme, teacherName, line1, line2, group, kursant];
	if (required.some((value) => typeof value !== "string" || value.trim().length === 0)) {
		console.log(" Ошибка: запрос заполнен не полностью. Пропускаю запись...");
		continue;
	}
	theme = theme.trim();
	teacherName = teacherName.trim();
	line1 = line1.trim();
	line2 = line2.trim();
	group = group.toString().trim();
	kursant = kursant.trim();
	let prompt = `Напиши сообщение на тему "${theme}". Текст должен состоять из содержания, введения, основной части, заключения и списка литературы. Должны быть разрывы страниц между введением, основной частью, заключением и списком литературы. Нужно сделать 5-6 страниц листа А4 минимум`;
	let text = await aireq(prompt);
	
	text = text.replace(/\n/g, '');
	text = text.replace('```xml', '');
	text = text.replaceAll('`', '');
	text = text.replaceAll('*', '');
	//let text = '<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>ПОБЕДА КРАСНОЙ АРМИИ</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Историческое значение Победы</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Победа Красной Армии в Великой Отечественной войне – это событие, имеющее непреходящее историческое значение. Она стала переломным моментом во Второй мировой войне, ознаменовав начало освобождения Европы от нацистской оккупации и крах человеконенавистнической идеологии фашизма.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Основные этапы и сражения</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Путь к Победе был долгим и трудным, отмеченным героическими сражениями и огромными жертвами. Ключевыми этапами стали:</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Битва за Москву (1941-1942):</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Первое крупное поражение немецких войск, развеявшее миф о непобедимости вермахта.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Сталинградская битва (1942-1943):</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Коренной перелом в ходе войны, положивший начало освобождению советской территории.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Курская битва (1943):</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Окончательное закрепление стратегической инициативы за Красной Армией.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Берлинская операция (1945):</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Завершающий этап войны, штурм Берлина и безоговорочная капитуляция Германии.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Подвиг советского народа</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Победа была достигнута ценой невероятных усилий и жертв советского народа. Героизм солдат на фронте, самоотверженный труд работников тыла, стойкость и мужество мирных жителей – все это слагаемые Великой Победы. Мы помним и чтим подвиг каждого, кто внес свой вклад в разгром фашизма.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:b/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr><w:t>Вечная слава героям!</w:t></w:r></w:p>';
	const docParts = [type, theme, kursant, group, teacherName, line1, line2, text];

	// // Формирование zip-архива ------------------------------------------------
	const content = fs.readFileSync("./assets/input.docx", {encoding: 'binary'}).toString();
	const zip = await JSZip.loadAsync(content);
	let doc = await zip.file("word/document.xml").async('text');

	for (let j = 0; j < docIDs.length; j++){
		doc = doc.replace(docIDs[j], docParts[j]);
	};

	try {
		let parser = new XMLParser();
    	parser.parse(doc, true);
	} catch (err) {
		IsBroken = true;
    	console.log(` Ошибка: ${err}`);
    	i--;
	}

	if (!IsBroken) {
		await zip.file("word/document.xml", doc);
		// console.log(await zip.file('word/document.xml').async('text'));

		// // Запись итогового файла--------------------------------------------------------------
		const outputzip = await zip.generateAsync({type: "base64"});
		try {
			fs.writeFileSync(`./outputdocs/${docParts[1]}.docx`, outputzip, {encoding: 'base64'});
		} catch (error) {
			console.log(" Ошибка записи файла...")
		}
		console.log(`\nВаш итоговый ${type} (${i+1}): "${docParts[1]}.docx" лежит по данному пути: \n /DocGenPC/outputdocs/${docParts[1]}.docx\n`);
	}
}