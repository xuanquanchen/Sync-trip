import {Dimensions, StyleSheet} from 'react-native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ICON_WIDTH = SCREEN_WIDTH * 0.18;
const ICON_HEIGHT = ICON_WIDTH * (55 / 75);

const loginStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        resizeMode: 'cover',
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        margin: 20,
        borderRadius: 20,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#336749',
        textAlign: 'center',
    },
    highlight: {
        color: '#1976D2',
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 16,
        color: '#336749',
        marginVertical: 10,
    },
    textInput: {},
    forgotPassword: {
        textAlign: 'right',
        color: '#336749',
        marginBottom: 20,
    },
    signInButton: {
        backgroundColor: '#007A8C',
        width: '100%',
        alignSelf: 'center',
        marginVertical: 10,
    },
    signInText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    orText: {
        textAlign: 'center',
        color: '#33415C',
        marginVertical: 10,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10, // 竖直方向间距
        justifyContent: 'center',
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#ccc',
        marginHorizontal: 5,
    },
    socialIconsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWarpper: {
        width: ICON_WIDTH,
        height: ICON_HEIGHT,
        borderRadius: 10,
        backgroundColor: '#FFF',
        elevation: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    noAccount: {
        textAlign: 'center',
        color: '#33415C',
        marginVertical: 10,
    },
    signUpButton: {
        backgroundColor: 'rgba(246, 246, 246, 0.9)',
        width: '80%',
        alignSelf: 'center',
        marginVertical: 10,
        position: 'static',
    },
    signUpText: {
        color: '#007A8C',
        fontWeight: 'bold',
    },
});

export default loginStyles;
