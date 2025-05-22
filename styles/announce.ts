import { StyleSheet } from 'react-native';

const annouceStyles = StyleSheet.create({
    emptyText: {
        textAlign: "center",
        marginTop: 10,
        color: 'gray',
        fontStyle: 'italic',
    },
    announcementAuthor: {
        fontSize: 14,
        color: 'gray',
        fontStyle: 'italic',
    },
    announcementHeader: {
        fontWeight: 'bold'
    },
    annoucementTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    announcementSection: {
        marginTop: 0,
        padding: 10,
        backgroundColor: "#fff",
        borderRadius: 8,
        elevation: 2,
        marginHorizontal: 0,
    },
    dateHeader: {
        fontSize: 18,
        fontWeight: "bold",
        marginVertical: 8,
        color: "#555",
    },
    announcementCard: {
        marginVertical: 0,
    },
    separator: {
        borderBottomColor: "gray",
        borderBottomWidth: 1,
        borderStyle: "dashed",
        marginVertical: 8,
    },
});

export default annouceStyles;

