// Задачи:
// * Разобраться в работе модулей JSZip, expo-asset, expo-file-system
// Точка перехода к обучению - замена текста из textInput в docx
import * as Sharing from 'expo-sharing';
import * as fs from 'expo-file-system';
import { Asset } from 'expo-asset';
import JSZip from 'jszip';
import * as data from './data.json' with { type: "json" };
import aireq from './gpt.js';

let iteration = 0
export function logi(text='Запрос №') {
    iteration += 1;
    return console.log(text + iteration)
}

export async function doc(type='Доклад', theme, kursant, group, teacher, pages= 2) {
    const docIDs = ['{type}', '{theme}', '{name}', '{group}', '{teacherName}', '{line1}', '{line2}', '<w:p><w:pPr><w:pStyle w:val="style0"/><w:jc w:val="both"/><w:spacing w:after="160" w:before="0" w:line="100" w:lineRule="atLeast"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:lang w:val="en-US"/></w:rPr><w:t>{text}</w:t></w:r></w:p>'];
    try {
        // Определяем исходные данные
        let prompt = `Напиши сообщение на тему "${theme}". Текст должен состоять из содержания, введения, основной части, заключения и списка литературы. Должны быть разрывы страниц между введением, основной частью, заключением и списком литературы. Уложись в ${pages} страниц листа А4 минимум.`;
        let teacherName = data.default.teachers[teacher][0];
        let line1 = data.default.teachers[teacher][1];
        let line2 = data.default.teachers[teacher][2];
        let text = await aireq(prompt);
        console.log(text);
        let docParts = [type, theme, kursant, group, teacherName, line1, line2, text];

        // Загружаем ассет
        const docasset = Asset.fromModule(require('./assets/docs/input.docx')); // определение директории документа в класс asset
        console.log("Ошибка при загрузке документа в кэш: ");
        await docasset.downloadAsync(); // загрузка в cash


        // Читаем файл как бинарную строку
        const content = await fs.readAsStringAsync(docasset.localUri, {encoding: fs.EncodingType.Base64});
        
        // Распаковываем как zip
        const zip = await JSZip.loadAsync(content, {base64: true});
        let doc = await zip.file('word/document.xml').async('text');
        
        // Замена текста
        for (let i = 0; i < docParts.length; i++) {
            doc = doc.replace(docIDs[i], docParts[i])
        }
        await zip.file('word/document.xml', doc);
        // Создание нового документа
        const outputZip = await zip.generateAsync({type: 'base64'});
        const outputPath = `${fs.documentDirectory+theme}.docx`;
        await fs.writeAsStringAsync(outputPath, outputZip, {encoding: fs.EncodingType.Base64});
        console.log('\n'+outputPath)
        await Sharing.shareAsync(outputPath, {dialogTitle: 'Share your File'})
    }
    catch (err) {
        console.error('Ошибка при обработке .docx файла:', err);

    }
}
