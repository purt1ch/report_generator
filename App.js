import { StyleSheet, Text, SafeAreaView, TextInput, Image, Pressable, View, ScrollView} from 'react-native';
import SplashScreen from 'expo-app-loading';
import  { logi, doc }  from './doc';
import { useState } from "react";
import * as Font from "expo-font";

const fonts = () => Font.loadAsync({
    'Inter': require('./assets/fonts/Inter/static/Inter_18pt-Regular.ttf'),
    'Inter Bold': require('./assets/fonts/Inter/static/Inter_18pt-Bold.ttf'),
    'Comfortaa': require('./assets/fonts/Comfortaa/static/Comfortaa-Regular.ttf'),
    'Comfortaa Bold': require('./assets/fonts/Comfortaa/static/Comfortaa-Bold.ttf'),

});
const bg_color = '#2C3930';
const frame_color = '#3F4F44';
const accent_color = '#A27B5C';
const text_color = '#DCD7C9';
const std_font = 'Comfortaa';

export default function App() {
    const [font, setFont] = useState(false)
    const [theme, setTheme] = useState('');
    const [kursant, setKursant] = useState('');
    const [group, setGroup] = useState('');
    const [teacher, setTeacher] = useState('');
    const [pages, setPages] = useState('');


return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={[styles.scrollContainer]}>
                <Image style={styles.image} source={require('./assets/AcademyLogo.png')}/>
                <Text style={[styles.box, styles.textStyle]}>Генератор Сообщений</Text>
                <TextInput style={[styles.box, styles.textInput]} onChangeText={theme => setTheme(theme)}
                            placeholder='Введите тему сообщения' placeholderTextColor={text_color} multiline/>
                <TextInput style={[styles.box, styles.textInput]}
                            onChangeText={kursant => setKursant(kursant)}
                           placeholder='Введите вашу фамилию и инициалы' placeholderTextColor={text_color}
                           multiline/>
                <View>
                    <View style={styles.wrapper}>
                        <TextInput style={[styles.box, styles.miniInput]}
                                   onChangeText={group => setGroup(group)}
                                   placeholder='№ группы' placeholderTextColor={text_color}/>
                        <TextInput style={[styles.box, styles.miniInput, {width: '50%'}]}
                                   onChangeText={teacher => setTeacher(teacher)}
                                   placeholder='Фамилия препода' placeholderTextColor={text_color}/>
                    </View>
                    <View style={styles.wrapper}>
                        <TextInput style={[styles.box, styles.miniInput, {width: '40%'}]}
                            onChangeText={pages => setPages(pages)}
                               placeholder='Кол. страниц' placeholderTextColor={text_color}/>
                        <Text style={[styles.box, styles.textStyle, styles.docTypeSwitch]}>Тип документа</Text>
                    </View>
                </View>
            </ScrollView>
            <Pressable
                onPress={() => {logi(); doc('Доклад', theme, kursant, group, teacher, pages)}}
                style={({pressed}) => [
                    pressed ? {backgroundColor: frame_color} : {backgroundColor: bg_color},
                    styles.box, styles.button
                ]}>
                <Text style={[styles.textStyle, {fontSize: 24}]}>Создать</Text>
            </Pressable>
        </SafeAreaView>
    );
} 


const styles = StyleSheet.create({
    container: {
        height: "100%",
        backgroundColor: bg_color,
        alignItems: 'center',
    },
    scrollContainer: {
        alignItems: 'center',
        paddingBottom: 50,
    },
    wrapper: {
        minWidth: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    image: {
        marginTop: 50
    },
    button: {
        textAlign: 'center',
        minWidth: '30%',
        marginTop: 10,
        marginBottom: 30
    },
    box: {
        borderColor: frame_color,
        borderRadius: 20,
        borderWidth: 5,
        padding: 10, // Регулирует расстояние между элементами внутри объекта
        marginTop: 30 // Регулирует расстояние между другими объектами вокруг
    },
    textStyle: {
        fontSize: 20,
        textAlign: 'center',
        alignSelf: 'center',
        color: text_color,
        fontFamily: 'Comfortaa Bold'
    },
    textInput: {
        minHeight: "15%",
        fontSize: 18,
        width: '90%',
        color: text_color,
        textAlignVertical: 'top',
        fontFamily: std_font
    },
    miniInput: {
        color: text_color,
        width: '30%',
        fontSize: 16,
        fontFamily: std_font
    },
    docTypeSwitch: {
        fontSize: 16,
    }
});
