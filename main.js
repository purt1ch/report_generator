import * as fs from "node:fs";
import JSZip from "jszip";
import { request } from "./request.js";
import aireq from "./gpt.js";
import { XMLParser } from "fast-xml-parser";
import * as data from "./data.json" with { type: "json" };

// // Параметры титульного листа ---------------------------------------------
// Заполняются под конкретную учебную организацию. В репозитории хранятся
// обезличенные значения по умолчанию.
const settings = {
  institution: "«Наименование образовательной организации»",
  group: "0000",
  city: "Город",
  year: new Date().getFullYear(),
};

const teachers = data.default.teachers;
const kursants = data.default.kursants;
const docIDs = [
  "{institution}",
  "{city}",
  "{year}",
  "{type}",
  "{theme}",
  "{name}",
  "{group}",
  "{teacherName}",
  "{line1}",
  "{line2}",
  '<w:p><w:pPr><w:pStyle w:val="style0"/><w:jc w:val="both"/><w:spacing w:after="160" w:before="0" w:line="100" w:lineRule="atLeast"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:lang w:val="en-US"/></w:rPr><w:t>{text}</w:t></w:r></w:p>',
];

for (let i = 0; i < request.length; i++) {
  console.log(i);
  // // Определение типа документа из запроса (доклад или сообщение)
  let n = 0;
  let type = "Доклад";
  if (request[i].length == 4) {
    n = 1;
    if (request[i][0] == 1) type = "Сообщение";
    else type = "Реферат";
  }

  let IsBroken = false;
  let kursant = kursants[request[i][2 + n] - 1];
  let teacherName = teachers[request[i][1 + n]][0];
  let line1 = teachers[request[i][1 + n]][1];
  let line2 = teachers[request[i][1 + n]][2];
  const group = settings.group;
  const institution = settings.institution;
  const city = settings.city;
  const year = settings.year;
  let theme = request[i][0 + n];
  // Название темы используется как имя файла, поэтому убираем символы,
  // запрещённые в именах файлов Windows (":" открывает поток NTFS и файл
  // сохраняется пустым без ошибки), а также ограничиваем длину пути.
  const fileName = theme
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  let prompt = `Напиши сообщение на тему "${theme}". Текст должен состоять из содержания, введения, основной части, заключения и списка литературы. Должны быть разрывы страниц между введением, основной частью, заключением и списком литературы. Уложись в 4 страниц листа А4 минимум.`;
  let text = await aireq(prompt);

  text = text.replace(/\n/g, "");
  text = text.replace("```xml", "");
  text = text.replaceAll("`", "");
  text = text.replaceAll("*", "");

  const docParts = [
    institution,
    city,
    year,
    type,
    theme,
    kursant,
    group,
    teacherName,
    line1,
    line2,
    text,
  ];

  // // Формирование zip-архива ------------------------------------------------
  const content = fs
    .readFileSync("./assets/input.docx", { encoding: "binary" })
    .toString();
  const zip = await JSZip.loadAsync(content);
  let doc = await zip.file("word/document.xml").async("text");

  for (let j = 0; j < docIDs.length; j++) {
    doc = doc.replace(docIDs[j], docParts[j]);
  }

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
    const outputzip = await zip.generateAsync({ type: "base64" });
    fs.writeFileSync(`./outputdocs/${fileName}.docx`, outputzip, {
      encoding: "base64",
    });
    console.log(
      `\nВаш итоговый ${type} (${i + 1}): "${fileName}.docx" лежит по данному пути: \n ./outputdocs/${fileName}.docx\n`,
    );
  }
}
