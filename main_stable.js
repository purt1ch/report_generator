import * as fs from "node:fs";
import JSZip from "jszip";
import { request } from "./request.js";
import aireq from "./gpt_stable.js";
import * as data from "./data.json" with { type: "json"};

const teachers = data.default.teachers;
const kursants3471 = data.default.kursants3471;
const docIDs = ['{type}', '{theme}', '{name}', '{group}', '{teacherName}', '{line1}', '{line2}', '<w:p><w:pPr><w:pStyle w:val="style0"/><w:jc w:val="both"/><w:spacing w:after="160" w:before="0" w:line="100" w:lineRule="atLeast"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:lang w:val="en-US"/></w:rPr><w:t>{text}</w:t></w:r></w:p>'];

for (let i = 0; i < request.length; i++) {
	// // Определение типа документа из запроса (доклад или сообщение)
	let n;
	let type;
	if (request[i].length == 4) {
		n = 1;
		if (request[i][0] == 1)
			type = "Сообщение";
		else type = "Реферат";
	} else {
		n = 0;
		type = "Доклад";
	};
	let kursant = kursants3471[request[i][2+n]-1];
	let teacherName = teachers[request[i][1+n]][0];
	let line1 = teachers[request[i][1+n]][1];
	let line2 = teachers[request[i][1+n]][2];
	const group = "3471";
	let theme = request[i][0+n];
	let prompt = `Напиши сообщение на тему "${theme}". Текст должен состоять из содержания, введения, основной части, заключения и списка литературы. Должны быть разрывы страниц между введением, основной частью, заключением и списком литературы. Уложись в 4 страницы листа А4 минимум.`;
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

	await zip.file("word/document.xml", doc);
	// console.log(await zip.file('word/document.xml').async('text'));

	// // Запись итогового файла--------------------------------------------------------------
	const outputzip = await zip.generateAsync({type: "base64"});
	fs.writeFileSync(`./outputdocs/${docParts[1]}.docx`, outputzip, {encoding: 'base64'});
	console.log(`\nВаш итоговый ${type} (${i+1}): "${docParts[1]}.docx" лежит по данному пути: \n /DocGenPC/outputdocs/${docParts[1]}.docx\n`);

}